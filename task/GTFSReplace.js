const through = require('through2');
const { parseId } = require('../util');
const { renameFilesInZip, removeFilesFromZip } = require('./ZipTask');

const replaceGTFSFiles = (replacements, fileName) => {
  const filesToRemove = [];
  const replacementsForFiles = {};
  for (const [fileToReplace, replacementFile] of Object.entries(replacements)) {
    filesToRemove.push(fileToReplace);
    if (replacementFile) {
      replacementsForFiles[fileToReplace] = replacementFile;
    }
  }
  removeFilesFromZip(fileName, filesToRemove);
  renameFilesInZip(fileName, replacementsForFiles);
};

module.exports = {
  replaceGTFSFilesTask: configMap => {
    return through.obj(function (file, encoding, callback) {
      const gtfsFile = file.history[file.history.length - 1];
      const id = parseId(gtfsFile);
      const config = configMap[id];
      const replacements = config ? config.replacements : null;
      if (!replacements) {
        callback(null, file);
      } else {
        process.stdout.write(`Replacing files in source ${id} \n`);
        replaceGTFSFiles(replacements, file.path);
        callback(null, file);
      }
    });
  },
};
