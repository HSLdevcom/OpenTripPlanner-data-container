const through = require('through2');
const Vinyl = require('vinyl');
const fs = require('fs');
const cloneable = require('cloneable-readable');
const { dataDir, storageDir } = require('../config');
const assert = require('assert');

function createFile(config, fileName, sourcePath) {
  process.stdout.write(`copying ${fileName}...\n`);
  return new Vinyl({
    path: fileName,
    contents: cloneable(fs.createReadStream(`${sourcePath}/${fileName}`)),
  });
}

// EXTRA_UPDATERS format should be {"turku-alerts": {"type": "real-time-alerts", "frequencySec": 30, "url": "https://foli-beta.nanona.fi/gtfs-rt/reittiopas", "feedId": "FOLI", "fuzzyTripMatching": true}}
// but you can only define, for example, new url and the other key value pairs will remain the same as they are defined in this file.
// It is also possible to add completely new src by defining object with unused id or to remove a src by defining "remove": true
const extraUpdaters =
  process.env.EXTRA_UPDATERS !== undefined
    ? JSON.parse(process.env.EXTRA_UPDATERS)
    : {};

// Prepares router-config.json data for opentripplanner and applies edits/additions made in EXTRA_UPDATERS env var
function createAndProcessRouterConfig(router) {
  process.stdout.write('copying router-config.json...\n');
  const configName = `${router.id}/router-config.json`;
  const routerConfig = JSON.parse(fs.readFileSync(configName, 'utf8'));
  const updaters = routerConfig.updaters;
  const usedPatches = [];
  for (let i = updaters.length - 1; i >= 0; i--) {
    const updaterId = updaters[i].id;
    const updaterPatch = extraUpdaters[updaterId];
    if (updaterPatch !== undefined) {
      if (updaterPatch.remove === true) {
        updaters.splice(i, 1);
      } else {
        const mergedUpdaters = { ...updaters[i], ...updaterPatch };
        delete mergedUpdaters.remove;
        updaters[i] = mergedUpdaters;
      }
      usedPatches.push(updaterId);
    }
  }
  Object.keys(extraUpdaters).forEach(id => {
    if (!usedPatches.includes(id)) {
      const patchClone = Object.assign({}, extraUpdaters[id]);
      delete patchClone.remove;
      updaters.push({ ...patchClone, id });
    }
  });
  const file = new Vinyl({
    path: 'router-config.json',
    contents: Buffer.from(JSON.stringify(routerConfig, null, 2)),
  });
  return file;
}

/**
 * Make router data ready for inclusion in opentripplanner.
 */
function prepareRouterData(router) {
  const stream = through.obj();

  process.stdout.write(
    'Collecting data and configuration files for graph build\n',
  );

  stream.push(createFile(router, 'build-config.json', router.id));
  stream.push(createFile(router, 'otp-config.json', router.id));
  stream.push(createAndProcessRouterConfig(router));
  router.osm.forEach(osmId => {
    const name = osmId + '.pbf';
    stream.push(createFile(router, name, `${dataDir}/ready/osm`));
  });
  if (router.dem) {
    const name = router.dem + '.tif';
    stream.push(createFile(router, name, `${dataDir}/ready/dem`));
  }
  router.src.forEach(src => {
    const name = src.id + '-gtfs.zip';
    stream.push(createFile(router, name, `${dataDir}/ready/gtfs`));
  });
  stream.end();

  return stream;
}

/**
 * Make router data ready for the street only graph build in opentripplanner.
 */
function prepareRouterDataForOnlyStreetGraphBuild (router) {
  const stream = through.obj();

  process.stdout.write(
    'Collecting data and configuration files for only street graph build\n',
  );

  stream.push(createFile(router, 'build-config.json', router.id));
  stream.push(createFile(router, 'otp-config.json', router.id));
  stream.push(createAndProcessRouterConfig(router));
  router.osm.forEach(osmId => {
    const name = osmId + '.pbf';
    stream.push(createFile(router, name, `${dataDir}/ready/osm`));
  });
  if (router.dem) {
    const name = router.dem + '.tif';
    stream.push(createFile(router, name, `${dataDir}/ready/dem`));
  }
  stream.end();

  return stream;
}

function getDirectories(path) {
  const directoryContents = fs.readdirSync(path);
  const directories = directoryContents.filter((element) => {
    return fs.statSync(path + '/' + element).isDirectory();
  })
  return directories;
}

/**
 * Make router data ready for the street only graph build in opentripplanner.
 */
function prepareRouterDataForPrebuiltStreetGraphBuild (router) {
  // check environmental variables which needs to be defined
  assert(process.env.DOCKER_TAG !== undefined, 'DOCKER_TAG must be defined');
  
  const stream = through.obj();

  process.stdout.write(
    'Collecting data and configuration files for graph build based on prebuilt street graph data\n',
  );

  stream.push(createFile(router, 'build-config.json', router.id));
  stream.push(createFile(router, 'otp-config.json', router.id));
  stream.push(createAndProcessRouterConfig(router));
  router.src.forEach(src => {
    const name = src.id + '-gtfs.zip';
    stream.push(createFile(router, name, `${dataDir}/ready/gtfs`));
  });

  const osmDirectories = getDirectories(`${storageDir}/osm-builds/${process.env.DOCKER_TAG}`);
  if (osmDirectories.length > 0) {
    osmDirectories.sort((date1, date2) => new Date(date2.replace(/./g, ':')) - new Date(date1.replace(/./g, ':')));
    const osmPath = `${storageDir}/osm-builds/${process.env.DOCKER_TAG}/${osmDirectories[0]}/${router.id}`;
    process.stdout.write(
      `Using OSM data from ${osmPath} \n`,
    );
    stream.push(createFile(router, 'streetGraph.obj', osmPath));
  } else {
    throw new Error(`No OSM directories can be found exist!\n`)
  }
  
  stream.end();

  return stream;
}


module.exports = {
  prepareRouterData,
  prepareRouterDataForOnlyStreetGraphBuild,
  prepareRouterDataForPrebuiltStreetGraphBuild,
};
