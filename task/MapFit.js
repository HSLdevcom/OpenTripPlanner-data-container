const through = require('through2')
const fs = require('fs')
const path = require('path')
const cloneable = require('cloneable-readable')
const { dataDir, hostDataDir, dataToolImage, constants } = require('../config.js')
const debug = require('debug')('MAPFit')
const { postSlackMessage } = require('../util')
/*
 * node.js wrapper for MapFit
 */
const exec = require('child_process').exec

const run = function (cmd, osmExtract, src, dst) {
  process.stdout.write('fitting ' + src + '...\n')
  const lastLog = []
  let success = true
  const p = new Promise((resolve) => {
    const dcmd = `docker pull ${dataToolImage}; docker run --rm -e TCMALLOC_LARGE_ALLOC_REPORT_THRESHOLD=2147483648 -v ${hostDataDir}:/data --rm ${dataToolImage} ${cmd} ${osmExtract} +init=epsg:3067 /${src} /${dst}`
    const fit = exec(dcmd, { maxBuffer: constants.BUFFER_SIZE })

    const checkError = (data) => {
      debug(data)
      lastLog.push(data.toString())
      if (lastLog.length > 20) {
        lastLog.splice(0, 1)
      }
      const txt = data.toString()
      if (txt.indexOf('Traceback') !== -1 || txt.indexOf('IOError') !== -1) {
        success = false
      }
    }

    fit.stdout.on('data', data => checkError(data))

    fit.stderr.on('data', data => checkError(data))

    fit.on('exit', function (code) {
      if (code === 0 && success === true) {
        resolve(true)
      } else {
        const log = lastLog.join('')
        postSlackMessage(`Running command ${cmd} on ${src} failed: ${log} :boom:`)
        process.stdout.write(`Running command ${cmd} failed:\n`)
        process.stdout.write(`${src} ${log}\n`)
        resolve(false)
      }
    })
  })
  return p
}

module.exports = {
  /**
   * returns promise
   */
  fitGTFS: function (osmExtract, src, dst) {
    return run('gtfs_shape_mapfit/fit_gtfs.bash', osmExtract, src, dst)
  },

  fitGTFSTask: (configs) => {
    return through.obj(function (file, encoding, callback) {
      const gtfsFile = file.history[file.history.length - 1]
      const fileName = gtfsFile.split('/').pop()
      const relativeFilename = path.relative(process.cwd(), gtfsFile)
      const id = fileName.substring(0, fileName.indexOf('.'))
      const config = configs[id]
      if (config === undefined) {
        process.stdout.write(`${gtfsFile} Could not find config for Id:${id}, ignoring fit...\n`)
        callback(null, null)
        return
      }
      const osmFile = `${dataDir}/ready/osm/finland.pbf`

      if (config.fit === false) {
        process.stdout.write(gtfsFile + ' fit skipped\n')
        callback(null, file)
        return
      }

      if (!fs.existsSync(osmFile)) {
        process.stdout.write(`${osmFile} not available, skipping ${gtfsFile}\n`)
        callback(null, null)
        return
      }

      let script = ''
      if (config.fit === true) {
        script = 'gtfs_shape_mapfit/fit_gtfs.bash'
      } else {
        script = config.fit
      }
      const src = `${relativeFilename}`
      const dst = `${relativeFilename}-fitted`

      run(script, '/data/ready/osm/finland.pbf', src, dst).then((status) => {
        if (status === true) {
          fs.unlinkSync(src)
          fs.renameSync(dst, src)
          process.stdout.write(gtfsFile + ' fit SUCCESS\n')
          file.contents = cloneable(fs.createReadStream(gtfsFile))
          callback(null, file)
        } else {
          process.stdout.write(gtfsFile + ' fit FAILED\n')
          callback(null, null)
        }
      })
    })
  }
}
