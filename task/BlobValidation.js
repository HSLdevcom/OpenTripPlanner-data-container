const fs = require('fs')
const through = require('through2')
const { postSlackMessage, compareHashes } = require('../util')

/**
 * Checks if local file's md5 hash matches md5 value stored in a header in Azure blob storage.
 * If there was no content-md5 header sent during download, validation is always successful
 */
function validateHash (localFile, headerHash) {
  const p = new Promise((resolve, reject) => {
    if (!fs.existsSync(localFile)) {
      process.stdout.write(localFile + ' does not exist!\n')
      p.reject()
    } else {
      compareHashes(headerHash, localFile)
        .then(() => {
          resolve()
        }).catch((err) => {
          process.stdout.write(localFile + ': file had different md5 hash than in blob storage\n')
          postSlackMessage(localFile + ': file had different md5 hash than in blob storage :boom:')
          reject(err)
        })
    }
  })
  return p
}

module.exports = {
  validateBlobHash: () => {
    return through.obj(function (file, encoding, callback) {
      const localFile = file.history[file.history.length - 1]
      validateHash(localFile, file.hash).then(() => {
        callback(null, file)
      }).catch(() => {
        callback(null, null)
      })
    })
  }
}
