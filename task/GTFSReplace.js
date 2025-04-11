const through = require('through2');
const { parseId, postSlackMessage } = require('../util');
const {
  renameFilesInZip,
  removeFilesFromZip,
  zipHasFile,
} = require('./ZipTask');

const replaceGTFSFiles = (replacements, fileName) => {
  const filesToRemove = [];
  const replacementsForFiles = {};
  for (const [fileToReplace, replacementFile] of Object.entries(replacements)) {
    if (replacementFile) {
      // If replacement file doesn't exist (anymore), don't do anything else than message
      if (!zipHasFile(fileName, replacementFile)) {
        postSlackMessage(
          `${replacementFile} not found in ${fileName}. ${fileToReplace} is not replaced.`,
        );
        continue;
      }
      replacementsForFiles[fileToReplace] = replacementFile;
    }
    filesToRemove.push(fileToReplace);
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
