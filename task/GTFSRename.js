const through = require('through2');

module.exports = {
  renameGTFSFile: () => {
    return through.obj(function (file, encoding, callback) {
      if (!file.stem.includes('-gtfs')) {
        file.stem = file.stem + '-gtfs';
      }
      if (file.extname !== '.zip') {
        file.extname = '.zip';
      }
      callback(null, file);
    });
  },
};
