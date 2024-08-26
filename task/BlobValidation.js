const fs = require('fs')
const through = require('through2')
const { compareSizes } = require('../util')

/**
 * Checks if downloaded file is at most 1% smaller than the seeded file.
 * If there was no seeded file, validation is always be successful
 */
function validateSize (seededFile, downloadedFile) {
  const p = new Promise((resolve, reject) => {
    if (!fs.existsSync(downloadedFile)) {
      process.stdout.write(downloadedFile + ' does not exist!\n')
      p.reject()
    } else {
      if (process.env.DISABLE_BLOB_VALIDATION) {
        global.blobSizeOk = true
        resolve()
      }
      let downloadedFileSize = fs.statSync(downloadedFile).size
      compareSizes(seededFile, downloadedFileSize, 0.01)
        .then(() => {
          global.blobSizeOk = true
          resolve()
        }).catch((err) => {
          if (err === 'error') {
            process.stdout.write(`Failed to load local data for ${downloadedFile}\n`)
            global.blobSizeOk = true
            resolve()
          } else {
            process.stdout.write(downloadedFile + ': file had different size than the seeded file\n')
            reject(err)
          }
        })
    }
  })
  return p
}

module.exports = {
  validateBlobSize: () => {
    return through.obj(function (file, encoding, callback) {
      const localFile = file.history[file.history.length - 1]
      const seededFile = localFile.replace('/downloads/', '/ready/')
      validateSize(seededFile, localFile).then(() => {
        callback(null, file)
      }).catch(() => {
        callback(null, null)
      })
    })
  }
}
