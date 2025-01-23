const through = require('through2');
const JSZip = require('jszip');
const { postSlackMessage, parseId } = require('../util');

function zipWithNewName(zip, relativePath, replacementFile) {
  return new Promise((resolve, reject) => {
    const replacementZipFile = zip.file(replacementFile);
    if (!replacementZipFile) {
      const errorMessage = `${replacementFile} was defined to replace ${relativePath} but ${replacementFile} doesn't exist`;
      postSlackMessage(errorMessage);
      reject(new Error(errorMessage));
    } else {
      zip
        .file(replacementFile)
        .async('string')
        .then(data => {
          zip.file(relativePath, data);
          zip.remove(replacementFile);
          process.stdout.write(
            `Replaced ${relativePath} with ${replacementFile}\n`,
          );
          resolve();
        })
        .catch(err => {
          const errorMessage = `${replacementFile} was defined to replace ${relativePath} but the operation failed\n ${err}`;
          postSlackMessage(errorMessage);
          reject(err);
        });
    }
  });
}

const replaceGTFSFiles = (fileContents, replacements, fileName, cb) => {
  const zip = new JSZip();
  zip
    .loadAsync(fileContents)
    .then(function () {
      const promises = [];
      const used = {};
      zip.forEach(relativePath => {
        const replacementFile = replacements[relativePath];
        // No replacement file defined, remove the file
        if (replacementFile === null) {
          promises.push(
            new Promise(resolve => {
              zip.remove(relativePath);
              process.stdout.write(
                `Removed ${relativePath} from ${fileName}\n`,
              );
              resolve();
            }),
          );
        } else if (replacementFile !== undefined) {
          // Replacement file defined, replace the file with the new one
          promises.push(zipWithNewName(zip, relativePath, replacementFile));
        }
        used[relativePath] = true;
      });
      // renamed replacements without existing counterpart
      Object.keys(replacements).forEach(name => {
        if (!used[name]) {
          promises.push(zipWithNewName(zip, name, replacements[name]));
        }
      });
      Promise.all(promises)
        .then(() => cb(undefined, zip.generateNodeStream()))
        .catch(err => cb(err, undefined));
    })
    .catch(err => {
      postSlackMessage(
        `GTFS file replacement operation failed for ${fileName}\n ${err}`,
      );
      cb(err, undefined);
    });
};

module.exports = {
  replaceGTFSFilesTask: configMap => {
    return through.obj(function (file, encoding, callback) {
      const gtfsFile = file.history[file.history.length - 1];
      const id = parseId(gtfsFile);
      const fileName = gtfsFile.split('/').pop();
      const config = configMap[id];
      const replacements = config ? config.replacements : null;
      if (!replacements) {
        callback(null, file);
      } else {
        process.stdout.write(`Replacing files in source ${id} \n`);
        replaceGTFSFiles(
          file.contents,
          replacements,
          fileName,
          (err, newContents) => {
            if (newContents) {
              file.contents = newContents;
              callback(null, file);
            } else {
              // fallback to old data
              callback(null, null);
            }
          },
        );
      }
    });
  },
};
