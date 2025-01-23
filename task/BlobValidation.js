const fs = require('fs');
const through = require('through2');

/**
 * Checks if downloaded file is at most 1% smaller than the seeded file.
 * If there was no seeded file, validation is always successful
 */
function validateSize(seededFile, downloadedFile) {
  if (!fs.existsSync(downloadedFile)) {
    process.stdout.write(downloadedFile + ' does not exist!\n');
    return false;
  }
  if (process.env.DISABLE_BLOB_VALIDATION || !fs.existsSync(seededFile)) {
    process.stdout.write('Skipping blob size validation\n');
    global.blobSizeOk = true;
    return true;
  }
  const downloadedFileSize = fs.statSync(downloadedFile).size;
  const seedFileSize = fs.statSync(seededFile).size;
  if (seedFileSize * 0.99 <= downloadedFileSize) {
    process.stdout.write('Blob size validated\n');
    global.blobSizeOk = true;
    return true;
  } else {
    process.stdout.write(
      downloadedFile + ': file had different size than the seeded file\n',
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
