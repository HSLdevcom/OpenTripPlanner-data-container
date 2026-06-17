const fs = require('fs');
const cloneable = require('cloneable-readable');
const { execSync } = require('child_process');
const through = require('through2');
const { parseId, createDir } = require('../util');
const { dataDir } = require('../config.js');

/**
 * Moves files to a zip.
 * @param {string} zipFile - The name of the zip file
 * @param {string} path - The path to the data directory containing files to be restored
 * @param {string[]} filesToAdd - An array of filenames to add to the zip file
 */
function addToZip(zipFile, path, filesToAdd) {
  const existingFilePaths = filesToAdd
    .map(fileName => `${path}/${fileName}`)
    .filter(filePath => fs.existsSync(filePath));
  if (existingFilePaths.length > 0) {
    const names = filesToAdd.join(' ');
    const params = `${zipFile} ${names}`;
    try {
      // remove old versions
      execSync(`cd ${path} && zip -d ${params}`, { stdio: 'pipe' });
    } catch (err) {
      // Zip returns error 12 if file does not exist in zip
      if (err.status !== 12) {
        throw err;
      }
    }
    try {
      execSync(`cd ${path} && zip -u ${params}`, { stdio: 'pipe' });
    } catch (err) {
      // Zip returns 12 code when the file(s) don't need to be updated as they already
      // exist in the zip in identical state.
      if (err.status !== 12) {
        throw err;
      }
    }
    process.stdout.write(
      `Added ${existingFilePaths.join(', ')} to ${zipFile}\n`,
    );
  }
}

/**
 * Extracts files from a zip archive and saves them to given path
 * @param {string} zipName - zip file name
 * @param {string[]} filesToExtract - An array of filenames to extract from the archive
 * @param {string} path - The path to the data directory where files are put
 */
function extractFromZip(zipName, filesToExtract, path) {
  const filesString = filesToExtract
    .filter(name => zipHasFile(zipName, name))
    .join(' ');
  execSync(`unzip -o -j ${zipName} ${filesString} -d ${path}`);
  process.stdout.write(`Extracted ${filesString} from ${zipName} to ${path}\n`);
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
      process.stdout.write(`renaming ${oldName} to ${newName}\n`);
      renameFileInZip(zipName, oldName, newName);
    } else {
      process.stdout.write(`${oldName} not in ${zipName}\n`);
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
    extractFromZip(zipName, [oldName], tmpPathForFile);
    removeFilesFromZip(zipName, [oldName]);
    fs.renameSync(
      `${tmpPathForFile}/${oldName}`,
      `${tmpPathForFile}/${newName}`,
    );
    addToZip(zipName, tmpPathForFile, [newName]);
  }
  process.stdout.write(`Renamed ${oldName} to ${newName} in ${zipName}\n`);
}

function testZip(zipName) {
  try {
    execSync(`unzip -l ${zipName}`);
    return true;
  } catch (err) {
    return false;
  }
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
 */
function zipWithGlobIntoDir(zipFile, glob, zipDir) {
  try {
    execSync(`rm -rf ${zipDir} && mkdir ${zipDir}`);
    // We don't want to command to fail if nothing matching a glob is found
    execSync(`cp ${glob.join(' ')} ${zipDir} 2>/dev/null || :`);
    execSync(`zip -rm ${zipFile} ${zipDir}`);
    process.stdout.write(`Created ${zipFile}\n`);
    return true;
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    process.stderr.write(`Error creating ${zipFile}\n`);
    return false;
  }
}

/**
 * @param {string} zipFile file to create
 * @param {string} dir source directory for files
 */
function zipDirContents(zipFile, dir) {
  try {
    execSync(`zip -j ${zipFile} ${dir}/*`);
    process.stdout.write(`Created ${zipFile}\n`);
    return true;
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    process.stderr.write(`Error creating ${zipFile}\n`);
    return false;
  }
}

function createTmpDir(dirName, baseDirectory) {
  const path = `${dataDir}/${baseDirectory}/${dirName}`;
  createDir(`${dataDir}/${baseDirectory}/${dirName}`);
  return path;
}

module.exports = {
  extractAllFiles,
  extractFilesTask: names => {
    if (!names?.length) {
      return through.obj(function (file, encoding, callback) {
        callback(null, file);
      });
    }
    return through.obj(function (file, encoding, callback) {
      const localFile = file.history[file.history.length - 1];
      const path = createTmpDir(parseId(localFile), 'tmp');
      extractFromZip(localFile, names, path);
      file.contents = cloneable(fs.createReadStream(localFile));
      callback(null, file);
    });
  },
  extractFromZip,
  addFilesTask: names => {
    if (!names?.length) {
      return through.obj(function (file, encoding, callback) {
        callback(null, file);
      });
    }
    return through.obj(function (file, encoding, callback) {
      const localFile = file.history[file.history.length - 1];
      const path = createTmpDir(parseId(localFile), 'tmp');
      addToZip(localFile, path, names);
      file.contents = cloneable(fs.createReadStream(localFile));
      callback(null, file);
    });
  },
  addToZip,
  removeFilesFromZip,
  renameFilesInZip,
  testZip,
  zipHasFile,
  zipWithGlobIntoDir,
  zipDirContents,
};
