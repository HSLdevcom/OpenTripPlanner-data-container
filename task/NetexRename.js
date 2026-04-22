const through = require('through2');

module.exports = {
  renameNetexFile: () => {
    return through.obj(function (file, encoding, callback) {
      if (!file.stem.includes('-netex')) {
        file.stem = file.stem + '-netex';
      }
      if (file.extname !== '.zip') {
        file.extname = '.zip';
      }
      callback(null, file);
    });
  },
};
