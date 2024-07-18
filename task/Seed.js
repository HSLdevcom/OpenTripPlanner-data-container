const fs = require('fs')
const { extractAllFiles } = require('./ZipTask')
const { postSlackMessage } = require('../util')

function findLatestZip (sourceDir, routerId, tag) {
  const basePath = `${sourceDir}/${routerId}/${tag}`;
  let latestDirName
  let latestDate = null
  fs.readdirSync(basePath).forEach(file => {
    const date = new Date(file)
    if (latestDate == null || date > latestDate) {
      latestDate = date
      latestDirName = file
    }
  })
  return `${basePath}/${latestDirName}/router-${routerId}.zip`
}

/**
 * Unzip latest version of the data for router into destinationDir so it can be used as
 * the basis for the new build if some parts of the data can't be updated.
 */
module.exports = function (sourceDir, destinationDir, routerId, tag) {
  return new Promise((resolve, reject) => {
    try {
      extractAllFiles(findLatestZip(sourceDir, routerId, tag), destinationDir)
      resolve()
    } catch (err) {
      postSlackMessage(`Seed failed due to: ${err}`)
      reject(err)
    }
  })
}