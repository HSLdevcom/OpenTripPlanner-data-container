/*
 * Wrapper for OBA filtering
 */
const del = require('del')
const exec = require('child_process').exec
const through = require('through2')
const fs = require('fs-extra')
const path = require('path')
const async = require('async')
const cloneable = require('cloneable-readable')
const { zipDir } = require('../util')
const { dataToolImage } = require('../config.js')
const { hostDataDir, dataDir } = require('../config.js')
const debug = require('debug')('OBAFilter')
const { postSlackMessage } = require('../util')

/**
 * returns promise that resolves to true (success) or false (failure)
 */
function OBAFilter (src, dst, rule) {
  process.stdout.write(`filtering ${src} with ${rule}...\n`)
  const p = new Promise((resolve) => {
    let success = true
    let lastLog = []
    const cmd = `docker pull ${dataToolImage}; docker run -v ${hostDataDir}:/data --rm ${dataToolImage} java -Xmx6g -jar one-busaway-gtfs-transformer/onebusaway-gtfs-transformer-cli.jar --transform=/data/${rule} /data/${src} /data/${dst}`
    const filterProcess = exec(cmd)

    const checkError = (data) => {
      debug(data)
      lastLog.push(data.toString())
      if (lastLog.length > 20) {
        delete lastLog[0]
      }
      if (data.toString().indexOf('Exception') !== -1) {
        success = false
      }
    }

    filterProcess.stdout.on('data', data => checkError(data))

    filterProcess.stderr.on('data', data => checkError(data))

    filterProcess.on('exit', function (code) {
      if (code === 0 && success === true) {
        resolve(true)
      } else {
        const log = lastLog.join('')
        postSlackMessage(`Running command ${cmd} on ${src} failed: ${log} :boom:`)
        process.stdout.write(`Running command ${cmd} failed: ${log}.\n`)
        process.stdout.write(`${src} ${log}\n`)
        resolve(false)
      }
    })
  })
  return p
}

module.exports = {
  OBAFilterTask: (configs) => {
    return through.obj(function (file, encoding, callback) {
      const gtfsFile = file.history[file.history.length - 1]
      const fileName = gtfsFile.split('/').pop()
      const relativeFilename = path.relative(dataDir, gtfsFile)
      if (fs.lstatSync(gtfsFile).isDirectory()) {
        process.stdout.write(`${gtfsFile} not a file, deleting...\n`)
        fs.removeSync(gtfsFile)
        callback(null, null)
        return
      }
      const id = fileName.substring(0, fileName.indexOf('.'))
      const config = configs[id]
      if (config === undefined) {
        process.stdout.write(`${gtfsFile} Could not find config for Id:${id}, ignoring filter...\n`)
        callback(null, null)
        return
      }

      if (config.rules !== undefined) {
        const src = `${relativeFilename}`
        const dst = `${relativeFilename}-filtered`

        const dstDir = `${dataDir}/${dst}`
        let hasFailures = false
        const functions = config.rules.map((rule) => (done) => {
          OBAFilter(src, dst, rule).then((success) => {
            if (success) {
              fs.unlinkSync(`${dataDir}/${src}`)

              /* create zip named src from files in dst */
              zipDir(`${dataDir}/${src}`, `${dataDir}/${dst}`, () => {
                del([`${dataDir}/${dst}`])
                process.stdout.write(rule + ' ' + gtfsFile + ' filter SUCCESS\n')
                done()
              })
            } else {
              if (fs.lstatSync(dstDir).isDirectory()) {
                process.stdout.write(`deleting ${dstDir}\n`)
                fs.removeSync(dstDir)
              }
              hasFailures = true
              process.stdout.write(rule + ' ' + gtfsFile + ' filter FAILED\n')
              done()
            }
          })
        })
        async.waterfall(functions, () => {
          if (hasFailures) {
            callback(null, null)
          } else {
            file.contents = cloneable(fs.createReadStream(gtfsFile))
            callback(null, file)
          }
        })
      } else {
        process.stdout.write(gtfsFile + ' filter skipped\n')
        callback(null, file)
      }
    })
  }
}
