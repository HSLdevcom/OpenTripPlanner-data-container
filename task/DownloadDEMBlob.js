const fs = require('fs');
const axios = require('axios');
const { dataDir } = require('../config');

/**
 * Download DEM files from Azure blob storage.
 */
module.exports = function (entries) {
  return entries.map(
    entry =>
      new Promise((resolve, reject) => {
        const filePath = `${dataDir}/downloads/dem/${entry.id}.tif`;
        const readyPath = `${dataDir}/ready/dem/${entry.id}.tif`;
        let dataAlreadyExists = false;
        let downloadSize;
        let readySize;
        const abortController = new AbortController();

        if (fs.existsSync(readyPath)) {
          readySize = fs.statSync(readyPath).size;
        }
        axios({
          method: 'GET',
          url: entry.url,
          responseType: 'stream',
          signal: abortController.signal,
        })
          .then(response => {
            if (response.status === 200) {
              downloadSize = response.headers['content-length'];
              if (readySize && readySize === parseInt(downloadSize)) {
                process.stdout.write(
                  `Local DEM data for ${entry.id} was already up-to-date\n`,
                );
                dataAlreadyExists = true;
                // Abort download as remote has same size as local copy
                abortController.abort();
                resolve();
              } else {
                response.data.pipe(fs.createWriteStream(filePath));
                process.stdout.write(
                  `Downloading new DEM data from ${entry.url}\n`,
                );
              }
            }
            response.data.on('error', err => {
              if (!dataAlreadyExists) {
                process.stdout.write(
                  `${entry.url} download failed: ${JSON.stringify(err)} \n`,
                );
                reject(err);
              } else {
                resolve();
              }
            });
            response.data.on('end', () => {
              // If new file was downloaded, this resolves with the file's path
              // This is also called when request is aborted but new call to resolve shouldn't do anything
              // However, if the file is really small, this could in theory be called before call to abort request
              // but that situation shouldn't happen with DEM data sizes.
              if (!dataAlreadyExists) {
                process.stdout.write(
                  `Downloaded updated DEM data to ${filePath}\n`,
                );
                fs.rename(filePath, readyPath, err => {
                  if (err) {
                    process.stdout.write(JSON.stringify(err));
                    process.stdout.write(
                      `Failed to move DEM data from ${readyPath}\n`,
                    );
                    reject(err);
                  } else {
                    process.stdout.write(`DEM data updated for ${entry.id}\n`);
                    resolve();
                  }
                });
              } else {
                resolve();
              }
            });
          })
          .catch(err => {
            process.stdout.write(
              `${entry.url} download failed: ${JSON.stringify(err)}\n`,
            );
            reject(err);
          });
      }),
  );
};
