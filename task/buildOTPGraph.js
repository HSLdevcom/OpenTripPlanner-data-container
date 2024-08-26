const fs = require('fs')
const del = require('del')
const { exec, execSync } = require('child_process')
const { zipWithGlob, postSlackMessage, otpMatching } = require('../util')
const { dataDir, hostDataDir, constants } = require('../config.js')
const graphBuildTag = process.env.OTP_TAG || 'latest'
 const dockerImage = `hsldevcom/opentripplanner:${graphBuildTag}`

/*
 * node.js wrapper for building OTP graph
 */

const buildGraph = function (config) {
  let lastLog = []
  const collectLog = (data) => {
    lastLog.push(data.toString())
    if (lastLog.length > 20) {
      lastLog.splice(0, 1)
    }
  }
  const p = new Promise((resolve, reject) => {
    const version = execSync(`docker pull ${dockerImage};docker run --rm ${dockerImage} --version`)
    const commit = version.toString().match(/commit: ([0-9a-f]+)/)[1]

    const command = `docker run -e JAVA_OPTS="-Xmx12g" -v ${hostDataDir}/build/${config.id}:/var/opentripplanner ${dockerImage} --build /var/opentripplanner`
    const buildGraph = exec(command, { maxBuffer: constants.BUFFER_SIZE })
    // const buildGraph = exec('ls -la');
    const buildLog = fs.openSync(`${dataDir}/build/${config.id}/build.log`, 'w+')

    buildGraph.stdout.on('data', function (data) {
      collectLog(data)
      process.stdout.write(data.toString())
      fs.writeSync(buildLog, data)
    })

    buildGraph.stderr.on('data', function (data) {
      collectLog(data)
      process.stdout.write(data.toString())
      fs.writeSync(buildLog, data)
    })

    buildGraph.on('exit', (status) => {
      if (status === 0) {
        resolve({ commit: commit, config: config })
      } else {
        const log = lastLog.join('')
        postSlackMessage(`${config.id} build failed: ${status}:${log} :boom:`)
        reject('could not build') // eslint-disable-line
      }

      fs.closeSync(buildLog)
    })
  })
  return p
}

module.exports = {

  buildOTPGraphTask: (configs) => {
    return Promise.all(configs.map(config => {
      return buildGraph(config).then(({ commit, config }) => {
        const p1 = new Promise((resolve, reject) => {
          process.stdout.write('Creating zip file for router data\n')
          // create zip file for the source data
          // include all gtfs + osm + router- + build configs
          zipWithGlob(`${dataDir}/build/${config.id}/router-${config.id}.zip`,
            [`${dataDir}/build/${config.id}/*.zip`, `${dataDir}/build/${config.id}/*.json`,
              `${dataDir}/build/${config.id}/${config.osm}.pbf`,
              `${dataDir}/build/${config.id}/${config.dem}.tif`],
            `router-${config.id}`,
            (err) => {
              if (err) {
                reject(err)
              } else {
                resolve()
              }
            })
        })
        const p2 = new Promise((resolve, reject) => {
          process.stdout.write('Creating zip file for otp graph\n')
          // create zip file for the graph:
          // include  graph.obj + router-config.json
          zipWithGlob(`${dataDir}/build/${config.id}/graph-${config.id}-${commit}.zip`,
            [`${dataDir}/build/${config.id}/Graph.obj`, `${dataDir}/build/${config.id}/router-*.json`],
            config.id,
            (err) => {
              if (err) {
                reject(err)
              } else {
                resolve()
              }
            })
        })

        const p3 = new Promise((resolve, reject) => {
          fs.writeFile(`${dataDir}/build/${config.id}/version.txt`, new Date().toISOString(), function (err) {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
        return Promise.all([p1, p2, p3]).then(() => otpMatching(`${dataDir}/build/${config.id}`)).then(() => del(`${dataDir}/build/${config.id}/taggedStops.log`))
      })
    })).then(() => {
      process.stdout.write('Created SUCCESS\n')
    })
  } }
