const fs = require('fs');
const axios = require('axios');
const { createDir } = require('../utils/builderUtils.js');
const logger = require('../logger');

/**
 * Download DEM files from Azure blob storage.
 */
module.exports = function (entries, dlDir, readyDir) {
  createDir(dlDir);
  createDir(readyDir);
  return entries.map(
    entry =>
      new Promise((resolve, reject) => {
        const filePath = `${dlDir}/${entry.id}.tif`;
        const readyPath = `${readyDir}/${entry.id}.tif`;
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
                logger.info(
                  `Local DEM data for ${entry.id} was already up-to-date`,
                );
                dataAlreadyExists = true;
                // Abort download as remote has same size as local copy
                abortController.abort();
                resolve();
              } else {
                response.data.pipe(fs.createWriteStream(filePath));
                logger.info(`Downloading new DEM data from ${entry.url}`);
              }
            }
            response.data.on('error', err => {
              if (!dataAlreadyExists) {
                logger.error(`${entry.url} download failed: ${err.message}`);
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
                logger.info(`Downloaded updated DEM data to ${filePath}`);
                fs.rename(filePath, readyPath, err => {
                  if (err) {
                    logger.error(
                      `Failed to move DEM data from ${readyPath}: ${err.message}`,
                    );
                    reject(err);
                  } else {
                    logger.info(`DEM data updated for ${entry.id}`);
                    resolve();
                  }
                });
              } else {
                resolve();
              }
            });
          })
          .catch(err => {
            logger.error(`${entry.url} download failed: ${err.message}`);
            reject(err);
          });
      }),
  );
};
