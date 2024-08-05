const fs = require('fs')
const { postSlackMessage, dirNameToDate, extractAllFiles } = require('../util')

function findLatestZip (sourceDir, routerId, tag) {
  const basePath = `${sourceDir}/${tag}`
  let latestDirName
  let latestDate = null
  fs.readdirSync(basePath).forEach(file => {
    const filePath = `${basePath}/${file}`
    if (!fs.lstatSync(filePath).isDirectory()) {
      return
    }
    const routers = fs.readdirSync(filePath)
    if (routers.length !== 1 || routers[0] !== routerId) {
      return
    }
    // Directory names follow ISO 8601 format without milliseconds and
    // with ':' replaced with '.'.
    const date = dirNameToDate(file)
    if (date != null && (latestDate == null || date > latestDate)) {
      latestDate = date
      latestDirName = file
    }
  })
  return `${basePath}/${latestDirName}/${routerId}/router-${routerId}.zip`
}

/**
 * Download seed data from previous data containers.
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
