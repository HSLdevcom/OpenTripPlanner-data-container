const del = require('del');
const execSync = require('child_process').execSync;
const through = require('through2');
const fs = require('fs-extra');
const path = require('path');
const cloneable = require('cloneable-readable');
const { zipDirContents } = require('./ZipTask');
const { dataToolImage } = require('../config.js');
const { dataDir, timezone } = require('../config.js');
const { postSlackMessage, parseId } = require('../util');
const logger = require('../logger');

function OBAFilter(src, dst, rule) {
  logger.info(`Filtering ${src} with ${rule}...`);

  const cmd = `docker run -e TZ=${timezone} -v ${dataDir}:/data --rm ${dataToolImage} --transform=/data/${rule} /data/${src} /data/${dst}`;

  try {
    execSync(cmd, { stdio: [0, 1, 2] });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  OBAFilterTask: gtfsMap => {
    return through.obj(function (file, encoding, callback) {
      const gtfsFile = file.history[file.history.length - 1];
      const relativeFilename = path.relative(dataDir, gtfsFile);
      const id = parseId(gtfsFile);
      const source = gtfsMap[id];
      const rules = source.rules;
      if (rules) {
        const src = `${relativeFilename}`;
        const dst = `${relativeFilename}-filtered`;
        const dstDir = `${dataDir}/${dst}`;

        // execute all rules
        // result zip of a rule is input data for next rule
        // async zip creation is synchronized using recursion:
        // next recursion call is launched from zip callback
        let i = 0;
        function processRule() {
          if (i < rules.length) {
            const rule = rules[i++];
            if (OBAFilter(src, dst, rule)) {
              fs.unlinkSync(`${dataDir}/${src}`);
              /* create zip named src from files in dst */
              if (zipDirContents(`${dataDir}/${src}`, `${dataDir}/${dst}`)) {
                del(dstDir);
                logger.info(`Filter ${gtfsFile} with rule ${rule} SUCCESS`);
                processRule(); // handle next rule
              } else {
                del(dstDir);
                postSlackMessage(`OBA zip task failed`, 'error');
                callback(null, null);
              }
            } else {
              // failure
              del(dstDir);
              postSlackMessage(`Rule ${rule} on ${gtfsFile} failed`, 'error');
              callback(null, null);
            }
          } else {
            // all rules done successfully
            file.contents = cloneable(fs.createReadStream(gtfsFile));
            callback(null, file);
          }
        }
        processRule(); // start recursive rule processing
      } else {
        logger.info(gtfsFile + ' filter skipped');
        callback(null, file);
      }
    });
  },
};
