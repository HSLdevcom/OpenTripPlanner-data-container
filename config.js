const assert = require('assert')

// OBA filter erases files which it does not recognize from GTFS packages
// this array specifies the file names which should be preserved
const passOBAfilter = ['emissions.txt', 'translations.txt']

// matkahuolto data source often fails when accessed through digitransit proxy
// here we exceptionally set up direct calls with basic auth
let mhAddress
if (process.env.MH_BASIC_AUTH) {
  const basic = Buffer.from(process.env.MH_BASIC_AUTH, 'base64').toString('utf8')
  mhAddress = `https://${basic}@minfoapi.matkahuolto.fi/gtfs/kokomaa-fi/gtfs.zip`
} else {
  mhAddress = 'http://digitransit-proxy:8080/out/minfoapi.matkahuolto.fi/gtfs/kokomaa-fi/gtfs.zip'
}

assert(process.env.ROUTER_NAME !== undefined, 'ROUTER_NAME must be defined')

// Require router config from router directory
const router = require(`./${process.env.ROUTER_NAME}/config`)

// EXTRA_SRC format should be {"FOLI": {"url": "https://data.foli.fi/gtfs/gtfs.zip",  "fit": false, "rules": ["waltti/gtfs-rules/waltti.rule"]}}
// but you can only define, for example, new url and the other key value pairs will remain the same as they are defined in this file.
// It is also possible to add completely new src by defining object with unused id or to remove a src by defining "remove": true
const extraSrc = process.env.EXTRA_SRC !== undefined ? JSON.parse(process.env.EXTRA_SRC) : {}

const usedSrc = []

// override source values if they are defined in extraSrc
const rt = router
const sources = rt.src
for (let j = sources.length - 1; j >= 0; j--) {
  const src = sources[j]
  const id = src.id
  if (extraSrc[id]) {
    usedSrc.push(id)
    if (extraSrc[id].remove) {
      sources.splice(j, 1)
      continue
    }
    sources[j] = { ...src, ...extraSrc[id] }
  }
  sources[j].config = rt
}

// Go through extraSrc keys to find keys that don't already exist in src and add those as new src
Object.keys(extraSrc).forEach(id => {
  if (!usedSrc.includes(id)) {
    router.src.push({ ...extraSrc[id], id })
  }
})

// create id->src-entry map
const gtfsMap = {}
router.src.forEach(src => { gtfsMap[src.id] = src })

const extraOSM = process.env.EXTRA_OSM !== undefined ? JSON.parse(process.env.EXTRA_OSM) : {}

const osm = {
  estonia: 'https://download.geofabrik.de/europe/estonia-latest.osm.pbf',
  finland: 'https://karttapalvelu.storage.hsldev.com/finland.osm/finland.osm.pbf',
  hsl: 'https://karttapalvelu.storage.hsldev.com/hsl.osm/hsl.osm.pbf',
  kajaani: 'https://karttapalvelu.storage.hsldev.com/waltti.osm/kajaani.osm.pbf',
  oulu: 'https://karttapalvelu.storage.hsldev.com/waltti.osm/oulu.osm.pbf',
  pori: 'https://karttapalvelu.storage.hsldev.com/waltti.osm/pori.osm.pbf',
  rovaniemi: 'https://karttapalvelu.storage.hsldev.com/waltti.osm/rovaniemi.osm.pbf',
  southeastFinland: 'https://karttapalvelu.storage.hsldev.com/waltti.osm/southeast_finland.osm.pbf',
  southwestFinland: 'https://karttapalvelu.storage.hsldev.com/waltti.osm/southwest_finland.osm.pbf',
  vaasa: 'https://karttapalvelu.storage.hsldev.com/waltti.osm/vaasa.osm.pbf',
  varely: 'https://karttapalvelu.storage.hsldev.com/finland.osm/varely.osm.pbf',
  ...extraOSM
}

const dem = {
  waltti: 'https://elevdata.blob.core.windows.net/elevation/waltti/waltti-10m-elevation-model_20190927.tif',
  hsl: 'https://elevdata.blob.core.windows.net/elevation/hsl/hsl-10m-elevation-model_20190920.tif'
}

const constants = {
  BUFFER_SIZE: 1024 * 1024 * 32
}

module.exports = {
  router,
  gtfsMap,
  osm: router.osm.map(id => { return { id, url: osm[id] } }), // array of id, url pairs
  dem: router.dem ? [{ id: router.dem, url: dem[router.dem] }] : null, // currently only one DEM file is used
  dataToolImage: `hsldevcom/otp-data-tools:${process.env.TOOLS_TAG || 'v3'}`,
  dataDir: `${process.cwd()}/data`,
  storageDir: `${process.cwd()}/storage`,
  constants,
  passOBAfilter
}
