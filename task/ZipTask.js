const fs = require('fs');
const { execSync } = require('child_process');
const through = require('through2');
const { parseId, createDir } = require('../util');
const { dataDir } = require('../config.js');

/**
 * Moves files from tmp folder to a zip file.
 * @param {string} zipFile - The name of the zip file
 * @param {string} path - The path to the data directory containing files to be restored
 * @param {string[]} filesToAdd - An array of filenames to add to the zip file
 * @returns {Promise} A Promise that resolves when the operation is complete
 */
function addToZip(zipFile, path, filesToAdd) {
  const existingFilePaths = filesToAdd
    .map(fileName => `${path}/${fileName}`)
    .filter(filePath => fs.existsSync(filePath));
  if (existingFilePaths.length > 0) {
    // Using -j flag sometimes causes problems but it is sometimes required to prune paths
    // from file names inside the zip.
    try {
      execSync(`zip -uj ${zipFile} ${existingFilePaths.join(' ')}`, {
        stdio: 'pipe',
      });
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      execSync(`zip -u ${zipFile} ${existingFilePaths.join(' ')}`);
    }
    process.stdout.write(
      `Added ${existingFilePaths.join(', ')} to ${zipFile}\n`,
    );
  }
  return new Promise(resolve => {
    resolve(fs.createReadStream(zipFile));
  });
}

/**
 * Extracts files from a zip archive and saves them to given path
 * @param {string} zipName - zip file name
 * @param {string[]} filesToExtract - An array of filenames to extract from the archive
 * @param {string} path - The path to the data directory where files are put
 * @param {function} cb - callback to signal when finished
 */
function extractFromZip(zipName, filesToExtract, path, cb) {
  const filesString = filesToExtract
    .filter(name => zipHasFile(zipName, name))
    .join(' ');
  execSync(`unzip -o -j ${zipName} ${filesString} -d ${path}`);
  process.stdout.write(`Extracted ${filesString} from ${zipName} to ${path}\n`);
  cb();
}

/**
 * Delete files from a zip archive
 * @param {string} zipName - zip file name
 * @param {string[]} filesToRemove - An array of filenames to remove from the archive
 */
function removeFilesFromZip(zipName, filesToRemove) {
  const filesString = filesToRemove
    .filter(name => zipHasFile(zipName, name))
    .join(' ');
  if (filesString.length > 0) {
    execSync(`zip -d ${zipName} ${filesString}`);
    process.stdout.write(`Removed ${filesString} from ${zipName}\n`);
  }
}

/**
 * Rename files in a zip archive
 * @param {string} zipName - zip file name
 * @param {object} oldNamesForFiles - object where the keys are the new names and values are the old names
 */
function renameFilesInZip(zipName, oldNamesForFiles) {
  for (const [newName, oldName] of Object.entries(oldNamesForFiles)) {
    if (zipHasFile(zipName, oldName)) {
      renameFileInZip(zipName, oldName, newName);
    }
  }
}

/**
 * Rename a file in a zip archive
 * @param {string} zipName - zip file name
 * @param {string} oldName - original name for the file in zip
 * @param {string} newName - new name for the file in zip
 */
function renameFileInZip(zipName, oldName, newName) {
  try {
    // Don't output anything to logs as E_NOTIMPL errors can be verbose
    execSync(`7z rn ${zipName} ${oldName} ${newName}`, { stdio: 'pipe' });
  } catch (err) {
    if (!err.message.match(/E_NOTIMPL/)) {
      throw err;
    }
    // Some zip files don't support renaming files properly so we need to extract the files and rename them.
    const tmpPathForFile = createTmpDir(parseId(zipName), 'tmp-rename');
    extractFromZip(zipName, [oldName], tmpPathForFile, () => {});
    removeFilesFromZip(zipName, [oldName]);
    fs.renameSync(
      `${tmpPathForFile}/${oldName}`,
      `${tmpPathForFile}/${newName}`,
    );
    addToZip(zipName, tmpPathForFile, [newName]);
  }
  process.stdout.write(`Renamed ${oldName} to ${newName} in ${zipName}\n`);
}

function zipHasFile(zipName, file) {
  try {
    execSync(`unzip -l ${zipName} | grep -qE '(^|\\s)${file}(\\s|$)'`);
    return true;
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return false;
  }
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

/**
 * @param {string} zipFile file to create
 * @param {string[]} glob patterns for source files
 * @param {string} zipDir files are put into this directory inside the zip
 * @param {function} cb - callback to signal when finished
 */
function zipWithGlobIntoDir(zipFile, glob, zipDir, cb) {
  try {
    const tmpDir = createTmpDir(zipDir, 'tmp-dirs');
    execSync(`cp ${glob.join(' ')} ${tmpDir}`);
    execSync(`zip -r ${zipFile} ${tmpDir}`);
    process.stdout.write(`Created ${zipFile}\n`);
    cb();
  } catch (err) {
    process.stderr.write(`Error creating ${zipFile}\n`);
    cb(err);
  }
}

/**
 * @param {string} zipFile file to create
 * @param {string} dir source directory for files
 * @param {function} cb - callback to signal when finished
 */
function zipDirContents(zipFile, dir, cb) {
  try {
    execSync(`zip -j ${zipFile} ${dir}/*`);
    process.stdout.write(`Created ${zipFile}\n`);
    cb();
  } catch (err) {
    process.stderr.write(`Error creating ${zipFile}\n`);
    cb(err);
  }
}

function createTmpDir(dirName, baseDirectory) {
  createDir(`${dataDir}/${baseDirectory}/${dirName}`);
}

module.exports = {
  extractAllFiles,
  extractFiles: names => {
    if (!names?.length) {
      return through.obj(function (file, encoding, callback) {
        callback(null, file);
      });
    }
    return through.obj(function (file, encoding, callback) {
      const localFile = file.history[file.history.length - 1];
      const path = createTmpDir(parseId(localFile), 'tmp');
      extractFromZip(localFile, names, path, () => {
        callback(null, file);
      });
    });
  },
  extractFromZip,
  addFiles: names => {
    if (!names?.length) {
      return through.obj(function (file, encoding, callback) {
        callback(null, file);
      });
    }
    return through.obj(function (file, encoding, callback) {
      const localFile = file.history[file.history.length - 1];
      const path = createTmpDir(parseId(localFile), 'tmp');
      addToZip(localFile, path, names).then(newContents => {
        file.contents = newContents;
        callback(null, file);
      });
    });
  },
  addToZip,
  removeFilesFromZip,
  renameFilesInZip,
  zipHasFile,
  zipWithGlobIntoDir,
  zipDirContents,
};
