const fs = require('fs');
const axios = require('axios');
const { postSlackMessage, createDir } = require('../util');

function handleFail(url, err) {
  postSlackMessage(`${url} Download failed: ${err} :boom:`);
  global.hasFailures = true;
}

/**
 * Download external data (gtfs, osm) resources.
 */
function download(entry, dir) {
  return new Promise(resolve => {
    createDir(dir);
    process.stdout.write('Downloading ' + entry.url + '...\n');
    const name = entry.url.split('/').pop();
    const ext = name.indexOf('.') > 0 ? '.' + name.split('.').pop() : '';
    const filePath = `${dir}/${entry.id + ext}`;
    const request = {
      method: 'GET',
      url: entry.url,
      responseType: 'stream',
      ...entry.request,
    };
    axios(request)
      .then(response => {
        response.data.pipe(fs.createWriteStream(filePath));
        response.data.on('error', err => {
          handleFail(entry.url, err);
          resolve();
        });
        response.data.on('end', () => {
          process.stdout.write(entry.url + ' Download SUCCESS\n');
          resolve();
        });
      })
      .catch(err => {
        handleFail(entry.url, err);
        resolve();
      });
  });
}

module.exports = async function dlSequentially(entries, dir) {
  for (const e of entries) {
    await download(e, dir);
  }
};
