const through = require('through2');
const Vinyl = require('vinyl');
const fs = require('fs');
const cloneable = require('cloneable-readable');
const { dataDir, storageDir } = require('../config');
const { dirNameToDate } = require('../util');
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

function createAndProcessBuildConfig(router) {
  process.stdout.write('copying build-config.json...\n');
  const configName = `${router.id}/build-config.json`;
  const buildConfig = JSON.parse(fs.readFileSync(configName, 'utf8'));
  const transitFeeds = buildConfig.transitFeeds || [];
  if (router.netex) {
    router.netex.forEach(src => {
      const feed = {
        type: 'netex',
        feedId: src.id,
        source: 'file:///var/opentripplanner/' + src.id + '-netex.zip',
        groupFilePattern: src.groupFilePattern,
        sharedFilePattern: src.sharedFilePattern,
      };
      transitFeeds.push(feed);
    });
    buildConfig.transitFeeds = transitFeeds;
  }
  const file = new Vinyl({
    path: 'build-config.json',
    contents: Buffer.from(JSON.stringify(buildConfig, null, 2)),
  });
  return file;
}

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
 * In the whole build case, all osm, dem, and gtfs data is fetched from the data directory.
 */
function prepareRouterData(router) {
  const stream = through.obj();

  process.stdout.write(
    'Collecting data and configuration files for graph build\n',
  );

  stream.push(createFile(router, 'otp-config.json', router.id));
  stream.push(createAndProcessBuildConfig(router));
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
  if (router.netex) {
    router.netex.forEach(src => {
      const name = src.id + '-netex.zip';
      stream.push(createFile(router, name, `${dataDir}/ready/netex`));
    });
  }
  stream.end();

  return stream;
}

/**
 * Make router data ready for the street only graph build in opentripplanner.
 * In the street only build case, only osm and dem data is fetched from the data directory, gtfs data is not fetched at all.
 */
function prepareRouterDataForStreetOnlyGraphBuild(router) {
  const stream = through.obj();

  process.stdout.write(
    'Collecting data and configuration files for street only graph build\n',
  );

  stream.push(createFile(router, 'otp-config.json', router.id));
  stream.push(createAndProcessBuildConfig(router));
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
  const directories = directoryContents.filter(element => {
    return fs.statSync(path + '/' + element).isDirectory();
  });
  return directories;
}

/**
 * Make router data ready for the graph build from prebuilt data in opentripplanner.
 * In the prebuilt build case, only gtfs data is fetched from the data directory,
 * osm and dem data, as well as the prebuilt streetGraph.obj file is fetched from the osm-builds directory.
 */
function prepareRouterDataForPrebuiltStreetGraphBuild(router) {
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
  if (router.netex) {
    router.netex.forEach(src => {
      const name = src.id + '-netex.zip';
      stream.push(createFile(router, name, `${dataDir}/ready/netex`));
    });
  }

  const osmDirectories = getDirectories(
    `${storageDir}/osm-builds/${process.env.DOCKER_TAG}`,
  );
  if (osmDirectories.length > 0) {
    osmDirectories.sort(
      (date1, date2) => dirNameToDate(date2) - dirNameToDate(date1),
    );
    global.osmPrebuildDir = `${storageDir}/osm-builds/${process.env.DOCKER_TAG}/${osmDirectories[0]}/${router.id}`;
    process.stdout.write(`Using OSM data from ${global.osmPrebuildDir} \n`);
    // This is needed for gtfs data fitting and seeding.
    router.osm.forEach(osmId => {
      const name = osmId + '.pbf';
      stream.push(createFile(router, name, global.osmPrebuildDir));
    });
    // This is needed for seeding.
    if (router.dem) {
      const name = router.dem + '.tif';
      stream.push(createFile(router, name, global.osmPrebuildDir));
    }
    // This is the prebuilt street graph.
    stream.push(createFile(router, 'streetGraph.obj', global.osmPrebuildDir));
  } else {
    throw new Error(`No OSM directories can be found!\n`);
  }

  stream.end();

  return stream;
}

module.exports = {
  prepareRouterData,
  prepareRouterDataForStreetOnlyGraphBuild,
  prepareRouterDataForPrebuiltStreetGraphBuild,
};
