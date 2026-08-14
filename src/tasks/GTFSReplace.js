const fs = require('fs');
const cloneable = require('cloneable-readable');
const through = require('through2');
const { parseId, postSlackMessage } = require('../utils/builderUtils.js');
const logger = require('../logger');
const {
  renameFilesInZip,
  removeFilesFromZip,
  testZip,
  zipHasFile,
} = require('./ZipTask');

const replaceGTFSFiles = (replacements, fileName) => {
  const filesToRemove = [];
  const replacementsForFiles = {};
  for (const [fileToReplace, replacementFile] of Object.entries(replacements)) {
    if (replacementFile) {
      // If replacement file doesn't exist (anymore), don't do anything else than message
      if (!zipHasFile(fileName, replacementFile)) {
        const msg = `${replacementFile} not found in ${fileName}. ${fileToReplace} is not replaced.`;
        postSlackMessage(msg, 'warn');
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
      if (!testZip(file.path)) {
        callback();
      } else {
        const gtfsFile = file.history[file.history.length - 1];
        const id = parseId(gtfsFile);
        const config = configMap[id];
        const replacements = config ? config.replacements : null;
        if (!replacements) {
          callback(null, file);
        } else {
          logger.info(`Replacing files in source ${id}`);
          replaceGTFSFiles(replacements, file.path);
          file.contents = cloneable(fs.createReadStream(file.path));
          callback(null, file);
        }
      }
    });
  },
};
