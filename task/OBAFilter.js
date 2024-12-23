const del = require('del')
const execSync = require('child_process').execSync
const through = require('through2')
const fs = require('fs-extra')
const path = require('path')
const cloneable = require('cloneable-readable')
const { zipDir } = require('../util')
const { dataToolImage } = require('../config.js')
const { dataDir } = require('../config.js')
const { postSlackMessage, parseId } = require('../util')

function OBAFilter (src, dst, rule) {
  process.stdout.write(`filtering ${src} with ${rule}...\n`)

  const cmd = `docker pull ${dataToolImage}; docker run -v ${dataDir}:/data --rm ${dataToolImage} java -Xmx6g -jar onebusaway-gtfs-transformer-cli.jar --transform=/data/${rule} /data/${src} /data/${dst}`

  try {
    execSync(cmd, { stdio: [0, 1, 2] })
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  OBAFilterTask: gtfsMap => {
    return through.obj(function (file, encoding, callback) {
      const gtfsFile = file.history[file.history.length - 1]
      const relativeFilename = path.relative(dataDir, gtfsFile)
      const id = parseId(gtfsFile)
      const source = gtfsMap[id]
      const rules = source.rules
      if (rules) {
        const src = `${relativeFilename}`
        const dst = `${relativeFilename}-filtered`
        const dstDir = `${dataDir}/${dst}`

        // execute all rules
        // result zip of a rule is input data for next rule
        // async zip creation is synchronized using recursion:
        // next recursion call is launched from zip callback
        let i = 0
        function processRule () {
          if (i < rules.length) {
            const rule = rules[i++]
            if (OBAFilter(src, dst, rule)) {
              fs.unlinkSync(`${dataDir}/${src}`)
              /* create zip named src from files in dst */
              zipDir(`${dataDir}/${src}`, `${dataDir}/${dst}`, () => {
                del(dstDir)
                process.stdout.write(`Filter ${gtfsFile} with rule ${rule} SUCCESS\n`)
                processRule() // handle next rule
              })
            } else { // failure
              del(dstDir)
              postSlackMessage(`Rule ${rule} on ${gtfsFile} failed :boom:`)
              callback(null, null)
            }
          } else { // all rules done successfully
            file.contents = cloneable(fs.createReadStream(gtfsFile))
            callback(null, file)
          }
        }
        processRule() // start recursive rule processing
      } else {
        process.stdout.write(gtfsFile + ' filter skipped\n')
        callback(null, file)
      }
    })
  }
}
