const fs = require('fs');
const through = require('through2');
const parseOSM = require('osm-pbf-parser');

const map = {};
const nodePositions = {};
const referredNodes = {};

// some stats
let count = 0;
let wcount = 0;

function isBoardingLocation(tags) {
  // same as OTP's boarding location concept
  return (
    tags.highway === 'bus_stop' ||
    tags.railway === 'tram_stop' ||
    tags.railway === 'station' ||
    tags.railway === 'halt' ||
    tags.amenity === 'bus_station' ||
    tags.amenity === 'ferry_terminal' ||
    ((tags.public_transport === 'platform' || tags.railway === 'platform') &&
      tags.usage !== 'tourism')
  );
}

// first pass: find out which nodes are needed when computing way centers
function collectRefs(config, cb) {
  function refsFromOSM(i) {
    const osm = parseOSM();
    return fs
      .createReadStream(`${config.dataDir}/ready/osm/${config.osm[i].id}.pbf`)
      .pipe(osm)
      .pipe(
        through
          .obj(function (items, enc, next) {
            items.forEach(function (item) {
              const tags = item.tags;
              if (
                item.type === 'way' &&
                isBoardingLocation(tags) &&
                (tags.ref || tags['ref:findr'] || tags['ref:findt'])
              ) {
                item.refs.forEach(n => {
                  referredNodes[n] = true;
                });
              }
            });
            next();
          })
          .on('end', () => {
            if (i === config.osm.length - 1) {
              createMap(config, cb);
            } else {
              refsFromOSM(i + 1); // recurse to next OSM entry
            }
          }),
      )
      .resume();
  }
  return refsFromOSM(0);
}

// second pass: collect a map of OSM stop coordinates
function createMap(config, cb) {
  function mapFromOsm(i) {
    const osm = parseOSM();
    fs.createReadStream(`${config.dataDir}/ready/osm/${config.osm[i].id}.pbf`)
      .pipe(osm)
      .pipe(
        through.obj(function (items, enc, next) {
          items.forEach(function (item) {
            if (item.type === 'node' && referredNodes[item.id]) {
              // this node is needed later
              nodePositions[item.id] = [item.lat, item.lon];
            }
            const tags = item.tags;
            if (isBoardingLocation(tags)) {
              const ref = tags.ref || tags['ref:findr'] || tags['ref:findt'];
              if (ref) {
                let pos;
                if (item.type === 'node') {
                  pos = [item.lat, item.lon];
                } else if (item.type === 'way' && item.refs.length > 1) {
                  wcount++;
                  pos = [0, 0];
                  // do not sum the start and end point of a closed loop twice
                  const last =
                    item.refs[0] === item.refs[item.refs.length - 1]
                      ? item.refs.length - 1
                      : item.refs.length;
                  let i;
                  for (i = 0; i < last; i++) {
                    const n = item.refs[0];
                    if (nodePositions[n]) {
                      pos[0] += nodePositions[n][0];
                      pos[1] += nodePositions[n][1];
                    } else {
                      break; // bad data
                    }
                  }
                  if (i === last) {
                    pos[0] /= i;
                    pos[1] /= i;
                  } else {
                    pos = null;
                  }
                }
                if (pos) {
                  if (tags.ref && !map[tags.ref]) {
                    map[tags.ref] = pos;
                  }
                  if (tags['ref:findr'] && !map[tags['ref:findr']]) {
                    map[tags['ref:findr']] = pos;
                  }
                  if (tags['ref:findt'] && !map[tags['ref:findt']]) {
                    map[tags['ref:findt']] = pos;
                  }
                  count++;
                }
              }
            }
          });
          next();
        }),
      )
      .on('end', () => {
        if (i < config.osm.length - 1) {
          mapFromOsm(i + 1); // recurse to next OSM entry
        } else {
          console.log(
            'Number of ref mapped stops is ' +
              count +
              ', of which OSM ways ' +
              wcount,
          );
          config.fitMap = map;
          cb();
        }
      })
      .resume();
  }

  mapFromOsm(0);
}

module.exports = function (config) {
  return new Promise((resolve, reject) => {
    if (!config.router.gtfs.some(src => src.fit)) {
      resolve();
    }
    try {
      collectRefs(config, resolve);
    } catch (err) {
      reject(err);
    }
  });
};
