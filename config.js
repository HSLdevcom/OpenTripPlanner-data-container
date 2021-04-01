
/*
 * id = feedid (String)
 * url = feed url (String)
 * fit = mapfit shapes (true/false)
 * rules = OBA Filter rules to apply (array of strings)
 * request options = optional special options for request
 */
const src = (id, url, fit, rules, requestOptions) => ({ id, url, fit, rules, requestOptions })

const HSL_CONFIG = {
  'id': 'hsl',
  'src': [
    src('HSL', 'https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip', false),
    src('HSLlautta', 'http://lautta.net/db/gtfs_pk/gtfs.zip', false)
  ],
  'osm': 'hsl',
  'dem': 'hsl'
}

const FINLAND_CONFIG = {
  'id': 'finland',
  'src': [
    src('HSL', 'https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip', false, ['router-finland/gtfs-rules/hsl.rule']),
    src('MATKA', 'https://gtfsdatav2.blob.core.windows.net/gtfsdata-blob/matka.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-finland/gtfs-rules/matka.rule', 'router-finland/gtfs-rules/matka-id.rule']),
    src('tampere', 'http://www.tampere.fi/ekstrat/ptdata/tamperefeed_deprecated.zip', false),
    src('LINKKI', 'https://tvv.fra1.digitaloceanspaces.com/209.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash'),
    src('lautta', 'http://lautta.net/db/gtfs/gtfs.zip', false),
    src('OULU', 'https://assets.oulunliikenne.fi/gtfs_google/google_transit.zip', false)
  ],
  'osm': 'finland'
}

const WALTTI_CONFIG = {

  'id': 'waltti',
  'src': [
    src('tampere', 'http://www.tampere.fi/ekstrat/ptdata/tamperefeed_linjasto2021.zip', false),
    src('TampereVR', 'https://rata.digitraffic.fi/api/v1/trains/gtfs-vr-tre.zip', false, undefined, { gzip: true }),
    src('tampereDRT', 'https://www.tampere.fi/ekstrat/ptdata/tamperefeed_kutsuliikenne.zip', false)
  ],
  'osm': 'finland',
  'dem': 'waltti'
}

let ALL_CONFIGS

const setCurrentConfig = (name) => {
  ALL_CONFIGS = [WALTTI_CONFIG, HSL_CONFIG, FINLAND_CONFIG].reduce((acc, nxt) => {
    if ((name && name.split(',').indexOf(nxt.id) !== -1) ||
      name === undefined) {
      acc.push(nxt)
    }
    return acc
  }, [])
}

// Allow limiting active configs with env variable
if (process.env.ROUTERS) {
  setCurrentConfig(process.env.ROUTERS.replace(/ /g, ''))
} else {
  setCurrentConfig()
}

// EXTRA_SRC format should be {"FOLI": {"url": "http://data.foli.fi/gtfs/gtfs.zip",  "fit": false, "rules": ["router-waltti/gtfs-rules/waltti.rule"], "routers": ["hsl", "finland"]}}
// but you can only define, for example, new url and the other key value pairs will remain the same as they are defined in this file. "routers" is always a mandatory field.
// It is also possible to add completely new src by defining object with unused id or to remove a src by defining "remove": true
const extraSrc = process.env.EXTRA_SRC !== undefined ? JSON.parse(process.env.EXTRA_SRC) : {}

let usedSrc = []
// add config to every source and override config values if they are defined in extraSrc
for (let i = 0; i < ALL_CONFIGS.length; i++) {
  const cfg = ALL_CONFIGS[i]
  const cfgSrc = cfg.src
  for (let j = cfgSrc.length - 1; j >= 0; j--) {
    const src = cfgSrc[j]
    const id = src.id
    if (extraSrc[id] && extraSrc[id].routers !== undefined && extraSrc[id].routers.includes(cfg.id)) {
      usedSrc.push(id)
      if (extraSrc[id].remove) {
        cfgSrc.splice(j, 1)
        continue
      }
      cfgSrc[j] = { ...src, ...extraSrc[src.id] }
    }
    cfgSrc[j].config = cfg
  }
}

// Go through extraSrc keys to find keys that don't already exist in src and add those as new src
Object.keys(extraSrc).forEach((id) => {
  if (!usedSrc.includes(id)) {
    const routers = extraSrc[id].routers
    for (let i = 0; i < ALL_CONFIGS.length; i++) {
      const cfg = ALL_CONFIGS[i]
      if (routers === undefined || routers.includes(cfg.id)) {
        cfg.src.push({ ...extraSrc[id], id })
      }
    }
  }
})

// create id->src-entry map
const configMap = ALL_CONFIGS.map(cfg => cfg.src)
  .reduce((acc, val) => acc.concat(val), [])
  .reduce((acc, val) => {
    if (acc[val.id] === undefined) {
      acc[val.id] = val
    }
    return acc
  }, {})

const osm = [
  { id: 'finland', url: 'https://karttapalvelu.storage.hsldev.com/finland.osm/finland.osm.pbf' },
  { id: 'hsl', url: 'https://karttapalvelu.storage.hsldev.com/hsl.osm/hsl.osm.pbf' }
]

const dem = [
  { id: 'waltti', url: 'https://elevdata.blob.core.windows.net/elevation/waltti/waltti-10m-elevation-model_20190927.tif' },
  { id: 'hsl', url: 'https://elevdata.blob.core.windows.net/elevation/hsl/hsl-10m-elevation-model_20190920.tif' }
]

const constants = {
  BUFFER_SIZE: 1024 * 1024 * 32
}

module.exports = {
  ALL_CONFIGS: () => ALL_CONFIGS,
  configMap,
  osm,
  osmMap: osm.reduce((acc, val) => { acc[val.id] = val; return acc }, {}),
  dem,
  demMap: dem.reduce((acc, val) => { acc[val.id] = val; return acc }, {}),
  dataToolImage: `hsldevcom/otp-data-tools:${process.env.TOOLS_TAG || 'latest'}`,
  dataDir: process.env.DATA || `${process.cwd()}/data`,
  hostDataDir: process.env.HOST_DATA || `${process.cwd()}/data`,
  setCurrentConfig: setCurrentConfig,
  constants
}
