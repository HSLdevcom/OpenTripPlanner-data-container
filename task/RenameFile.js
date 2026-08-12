const through = require('through2');

module.exports = {
  renameFile: suffix => {
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
