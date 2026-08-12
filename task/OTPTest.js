const fs = require('fs');
const fse = require('fs-extra');
const exec = require('child_process').exec;
const through = require('through2');
const { dataDir, constants, timezone } = require('../config');
const { postSlackMessage, createDir } = require('../util');
const logger = require('../logger');
const testTag = process.env.OTP_TAG || 'v2';
const JAVA_OPTS = process.env.JAVA_OPTS || '-Xmx9g';

/**
 * Builds an OTP graph with a source data file. If the build is successful we can trust
 * the file is good enough to be used.
 */
function testWithOTP(otpFile, quiet = false) {
  const lastLog = [];

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(otpFile)) {
      reject(new Error(`${otpFile} does not exist!\n`));
    } else {
      createDir(`${dataDir}/tmp`);
      fs.mkdtemp(`${dataDir}/tmp/router-build-test`, (err, folder) => {
        if (err) throw err;
        logger.info('Testing ' + otpFile + ' in directory ' + folder + '...');
        const dir = folder.split('/').pop();
        const r = fs.createReadStream(otpFile);
        r.on('end', () => {
          try {
            const build = exec(
              `docker run --rm -e JAVA_OPTS="${JAVA_OPTS}" -e TZ=${timezone} -v ${dataDir}/tmp/${dir}:/var/opentripplanner hsldevcom/opentripplanner:${testTag} --build --save`,
              { maxBuffer: constants.BUFFER_SIZE },
            );
            build.on('exit', function (c) {
              if (c === 0) {
                resolve(true);
                logger.info(otpFile + ' Test SUCCESS');
              } else {
                const log = lastLog.join('');
                postSlackMessage(
                  `${otpFile} test failed: ${log} :boom:`,
                  'warn',
                );
                global.hasFailures = true;
                resolve(false);
              }
              fse.removeSync(folder);
            });
            build.stdout.on('data', function (data) {
              lastLog.push(data.toString());
              if (lastLog.length === 20) {
                delete lastLog[0];
              }
              if (!quiet) {
                process.stdout.write(data);
              }
            });
            build.stderr.on('data', function (data) {
              lastLog.push(data.toString());
              if (lastLog.length > 20) {
                lastLog.splice(0, 1);
              }
              if (!quiet) {
                process.stderr.write(data);
              }
            });
          } catch (e) {
            const log = lastLog.join('');
            postSlackMessage(`${otpFile} test failed: ${log} :boom:`, 'error');
            fse.removeSync(folder);
            reject(e);
          }
        });
        r.pipe(fs.createWriteStream(`${folder}/${otpFile.split('/').pop()}`));
      });
    }
  });
}

module.exports = {
  testOTPFile: () => {
    return through.obj(function (file, encoding, callback) {
      const otpFile = file.history[file.history.length - 1];
      if (process.env.SKIP_OTP_TESTS) {
        logger.info(
          'OTP test skipped because the SKIP_OTP_TESTS environment variable is set',
        );
        return callback(null, file);
      }
      testWithOTP(otpFile, true)
        .then(success => {
          if (success) {
            callback(null, file);
          } else {
            callback(null, null);
          }
        })
        .catch(() => {
          callback(null, null);
        });
    });
  },
};
