const fs = require('fs');
const execSync = require('child_process').execSync;
const converter = require('json-2-csv');
const through = require('through2');
// const cloneable = require('cloneable-readable');
const { postSlackMessage, parseId } = require('../util');
const { zipHasFile, extractFromZip, addToZip } = require('./ZipTask');
const { createDir } = require('../util');
const { dataDir } = require('../config.js');

const FEED_INFO_FILE = 'feed_info.txt';

function setFeedId(file, id) {
  const tmpFileDir = `${dataDir}/tmp-id/${id}`;
  const tmpFeedInfoFile = `${tmpFileDir}/${FEED_INFO_FILE}`;
  if (!fs.existsSync(file)) {
    return `${file} does not exist`;
  }
  createDir(tmpFileDir);
  try {
    if (!zipHasFile(file, FEED_INFO_FILE)) {
      const csv = `feed_publisher_name,feed_publisher_url,feed_lang,feed_id
  ${id}-fake-name,${id}-fake-url,${id}-fake-lang,${id}\n`;
      fs.writeFileSync(tmpFeedInfoFile, csv);
    } else {
      extractFromZip(file, [FEED_INFO_FILE], tmpFileDir);
      const data = fs.readFileSync(tmpFeedInfoFile, {
        encoding: 'utf8',
        flag: 'r',
      });
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
          const idsToCheck = process.env.VERSION_CHECK.replace(/ /g, '').split(
            ',',
          );
          const now = new Date();
          // check if a warning should be shown about feed_version timestamp being over 8 hours in the past
          if (
            idsToCheck.includes(id) &&
            json[0].feed_version !== undefined &&
            now - new Date(json[0].feed_version) > EIGHT_HOURS
          ) {
            process.stdout.write(
              'GTFS data for ' + id + ' had not been updated within 8 hours.\n',
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
          fs.writeFileSync(tmpFeedInfoFile, csv);
        } else {
          return 'nop';
        }
      } else {
        return 'nop';
      }
    }
  } catch (err) {
    return err;
  }
  addToZip(file, tmpFileDir, [FEED_INFO_FILE]);
  return 'edited';
}

module.exports = {
  /**
   * Sets gtfs feed id in gtfs zip
   */
  setFeedIdTask: destPath => {
    return through.obj(function (file, encoding, callback) {
      const gtfsFile = file.history[file.history.length - 1];
      const id = parseId(gtfsFile);
      process.stdout.write(
        gtfsFile + ' ' + 'Setting GTFS feed id to ' + id + '\n',
      );
      const action = setFeedId(gtfsFile, id);
      if (action !== 'edited') {
        process.stdout.write(
          `Something went wrong with editing feed id: ${action}\n`,
        );
        throw new Error('Failed to edit feed id for ' + id);
      }
      process.stdout.write(gtfsFile + ' ID ' + action + ' SUCCESS\n');
      const cmd = `cp ${gtfsFile} ${destPath}`;
      execSync(cmd, { stdio: [0, 1, 2] });
      // file.contents = cloneable(fs.createReadStream(gtfsFile));
      callback(null, null);
    });
  },
};
