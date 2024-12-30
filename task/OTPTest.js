const fs = require('fs')
const fse = require('fs-extra')
const exec = require('child_process').exec
const through = require('through2')
const { dataDir, constants } = require('../config')
const { postSlackMessage } = require('../util')
const testTag = process.env.OTP_TAG || 'v2'
const JAVA_OPTS = process.env.JAVA_OPTS || '-Xmx9g'

/**
 * Builds an OTP graph with a source data file. If the build is succesful we can trust
 * the file is good enough to be used.
 */
function testWithOTP (otpFile, quiet = false) {
  const lastLog = []

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(otpFile)) {
      reject(new Error(`${otpFile} does not exist!\n`))
    } else {
      if (!fs.existsSync(`${dataDir}/tmp`)) {
        fs.mkdirSync(`${dataDir}/tmp`)
      }
      fs.mkdtemp(`${dataDir}/tmp/router-build-test`, (err, folder) => {
        if (err) throw err
        process.stdout.write('Testing ' + otpFile + ' in directory ' + folder + '...\n')
        const dir = folder.split('/').pop()
        const r = fs.createReadStream(otpFile)
        r.on('end', () => {
          try {
            const build = exec(`docker run --rm -e JAVA_OPTS="${JAVA_OPTS}" -v ${dataDir}/tmp/${dir}:/var/opentripplanner hsldevcom/opentripplanner:${testTag} --build --save`,
              { maxBuffer: constants.BUFFER_SIZE })
            build.on('exit', function (c) {
              if (c === 0) {
                resolve(true)
                process.stdout.write(otpFile + ' Test SUCCESS\n')
              } else {
                const log = lastLog.join('')
                postSlackMessage(`${otpFile} test failed: ${log} :boom:`)
                global.hasFailures = true
                resolve(false)
              }
              fse.removeSync(folder)
            })
            build.stdout.on('data', function (data) {
              lastLog.push(data.toString())
              if (lastLog.length === 20) {
                delete lastLog[0]
              }
              if (!quiet) {
                process.stdout.write(data.toString())
              }
            })
            build.stderr.on('data', function (data) {
              lastLog.push(data.toString())
              if (lastLog.length > 20) {
                lastLog.splice(0, 1)
              }
              if (!quiet) {
                process.stderr.write(data.toString())
              }
            })
          } catch (e) {
            const log = lastLog.join('')
            postSlackMessage(`${otpFile} test failed: ${log} :boom:`)
            fse.removeSync(folder)
            reject(e)
          }
        })
        r.pipe(fs.createWriteStream(`${folder}/${otpFile.split('/').pop()}`))
      })
    }
  })
}

module.exports = {
  testOTPFile: () => {
    return through.obj(function (file, encoding, callback) {
      const otpFile = file.history[file.history.length - 1]
      if (process.env.SKIP_OTP_TESTS) {
        process.stdout.write('OTP test skipped because the SKIP_OTP_TESTS environment variable is set\n')
        return callback(null, file)
      }
      testWithOTP(otpFile, true).then((success) => {
        if (success) {
          callback(null, file)
        } else {
          callback(null, null)
        }
      }).catch(() => {
        callback(null, null)
      })
    })
  }
}
