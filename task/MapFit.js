const through = require('through2');
const fs = require('fs');
const csvParser = require('csv-parser');
const cloneable = require('cloneable-readable');
const removeBOM = require('remove-bom-stream');
const { parseId } = require('../util');
const { stringify } = require('csv-stringify');
const { dataDir } = require('../config.js');

const limit = 200; // do not fit if distance is more than this many meters

// The radius of the earth.
const radius = 6371000;
const dr = Math.PI / 180; // degree to radian

function distance(a, b) {
  const lat1 = a[0] * dr;
  const lat2 = b[0] * dr;
  const sinDLat = Math.sin((b[0] - a[0]) * dr * 0.5);
  const sinDLon = Math.sin((b[1] - a[1]) * dr * 0.5);
  const r =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(r), Math.sqrt(1 - r));
  return radius * c;
}

function readHeader(fileName) {
  return new Promise(resolve => {
    const readStream = fs.createReadStream(fileName);
    readStream
      .pipe(removeBOM('utf-8'))
      .pipe(csvParser())
      .on('headers', headers => {
        readStream.destroy();
        resolve(headers);
      });
  });
}

function fitStopCoordinates(map, stats) {
  return through.obj(function (stop, enc, next) {
    const id = stop.stop_id;
    // koontikanta uses x_<digiroad-ref> like gtfs ids, strip the prefix
    const noprefix = id.slice(id.indexOf('_') + 1);
    for (const k of [id, stop.stop_code, noprefix]) {
      if (k === undefined) {
        continue;
      }
      const osmPos = map[k];
      if (osmPos && stop.stop_lat && stop.stop_lon) {
        const dist = distance(osmPos, [stop.stop_lat, stop.stop_lon]);
        if (dist > stats.maxDist) stats.maxDist = dist;
        if (dist < limit) {
          stats.fitted++;
          stats.dsum += dist;
          stop.stop_lat = osmPos[0];
          stop.stop_lon = osmPos[1];
          break;
        } else {
          stats.bad++;
        }
      }
    }
    next(null, stop);
  });
}

function transformStops(folder, map, cb) {
  const fileName = `${folder}/stops.txt`;
  const result = `${folder}/transformed_stops.txt`;
  const stats = {
    bad: 0,
    fitted: 0,
    dsum: 0,
    maxDist: 0,
  };

  readHeader(fileName).then(headers => {
    const stringifier = stringify({ header: true, columns: headers });

    fs.createReadStream(fileName)
      .pipe(removeBOM('utf-8'))
      .pipe(csvParser())
      .pipe(fitStopCoordinates(map, stats))
      .pipe(stringifier)
      .pipe(fs.createWriteStream(result))
      .on('finish', () => {
        fs.copyFileSync(result, fileName);
        process.stdout.write(
          `Fitted ${stats.fitted} stops, skipped ${stats.bad} bad fits\n`,
        );
        if (stats.fitted) {
          process.stdout.write(
            `Average fit distance ${stats.dsum / stats.fitted}, max distance ${stats.maxDist}\n`,
          );
        }
        cb();
      });
  });
}

module.exports = function mapFit(config) {
  return through.obj((file, encoding, callback) => {
    const gtfsFile = file.history[file.history.length - 1];
    const id = parseId(gtfsFile);
    const folder = `${dataDir}/tmp/${id}`;
    const source = config.gtfsMap[id];

    if (!source.fit) {
      process.stdout.write(gtfsFile + ' fit disabled\n');
      callback(null, file);
      return;
    }
    if (!config.fitMap) {
      process.stdout.write(
        `PrepareFit task not run before fitting, skipping ${gtfsFile} map fit\n`,
      );
      callback(null, file);
      return;
    }

    process.stdout.write(`Fitting ${gtfsFile} to OSM stop locations ...\n`);
    transformStops(folder, config.fitMap, () => {
      process.stdout.write(gtfsFile + ' fit SUCCESS\n');
      file.contents = cloneable(fs.createReadStream(gtfsFile));
      callback(null, file);
    });
  });
};
