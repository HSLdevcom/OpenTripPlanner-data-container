const through = require('through2');
const logger = require('../logger');

module.exports = {
  renameFile: suffix => {
    logger.info(`Renaming downloaded files with suffix '${suffix}'`);
    return through.obj(function (file, encoding, callback) {
      if (!file.stem.includes(suffix)) {
        file.stem = file.stem + suffix;
      }
      if (file.extname !== '.zip') {
        file.extname = '.zip';
      }
      callback(null, file);
    });
  },
};
