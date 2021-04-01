const otpMatching = require('otp-matching')
const { zipWithGlob } = require('../util')
const fs = require('fs')
const { dataDir, hostDataDir, constants } = require('../config.js')
const { postSlackMessage } = require('../util')
const graphBuildTag = process.env.OTP_TAG || 'latest'
/*
 * node.js wrapper for building OTP graph
 */
const { exec, execSync } = require('child_process')

const buildGraph = function (config) {
  let lastLog = []
  const collectLog = (data) => {
    lastLog.push(data.toString())
    if (lastLog.length > 20) {
      lastLog.splice(0, 1)
    }
  }
  const p = new Promise((resolve, reject) => {
    const version = execSync(`docker pull hsldevcom/opentripplanner:${graphBuildTag};docker run --rm --entrypoint /bin/bash hsldevcom/opentripplanner:${graphBuildTag}  -c "java -jar otp-shaded.jar --version"`)
    const commit = version.toString().match(/commit: ([0-9a-f]+)/)[1]

    const buildGraph = exec(`docker run -v ${hostDataDir}/build:/opt/opentripplanner/graphs --rm --entrypoint /bin/bash hsldevcom/opentripplanner:${graphBuildTag}  -c "java -Xmx10g -jar otp-shaded.jar --build graphs/${config.id}/router"`, { maxBuffer: constants.BUFFER_SIZE })
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
            [`${dataDir}/build/${config.id}/router/*.zip`, `${dataDir}/build/${config.id}/router/*.json`,
              `${dataDir}/build/${config.id}/router/${config.osm}.pbf`,
              `${dataDir}/build/${config.id}/router/${config.dem}.tif`],
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
            [`${dataDir}/build/${config.id}/router/Graph.obj`, `${dataDir}/build/${config.id}/router/router-*.json`],
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
        return Promise.all([p1, p2, p3]).then(() => otpMatching(`${dataDir}/build/${config.id}/router`, config.id))
      })
    })).then(() => {
      process.stdout.write('Created SUCCESS\n')
    })
  } }
