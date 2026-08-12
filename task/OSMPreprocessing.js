const fs = require('fs');
const fse = require('fs-extra');
const exec = require('child_process').exec;
const through = require('through2');
const { dataDir, constants, dataToolImage } = require('../config');
const { postSlackMessage, createDir } = require('../util');
const logger = require('../logger');

/**
 * Runs the instructions listed in the OSM preprocessing bash script.
 */
function preprocessWithFile(
  osmFile,
  quiet = false,
  osmPreprocessingDir,
  osmId,
  osmFileName,
) {
  const lastLog = [];

  return new Promise((resolve, reject) => {
    const preprocessingInstructionsFile = `${osmPreprocessingDir}/${osmId}.sh`;

    if (!fs.existsSync(osmFile)) {
      reject(new Error(`${osmFile} does not exist!\n`));
    } else if (!fs.existsSync(preprocessingInstructionsFile)) {
      reject(
        new Error(
          `No OSM preprocessing instructions for ${osmId}. ${preprocessingInstructionsFile} does not exist!\n`,
        ),
      );
    } else {
      createDir(`${dataDir}/tmp`);
      fs.mkdtemp(`${dataDir}/tmp/osm-preprocessing`, (err, folder) => {
        if (err) throw err;
        logger.info(
          'Running OSM preprocessing instructions from ' +
            preprocessingInstructionsFile +
            ' for ' +
            osmFile +
            ' in directory ' +
            folder +
            '...',
        );
        const r = fs.createReadStream(osmFile);
        r.on('end', async () => {
          try {
            logger.info(
              'Running commands from file: ' + preprocessingInstructionsFile,
            );
            const preprocessingCommand = exec(
              `docker run -v ${folder}:/tmp/osm-preprocessing:rw -v ${preprocessingInstructionsFile}:/tmp/preprocessing.sh:ro -w /tmp/osm-preprocessing --rm --entrypoint /bin/bash ${dataToolImage} /tmp/preprocessing.sh`,
              { maxBuffer: constants.BUFFER_SIZE },
            );
            preprocessingCommand.on('exit', function (c) {
              if (c === 0) {
                resolve(fs.readFileSync(`${folder}/${osmFileName}`));
                logger.info(
                  osmFile +
                    ' + ' +
                    preprocessingInstructionsFile +
                    ' OSM preprocessing SUCCESS',
                );
              } else {
                const log = lastLog.join('');
                postSlackMessage(
                  `${osmFile} + ${preprocessingInstructionsFile} OSM preprocessing failed: ${log} :boom:`,
                );
                global.hasFailures = true;
                resolve(null);
              }
              fse.removeSync(folder);
            });
            preprocessingCommand.stdout.on('data', function (data) {
              lastLog.push(data.toString());
              if (lastLog.length === 20) {
                delete lastLog[0];
              }
              if (!quiet) {
                process.stdout.write(data);
              }
            });
            preprocessingCommand.stderr.on('data', function (data) {
              lastLog.push(data.toString());
              if (lastLog.length > 20) {
                lastLog.splice(0, 1);
              }
              if (!quiet) {
                process.stderr.write(data);
              }
            });
          } catch (e) {
            const log = lastLog.join('');
            postSlackMessage(
              `${osmFile} + ${preprocessingInstructionsFile} OSM preprocessing failed: ${log} :boom: ${e}`,
            );
            fse.removeSync(folder);
            reject(e);
          }
        });
        r.pipe(fs.createWriteStream(`${folder}/${osmFileName}`));
      });
    }
  });
}

module.exports = {
  runOSMPreprocessing: osmPreprocessingDir => {
    return through.obj(function (file, encoding, callback) {
      const osmFile = file.history[file.history.length - 1];
      if (process.env.SKIP_OSM_PREPROCESSING) {
        logger.info(
          'OSM preprocessing skipped because the SKIP_OSM_PREPROCESSING environment variable is set',
        );
        return callback(null, file);
      }
      const osmFileName = osmFile.split('/').pop();
      // This can be, for example, hsl, finland, or southFinland.
      const osmId = osmFileName.split('.')[0];
      preprocessWithFile(osmFile, true, osmPreprocessingDir, osmId, osmFileName)
        .then(outputContents => {
          if (outputContents) {
            file.contents = outputContents;
            callback(null, file);
          } else {
            callback(null, file);
          }
        })
        .catch(err => {
          logger.error(err.message);
          callback(null, file);
        });
    });
  },
};
