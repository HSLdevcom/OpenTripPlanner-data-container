const fs = require('fs')
const fse = require('fs-extra')
const exec = require('child_process').exec
const through = require('through2')
const { hostDataDir, dataDir, constants } = require('../config')
const { postSlackMessage } = require('../util')
const testTag = process.env.OTP_TAG || 'latest'

/**
 * Builds an OTP graph with a source data file. If the build is succesful we can trust
 * the file is good enough to be used.
 */
function testWithOTP (otpFile, quiet = false) {
  let lastLog = []

  const p = new Promise((resolve, reject) => {
    if (!fs.existsSync(otpFile)) {
      process.stdout.write(otpFile + ' does not exist!\n')
      p.reject()
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
            const build = exec(`docker run --rm -e JAVA_OPTS="-Xmx12G" -v ${hostDataDir}/tmp/${dir}:/var/opentripplanner hsldevcom/opentripplanner:${testTag} --build /var/opentripplanner`,
              { maxBuffer: constants.BUFFER_SIZE })
            build.on('exit', function (c) {
              if (c === 0) {
                resolve(true)
                global.OTPacceptsFile = true
                process.stdout.write(otpFile + ' Test SUCCESS\n')
              } else {
                const log = lastLog.join('')
                process.stdout.write(otpFile + ` Test FAILED (${c})\n`)
                process.stdout.write(otpFile + ': ' + lastLog.join('') + '\n')
                postSlackMessage(`${otpFile} test failed: ${log} :boom:`)
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
            process.stdout.write(otpFile + ` Test FAILED (${e})\n`)
            process.stdout.write(otpFile + ': ' + log + '\n')
            postSlackMessage(`${otpFile} test failed: ${log} :boom:`)
            fse.removeSync(folder)
            reject(e)
          }
        })
        r.pipe(fs.createWriteStream(`${folder}/${otpFile.split('/').pop()}`))
      })
    }
  })
  return p
}

module.exports = {
  testOTPFile: () => {
    return through.obj(function (file, encoding, callback) {
      const otpFile = file.history[file.history.length - 1]
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
