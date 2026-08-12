const fs = require('fs');
const del = require('del');
const { dirNameToDate } = require('../util');
const logger = require('../logger');

/*
 * Removes files which are not directories, directories which are empty or can't be parsed into dates.
 */
function deleteInvalidVersions(basePath) {
  const deletionPromises = [];
  fs.readdirSync(basePath).forEach(file => {
    const filePath = `${basePath}/${file}`;
    if (!fs.lstatSync(filePath).isDirectory()) {
      deletionPromises.push(del(filePath));
      return;
    }
    if (dirNameToDate(file) === null) {
      deletionPromises.push(del(filePath));
      return;
    }
    const files = fs.readdirSync(filePath);
    if (files.length === 0) {
      deletionPromises.push(del(filePath));
    }
  });
  return deletionPromises;
}

function sortByDate(firstFile, secondFile) {
  const firstDate = dirNameToDate(firstFile);
  const secondDate = dirNameToDate(secondFile);
  if (firstDate < secondDate) {
    return -1;
  }
  if (firstDate > secondDate) {
    return 1;
  }
  return 0;
}

function isCorrectRouter(basePath, file, routerId) {
  const routers = fs.readdirSync(`${basePath}/${file}`);
  return routers.length === 1 && routers[0] === routerId;
}

/*
 * Keeps KEEP_VERSIONS (default 10) valid latest versions and removes the rest.
 */
function deleteOldVersions(sourceDir, routerId, tag) {
  const savedCount = process.env.KEEP_VERSIONS ?? '10';
  const basePath = `${sourceDir}/${tag}`;
  if (!fs.existsSync(basePath)) {
    return new Promise(res => res());
  }
  const invalidVersions = deleteInvalidVersions(basePath);
  return Promise.all(invalidVersions).then(() => {
    const filesToDelete = fs
      .readdirSync(basePath)
      .filter(file => isCorrectRouter(basePath, file, routerId))
      .sort(sortByDate)
      .slice(0, -savedCount);
    const deletions = filesToDelete.map(file =>
      del(`${basePath}/${file}/${routerId}`),
    );
    return Promise.all(deletions).then(() => {
      logger.info(
        `Removed ${invalidVersions.length} invalid and ${filesToDelete.length} old version(s) from ${basePath}, keeping the latest ${savedCount}`,
      );
    });
  });
}

module.exports = function (sourceDir, routerId, tag) {
  return deleteOldVersions(sourceDir, routerId, tag);
};
