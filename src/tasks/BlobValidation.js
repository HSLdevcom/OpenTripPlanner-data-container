const fs = require('fs');
const through = require('through2');
const logger = require('../logger');

/**
 * Checks if downloaded file is at most 1% smaller than the seeded file.
 * If there was no seeded file, validation is always successful
 */
function validateSize(seededFile, downloadedFile) {
  if (!fs.existsSync(downloadedFile)) {
    logger.error(downloadedFile + ' does not exist!');
    return false;
  }
  if (process.env.DISABLE_BLOB_VALIDATION || !fs.existsSync(seededFile)) {
    logger.info('Skipping blob size validation');
    global.blobSizeOk = true;
    return true;
  }
  const downloadedFileSize = fs.statSync(downloadedFile).size;
  const seedFileSize = fs.statSync(seededFile).size;
  if (seedFileSize * 0.99 <= downloadedFileSize) {
    logger.info('Blob size validated');
    global.blobSizeOk = true;
    return true;
  } else {
    logger.warn(
      downloadedFile + ': file had different size than the seeded file',
    );
    return false;
  }
}

module.exports = {
  validateBlobSize: () => {
    return through.obj(function (file, encoding, callback) {
      const localFile = file.history[file.history.length - 1];
      const seededFile = localFile.replace('/downloads/', '/ready/');
      if (validateSize(seededFile, localFile)) {
        callback(null, file);
      } else {
        callback(null, null);
      }
    });
  },
};
