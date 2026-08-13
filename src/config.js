const assert = require('assert');
const path = require('path');

// OBA filter erases files which it does not recognize from GTFS packages
// this array specifies the file names which should be preserved
const passOBAfilter = ['emissions.txt', 'translations.txt'];

assert(process.env.ROUTER_NAME !== undefined, 'ROUTER_NAME must be defined');

// Absolute, __dirname-based paths so these resolve correctly regardless of the
// process's current working directory.
const configsDir = path.resolve(__dirname, '../configs');
const logbackConfigPath = path.resolve(
  __dirname,
  'logback-include-extensions.xml',
);

// Require router config from router directory
const router = require(
  path.join(configsDir, process.env.ROUTER_NAME, 'config'),
);

// EXTRA_SRC format should be {"FOLI": {"url": "https://data.foli.fi/gtfs/gtfs.zip",  "fit": false, "rules": ["waltti/gtfs-rules/waltti.rule"]}}
// but you can only define, for example, new url and the other key value pairs will remain the same as they are defined in this file.
// It is also possible to add completely new gtfs entry by defining object with unused id or to remove one by defining "remove": true
const extraSrc =
  process.env.EXTRA_SRC !== undefined ? JSON.parse(process.env.EXTRA_SRC) : {};

const SPLIT_BUILD_TYPE = process.env.SPLIT_BUILD_TYPE || 'NO_SPLIT_BUILD';

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// override gtfs entries that are defined in extraSrc
const overriddenGtfsIds = [];
for (let j = router.gtfs.length - 1; j >= 0; j--) {
  const src = router.gtfs[j];
  const id = src.id;
  if (extraSrc[id]) {
    overriddenGtfsIds.push(id);
    if (extraSrc[id].remove) {
      router.gtfs.splice(j, 1);
      continue;
    }
    router.gtfs[j] = { ...src, ...extraSrc[id] };
  }
}

// Go through extraSrc keys to find keys that don't already exist in gtfs and add those as new entries
Object.keys(extraSrc).forEach(id => {
  if (!overriddenGtfsIds.includes(id)) {
    router.gtfs.push({ ...extraSrc[id], id });
  }
});

// create id->gtfs-entry map
const gtfsMap = {};
router.gtfs.forEach(src => {
  gtfsMap[src.id] = src;
});

const extraOSM =
  process.env.EXTRA_OSM !== undefined ? JSON.parse(process.env.EXTRA_OSM) : {};

const osm = {
  estonia: 'https://download.geofabrik.de/europe/estonia-latest.osm.pbf',
  finland:
    'https://karttapalvelu.storage.hsldev.com/finland.osm/finland.osm.pbf',
  hsl: 'https://karttapalvelu.storage.hsldev.com/hsl.osm/hsl.osm.pbf',
  kajaani:
    'https://karttapalvelu.storage.hsldev.com/waltti.osm/kajaani.osm.pbf',
  oulu: 'https://karttapalvelu.storage.hsldev.com/waltti.osm/oulu.osm.pbf',
  rovaniemi:
    'https://karttapalvelu.storage.hsldev.com/waltti.osm/rovaniemi.osm.pbf',
  southFinland:
    'https://karttapalvelu.storage.hsldev.com/waltti.osm/south_finland.osm.pbf',
  vaasa: 'https://karttapalvelu.storage.hsldev.com/waltti.osm/vaasa.osm.pbf',
  varely: 'https://karttapalvelu.storage.hsldev.com/finland.osm/varely.osm.pbf',
  ...extraOSM,
};

const dem = {
  waltti:
    'https://elevdata.blob.core.windows.net/elevation/waltti/waltti-10m-elevation-model_20190927.tif',
  hsl: 'https://elevdata.blob.core.windows.net/elevation/hsl/hsl-10m-elevation-model_20190920.tif',
};

const constants = {
  BUFFER_SIZE: 1024 * 1024 * 32,
};

module.exports = {
  router,
  gtfsMap,
  osm: router.osm.map(id => {
    return { id, url: osm[id] };
  }), // array of id, url (OSM data) pairs
  dem: router.dem ? [{ id: router.dem, url: dem[router.dem] }] : null, // currently only one DEM file is used
  dataToolImage: `hsldevcom/otp-data-tools:${process.env.TOOLS_TAG || 'v3'}`,
  dataDir: `${process.cwd()}/data`,
  storageDir: `${process.cwd()}/storage`,
  configsDir,
  logbackConfigPath,
  constants,
  passOBAfilter,
  SPLIT_BUILD_TYPE,
  timezone,
};
