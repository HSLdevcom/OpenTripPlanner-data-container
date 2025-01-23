const fs = require('fs');
const { extractAllFiles } = require('./ZipTask');
const { postSlackMessage, dirNameToDate } = require('../util');

function findLatestZip(sourceDir, routerId, tag) {
  const basePath = `${sourceDir}/${tag}`;
  let latestDirName;
  let latestDate = null;
  fs.readdirSync(basePath).forEach(file => {
    const filePath = `${basePath}/${file}`;
    if (!fs.lstatSync(filePath).isDirectory()) {
      return;
    }
    const routers = fs.readdirSync(filePath);
    if (routers.length !== 1 || routers[0] !== routerId) {
      return;
    }
    // Directory names follow ISO 8601 format without milliseconds and
    // with ':' replaced with '.'.
    const date = dirNameToDate(file);
    if (date != null && (latestDate == null || date > latestDate)) {
      latestDate = date;
      latestDirName = file;
    }
  });
  return `${basePath}/${latestDirName}/${routerId}/router-${routerId}.zip`;
}

/**
 * Unzip latest version of the data for router into destinationDir so it can be used as
 * the basis for the new build if some parts of the data can't be updated.
 */
module.exports = function (sourceDir, destinationDir, routerId, tag) {
  return new Promise((resolve, reject) => {
    try {
      extractAllFiles(findLatestZip(sourceDir, routerId, tag), destinationDir);
      resolve();
    } catch (err) {
      postSlackMessage(`Seed failed due to: ${err}`);
      reject(err);
    }
  });
};
