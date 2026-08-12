const fs = require('fs');
const cloneable = require('cloneable-readable');
const converter = require('json-2-csv');
const through = require('through2');
// const cloneable = require('cloneable-readable');
const { postSlackMessage, parseId } = require('../util');
const { dataDir } = require('../config.js');
const logger = require('../logger');

function createFeedInfo(file, id) {
  logger.info(`Generating new feed_info for ${id}`);
  const csv = `feed_publisher_name,feed_publisher_url,feed_lang,feed_id
${id}-fake-name,${id}-fake-url,${id}-fake-lang,${id}\n`;
  fs.writeFileSync(file, csv);
}

function setFeedId(file, id) {
  try {
    if (!fs.existsSync(file)) {
      createFeedInfo(file, id);
    } else {
      const data = fs.readFileSync(file, {
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
            const msg = `GTFS data for ${id} is older than 8 hours`;
            // send warning also to slack between monday and friday
            const day = now.getDay();
            if (day !== 1) {
              postSlackMessage(`${msg} :boom:`, 'warn');
            } else {
              logger.warn(msg);
            }
          }
        }
        // no id or id is wrong
        if (json[0].feed_id === undefined || json[0].feed_id !== id) {
          json[0].feed_id = id;
          const csv = converter.json2csv(json);
          fs.writeFileSync(file, csv);
        } else {
          logger.info('Correct feed id was already set');
          return 'ok';
        }
      } else {
        createFeedInfo(file, id);
      }
    }
  } catch (err) {
    return err;
  }
  return 'ok';
}

module.exports = {
  /**
   * Sets gtfs feed id into feed_info.txt
   */
  setFeedIdTask: () => {
    return through.obj(function (file, encoding, callback) {
      const gtfsFile = file.history[file.history.length - 1];
      const id = parseId(gtfsFile);
      const infoFile = `${dataDir}/tmp/${id}/feed_info.txt`;

      logger.info(`${gtfsFile} setting GTFS feed id to ${id}`);
      const action = setFeedId(infoFile, id);
      if (action !== 'ok') {
        logger.error(`Feed id editing failed: ${action}`);
        throw new Error(`Failed to edit feed id for ${id}`);
      }
      logger.info(`${gtfsFile} feed id SUCCESS`);
      file.contents = cloneable(fs.createReadStream(gtfsFile));
      callback(null, file);
    });
  },
};
