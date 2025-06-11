const fs = require('fs');
const { once } = require('events');
const readline = require('readline');
const fse = require('fs-extra');
const exec = require('child_process').exec;
const through = require('through2');
const { dataDir, constants, dataToolImage, osmPreprocessingURLs } = require('../config');
const { postSlackMessage, createDir } = require('../util');

async function readPreprocessingInstructions(preprocessingInstructionsFile) {
  const preprocessingInstructions = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(preprocessingInstructionsFile),
  });
  rl.on('line', (line) => {
    if (/^(osmconvert|osmfilter|osmupdate).*$/.test(line)) {
      preprocessingInstructions.push(line);
    } else if (line === '') {
      process.stdout.write('Skipping empty line in ' + preprocessingInstructionsFile + '\n');
    } else {
      throw Error(`'${line}' is not a valid preprocessing instruction!\n`)
    }
  });
  await once(rl, 'close');
  return `-c '${preprocessingInstructions.join(' && ')}'`;
}

/**
 * Runs the instructions listed in the OSM preprocessing file.
 * Only the osmfilter, osmconvert, and osmupdate commands can be used.
 */
function preprocessWithFile(osmFile, quiet = false, osmPreprocessingDlDir, osmId, osmFileName) {
  const lastLog = [];

  return new Promise((resolve, reject) => {
    const preprocessingInstructionsFile = `${osmPreprocessingDlDir}/${osmId}.txt`;

    if (!fs.existsSync(osmFile)) {
      reject(new Error(`${osmFile} does not exist!\n`));
    } else if (!fs.existsSync(preprocessingInstructionsFile)) {
      reject(new Error(`${preprocessingInstructionsFile} does not exist!\n`));
    } else {
      createDir(`${dataDir}/tmp`);
      fs.mkdtemp(`${dataDir}/tmp/osm-preprocessing`, (err, folder) => {
        if (err) throw err;
        process.stdout.write(
          'Running OSM preprocessing instructions from ' + osmFile + ' in directory ' + folder + '...\n',
        );
        const dir = folder.split('/').pop();
        const r = fs.createReadStream(osmFile);
        r.on('end', async () => {
          try {
            const concatenatedInstructions = await readPreprocessingInstructions(preprocessingInstructionsFile);
            process.stdout.write('Running command: ' + concatenatedInstructions + '\n');
            const preprocessingCommand = exec(
              `docker run -v ${dataDir}/tmp/${dir}:/tmp/osm-preprocessing -w /tmp/osm-preprocessing --rm --entrypoint /bin/bash ${dataToolImage} ${concatenatedInstructions}`,
              { maxBuffer: constants.BUFFER_SIZE },
            );
            preprocessingCommand.on('exit', function (c) {
              if (c === 0) {
                // The temporary directory is only deleted after the whole OSM pipeline is finished,
                // instead of directly after the preprocessing is finished.
                const outputFile = fs.createReadStream(`${dataDir}/tmp/${dir}/${osmFileName}`);
                resolve(outputFile);
                process.stdout.write(osmFile + ' + ' + preprocessingInstructionsFile + ' OSM preprocessing SUCCESS\n');
              } else {
                const log = lastLog.join('');
                postSlackMessage(`${osmFile} + ${preprocessingInstructionsFile} OSM preprocessing failed: ${log} :boom:`);
                global.hasFailures = true;
                resolve(null);
              }
            });
            preprocessingCommand.stdout.on('data', function (data) {
              lastLog.push(data.toString());
              if (lastLog.length === 20) {
                delete lastLog[0];
              }
              if (!quiet) {
                process.stdout.write(data.toString());
              }
            });
            preprocessingCommand.stderr.on('data', function (data) {
              lastLog.push(data.toString());
              if (lastLog.length > 20) {
                lastLog.splice(0, 1);
              }
              if (!quiet) {
                process.stderr.write(data.toString());
              }
            });
          } catch (e) {
            const log = lastLog.join('');
            postSlackMessage(`${osmFile} + ${preprocessingInstructionsFile} OSM preprocessing failed: ${log} :boom:`);
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
  runOSMPreprocessing: osmPreprocessingDlDir => {
    return through.obj(function (file, encoding, callback) {
      const osmFile = file.history[file.history.length - 1];
      if (process.env.SKIP_OSM_PREPROCESSING) {
        process.stdout.write(
          'OSM preprocessing skipped because the SKIP_OSM_PREPROCESSING environment variable is set\n',
        );
        return callback(null, file);
      }
      const osmFileName = osmFile.split('/').pop();
      // This can be, for example, hsl, finland, or southFinland.
      const osmId = osmFileName.split('.')[0];
      if (!osmPreprocessingURLs[osmId]) {
        process.stdout.write('No OSM preprocessing instructions for ' + osmId + '\n');
        return callback(null, file);
      }
      preprocessWithFile(osmFile, true, osmPreprocessingDlDir, osmId, osmFileName)
        .then(outputFile => {
          if (outputFile) {
            callback(null, outputFile);
          } else {
            callback(null, null);
          }
        })
        .catch(() => {
          callback(null, null);
        });
    });
  },
};
