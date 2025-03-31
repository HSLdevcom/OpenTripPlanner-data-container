const fs = require('fs');
const { execSync } = require('child_process');
const through = require('through2');
const JSZip = require('jszip');
const { parseId } = require('../util');
const { dataDir } = require('../config.js');

/**
 * Moves files from tmp folder to a zip file.
 * @param {string} zipFile - The name of the zip file
 * @param {string} path - The path to the data directory containing files to be restored
 * @param {string[]} filesToAdd - An array of filenames to add to the zip file
 * @returns {Promise} A Promise that resolves when the operation is complete
 */
function addFiles(zipFile, path, filesToAdd) {
  return new Promise((resolve, reject) => {
    const newZip = new JSZip();
    fs.readFile(zipFile, function (err, data) {
      if (err) {
        process.stdout.write(`Error reading file ${err.message} \n`);
        reject(err);
      } else {
        newZip.loadAsync(data).then(zip => {
          filesToAdd.forEach(file => {
            const filePath = `${path}/${file}`;
            try {
              const fileData = fs.readFileSync(filePath);
              if (fileData) {
                zip.file(`${file}`, fileData);
              }
            } catch {
              process.stdout.write(`${filePath} not found\n`);
              // nop
            }
          });
          const writeStream = fs.createWriteStream(zipFile);
          zip
            .generateNodeStream()
            .pipe(writeStream)
            .on('error', err => {
              process.stderr.write(`Error writing zip file: ${err.message}\n`);
              reject(err);
            })
            .on('finish', () => {
              resolve(zip.generateNodeStream());
            });
        });
      }
    });
  });
}

/**
 * Extracts files from a zip archive and saves them to given path
 * @param {string} zipName - zip file name
 * @param {string[]} filesToExtract - An array of filenames to extract from the archive
 * @param {string} path - The path to the data directory where files are put
 * @param {function} cb - callback to signal when finished
 */
function extractFiles(zipName, filesToExtract, path, cb) {
  const zip = new JSZip();
  zip.loadAsync(fs.readFileSync(zipName)).then(() => {
    const promises = filesToExtract.map(fileName => {
      const file = Object.keys(zip.files).find(name =>
        name.endsWith(`${fileName}`),
      );
      if (file) {
        return zip
          .file(file)
          .async('nodebuffer')
          .then(fileData => {
            fs.writeFileSync(`${path}/${fileName}`, fileData);
          });
      } else {
        return Promise.resolve();
      }
    });
    Promise.all(promises).then(() => cb());
  });
}

/**
 * Extracts files from a zip archive and saves them to given path
 * @param {string} zipPath - zip file name
 * @param {string} destinationPath - The path to the data directory where files are put
 */
function extractAllFiles(zipPath, destinationPath) {
  execSync(`unzip -o ${zipPath} -d ${destinationPath}`);
  process.stdout.write(`Unzipped ${zipPath} to ${destinationPath}\n`);
}

function tmpPath(fileName) {
  const id = parseId(fileName);
  return `${dataDir}/tmp/${id}`;
}

module.exports = {
  extractAllFiles,
  extractFromZip: names => {
    if (!names?.length) {
      return through.obj(function (file, encoding, callback) {
        callback(null, file);
      });
    }
    return through.obj(function (file, encoding, callback) {
      const localFile = file.history[file.history.length - 1];
      const path = tmpPath(localFile);
      // Create a temp folder for files to be extracted
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }
      extractFiles(localFile, names, path, () => {
        callback(null, file);
      });
    });
  },

  addToZip: names => {
    if (!names?.length) {
      return through.obj(function (file, encoding, callback) {
        callback(null, file);
      });
    }
    return through.obj(function (file, encoding, callback) {
      const localFile = file.history[file.history.length - 1];
      const path = tmpPath(localFile);
      addFiles(localFile, path, names).then(newContents => {
        file.contents = newContents;
        callback(null, file);
      });
    });
  },
};
