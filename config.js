/*
 * id = feedid (String)
 * url = feed url (String)
 * fit = mapfit shapes (true/falsy)
 * rules = OBA Filter rules to apply (array of strings or undefined)
 * replacements = replace or remove file from gtfs package (format: {'file_to_replace': 'file_to_replace_with' or null})
 * request options = optional special options for request
 */
const mapSrc = (id, url, fit, rules, replacements, request) => ({ id, url, fit, rules, replacements, request })

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

const routers = {
  hsl: {
    id: 'hsl',
    src: [
      mapSrc('HSL', 'https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip', false, undefined, { 'trips.txt': 'trips2.txt' }),
      // mapSrc('HSLlautta', 'https://koontikartta.navici.com/tiedostot/gtfs_lautat_digitransit.zip')
      // src('Sipoo', 'https://koontikartta.navici.com/tiedostot/rae/sipoon_kunta_sibbo_kommun.zip')
    ],
    osm: ['hsl'],
    dem: 'hsl'
  },

  finland: {
    id: 'finland',
    src: [
      mapSrc('HSL', 'https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip', false, ['finland/gtfs-rules/hsl-no-trains.rule'], { 'trips.txt': 'trips2.txt' }),
      mapSrc('MATKA', 'https://koontikartta.navici.com/tiedostot/gtfs_digitransit.zip', true, ['finland/gtfs-rules/matka-cleaned.rule']),
      mapSrc('tampere', 'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_deprecated.zip'),
      mapSrc('LINKKI', 'https://tvv.fra1.digitaloceanspaces.com/209.zip', true),
      mapSrc('OULU', 'https://tvv.fra1.digitaloceanspaces.com/229.zip'),
      mapSrc('digitraffic', 'https://rata.digitraffic.fi/api/v1/trains/gtfs-passenger-stops.zip', false, undefined, undefined, { headers: { 'Accept-Encoding': 'gzip', 'Digitraffic-User': 'Digitransit/OTP-dataloading' } }),
      mapSrc('Rauma', 'http://digitransit-proxy:8080/out/raumaadmin.mattersoft.fi/feeds/233.zip'),
      mapSrc('Hameenlinna', 'https://tvv.fra1.digitaloceanspaces.com/203.zip', true),
      mapSrc('Kotka', 'https://tvv.fra1.digitaloceanspaces.com/217.zip', true),
      mapSrc('Kouvola', 'https://tvv.fra1.digitaloceanspaces.com/219.zip', true),
      mapSrc('Lappeenranta', 'https://tvv.fra1.digitaloceanspaces.com/225.zip', true),
      mapSrc('Mikkeli', 'https://tvv.fra1.digitaloceanspaces.com/227.zip', true),
      mapSrc('Vaasa', 'https://tvv.fra1.digitaloceanspaces.com/249.zip', true),
      mapSrc('Joensuu', 'https://tvv.fra1.digitaloceanspaces.com/207.zip', true),
      mapSrc('FOLI', 'https://data.foli.fi/gtfs/gtfs.zip'),
      mapSrc('Lahti', 'https://tvv.fra1.digitaloceanspaces.com/223.zip', true),
      mapSrc('Kuopio', 'https://karttapalvelu.kuopio.fi/google_transit/google_transit.zip'),
      mapSrc('Rovaniemi', 'https://tvv.fra1.digitaloceanspaces.com/237.zip', true),
      mapSrc('Kajaani', 'https://tvv.fra1.digitaloceanspaces.com/211.zip', true),
      mapSrc('Salo', 'https://tvv.fra1.digitaloceanspaces.com/239.zip', true),
      mapSrc('Pori', 'https://tvv.fra1.digitaloceanspaces.com/231.zip', true),
      mapSrc('Viro', 'https://peatus.ee/gtfs/gtfs.zip'),
      mapSrc('Vikingline', 'https://fgwgtfsprod.blob.core.windows.net/gtfsout/latest_VIKINGLINE.zip'),
      mapSrc('Raasepori', 'https://tvv.fra1.digitaloceanspaces.com/232.zip', true),
      mapSrc('VARELY', 'http://digitransit-proxy:8080/out/varelyadmin.mattersoft.fi/feeds/102.zip', false),
      mapSrc('Harma', 'https://harmanliikenne.bussikaista.fi/sites/harma/files/gtfs/export/latest.zip', true),
      mapSrc('PohjolanMatka', 'https://minfoapi.matkahuolto.fi/gtfs/458/gtfs.zip', true),
      mapSrc('Korsisaari','https://minfoapi.matkahuolto.fi/gtfs/036/gtfs.zip', true)
    ],
    osm: ['finland', 'estonia']
  },

  waltti: {
    id: 'waltti',
    src: [
      mapSrc('Hameenlinna', 'https://tvv.fra1.digitaloceanspaces.com/203.zip', true),
      mapSrc('Kotka', 'https://tvv.fra1.digitaloceanspaces.com/217.zip', true),
      mapSrc('Kouvola', 'https://tvv.fra1.digitaloceanspaces.com/219.zip', true),
      mapSrc('Lappeenranta', 'https://tvv.fra1.digitaloceanspaces.com/225.zip', true),
      mapSrc('Mikkeli', 'https://tvv.fra1.digitaloceanspaces.com/227.zip', true),
      mapSrc('Vaasa', 'https://tvv.fra1.digitaloceanspaces.com/249.zip', true),
      mapSrc('Joensuu', 'https://tvv.fra1.digitaloceanspaces.com/207.zip', true),
      mapSrc('FOLI', 'https://data.foli.fi/gtfs/gtfs.zip'),
      mapSrc('Lahti', 'https://tvv.fra1.digitaloceanspaces.com/223.zip', true),
      mapSrc('Kuopio', 'https://karttapalvelu.kuopio.fi/google_transit/google_transit.zip'),
      mapSrc('OULU', 'https://tvv.fra1.digitaloceanspaces.com/229.zip'),
      mapSrc('LINKKI', 'https://tvv.fra1.digitaloceanspaces.com/209.zip', true),
      mapSrc('tampere', 'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_deprecated.zip'),
      mapSrc('Rovaniemi', 'https://tvv.fra1.digitaloceanspaces.com/237.zip', true),
      mapSrc('digitraffic', 'https://rata.digitraffic.fi/api/v1/trains/gtfs-passenger-stops.zip', false, undefined, undefined, { headers: { 'Accept-Encoding': 'gzip', 'Digitraffic-User': 'Digitransit/OTP-dataloading' } }),
      mapSrc('tampereDRT', 'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_kutsuliikenne.zip'),
      mapSrc('Pori', 'https://tvv.fra1.digitaloceanspaces.com/231.zip', true),
      mapSrc('FUNI', 'https://foligtfs.blob.core.windows.net/routeplanner/gtfs-foli-ff.zip', true),
      mapSrc('Raasepori', 'https://tvv.fra1.digitaloceanspaces.com/232.zip', true),
      // mapSrc('KotkaLautat', 'https://koontikartta.navici.com/tiedostot/gtfs_lautat.zip', true, ['waltti/gtfs-rules/only-kotka-ferries.rule']),
    ],
    osm: ['finland'],
    dem: 'waltti'
  },

  'waltti-alt': {
    id: 'waltti-alt',
    src: [
      mapSrc('Salo', 'https://tvv.fra1.digitaloceanspaces.com/239.zip', true),
      mapSrc('Kajaani', 'https://tvv.fra1.digitaloceanspaces.com/211.zip', true)
    ],
    osm: ['finland']
  },

  varely: {
    id: 'varely',
    src: [
      mapSrc('VARELY', 'http://digitransit-proxy:8080/out/varelyadmin.mattersoft.fi/feeds/102.zip'),
      mapSrc('FOLI', 'https://data.foli.fi/gtfs/gtfs.zip'),
      mapSrc('Rauma', 'http://digitransit-proxy:8080/out/raumaadmin.mattersoft.fi/feeds/233.zip')
    ],
    osm: ['finland']
  },

  kela: {
    id: 'kela',
    src: [
      mapSrc('kela', 'https://koontikartta.navici.com/tiedostot/gtfs_kela.zip'),
      mapSrc('matkahuolto', mhAddress, false, ['kela/gtfs-rules/matkahuolto.rule'], { 'transfers.txt': null }),
      mapSrc('lansilinjat', 'https://lansilinjat.fi/wp-content/uploads/GTFS-Lansilinjat.zip')
    ],
    osm: ['finland']
  }
}

if (!process.env.ROUTER_NAME || !routers[process.env.ROUTER_NAME]) {
  process.stdout.write('Invalid ROUTER_NAME variable \n')
  process.exit(1)
}
const router = routers[process.env.ROUTER_NAME]

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
  finland: 'https://karttapalvelu.storage.hsldev.com/finland.osm/finland.osm.pbf',
  hsl: 'https://karttapalvelu.storage.hsldev.com/hsl.osm/hsl.osm.pbf',
  estonia: 'https://download.geofabrik.de/europe/estonia-latest.osm.pbf',
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
