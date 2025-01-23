const JSZip = require('jszip');
const fs = require('fs');
const converter = require('json-2-csv');
const through = require('through2');
const cloneable = require('cloneable-readable');
const { postSlackMessage, parseId } = require('../util');

function createFeedInfo(zip, file, csv, cb) {
  zip.file('feed_info.txt', csv);
  zip
    .generateNodeStream({ streamFiles: true, compression: 'DEFLATE' })
    .pipe(fs.createWriteStream(file))
    .on('finish', cb);
}

function setFeedId(file, id, cb) {
  fs.readFile(file, function (err, data) {
    if (err) {
      cb(err);
      return;
    }
    const zip = new JSZip();
    zip.loadAsync(data).then(() => {
      const feedInfo = zip.file('feed_info.txt');
      if (feedInfo === null) {
        const csv = `feed_publisher_name,feed_publisher_url,feed_lang,feed_id
${id}-fake-name,${id}-fake-url,${id}-fake-lang,${id}\n`;
        createFeedInfo(zip, file, csv, () => {
          cb('created');
        });
      } else {
        feedInfo.async('string').then(function (data) {
          // Remove unnecessary control characters that break things
          let filteredData = data.replace(/\r/g, '');
          if (filteredData.charAt(filteredData.length - 1) === '\n') {
            filteredData = filteredData.slice(0, -1);
          }
          if (filteredData.charCodeAt(0) === 0xfeff) {
            // remove BOM
            filteredData = filteredData.substr(1);
          }
          const json = converter.csv2json(filteredData);
          if (json.length > 0) {
            if (process.env.VERSION_CHECK) {
              const EIGHT_HOURS = 8 * 60 * 60 * 1000;
              const idsToCheck = process.env.VERSION_CHECK.replace(
                / /g,
                '',
              ).split(',');
              const now = new Date();
              // check if a warning should be shown about feed_version timestamp being over 8 hours in the past
              if (
                idsToCheck.includes(id) &&
                json[0].feed_version !== undefined &&
                now - new Date(json[0].feed_version) > EIGHT_HOURS
              ) {
                process.stdout.write(
                  'GTFS data for ' +
                    id +
                    ' had not been updated within 8 hours.\n',
                );
                // send warning also to slack between monday and friday
                const day = now.getDay();
                if (day !== 1) {
                  postSlackMessage(
                    'GTFS data for ' +
                      id +
                      ' had not been updated within 8 hours :boom:',
                  );
                }
              }
            }
            // no id or id is wrong
            if (json[0].feed_id === undefined || json[0].feed_id !== id) {
              json[0].feed_id = id;
              const csv = converter.json2csv(json);
              createFeedInfo(zip, file, csv, () => {
                cb('edited');
              });
            } else {
              cb('nop');
            }
          } else {
            cb('nop');
          }
        });
      }
    });
  });
}

module.exports = {
  /**
   * Sets gtfs feed id in gtfs zip
   */
  setFeedIdTask: () => {
    return through.obj(function (file, encoding, callback) {
      const gtfsFile = file.history[file.history.length - 1];
      const id = parseId(gtfsFile);
      process.stdout.write(
        gtfsFile + ' ' + 'Setting GTFS feed id to ' + id + '\n',
      );
      setFeedId(gtfsFile, id, action => {
        process.stdout.write(gtfsFile + ' ID ' + action + ' SUCCESS\n');
        file.contents = cloneable(fs.createReadStream(gtfsFile));
        callback(null, file);
      });
    });
  },
};
