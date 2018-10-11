
/*
 * id = feedid (String)
 * url = feed url (String)
 * fit = mapfit shapes (true/false)
 * rules = OBA Filter rules to apply (array of strings)
 */
const src = (id,url,fit,rules) => ({id,url,fit,rules});

const HSL_CONFIG = {
  'id':'hsl',
  'src': [
    src('HSL','http://dev.hsl.fi/gtfs/hsl.zip', false)
  ],
  'osm':'hsl',
};

const FINLAND_CONFIG = {
  'id':'finland',
  'src': [
    src('HSL','http://dev.hsl.fi/gtfs/hsl.zip', false),
    src('MATKA','http://dev.hsl.fi/gtfs.matka/matka.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-finland/gtfs-rules/matka.rule','router-finland/gtfs-rules/matka-id.rule' ]),
    src('tampere','http://tampere.fi/ekstrat/ptdata/tamperefeed.zip', false),
    src('LINKKI','http://jakoon.jkl.fi/reittiopas/datajkl.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash'),
    src('lautta','http://lautta.net/db/gtfs/gtfs.zip', false),
    src('OULU','http://www.transitdata.fi/oulu/google_transit.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash'),
  ],
  'osm':'finland',
};

const WALTTI_CONFIG = {

  'id':'waltti',
  'src': [
    src('Hameenlinna','http://dev.hsl.fi/gtfs.waltti/hameenlinna.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('Kajaani','http://dev.hsl.fi/gtfs.waltti/kajaani.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('Kotka','http://dev.hsl.fi/gtfs.waltti/kotka.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('Kouvola','http://dev.hsl.fi/gtfs.waltti/kvl.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('Lappeenranta','http://dev.hsl.fi/gtfs.waltti/lappeenranta.zip','gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('Mikkeli','http://dev.hsl.fi/gtfs.waltti/mikkeli.zip','gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('PohjoisPohjanmaanEly','http://dev.hsl.fi/gtfs.waltti/pohjois-pohjanmaan_ely.zip','gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('IisalmiEly','http://dev.hsl.fi/gtfs.waltti/posely_iisalmi.zip','gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('MikkeliEly','http://dev.hsl.fi/gtfs.waltti/posely_mikkeli.zip','gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('Vaasa','http://dev.hsl.fi/gtfs.waltti/vaasa.zip','gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('Joensuu', 'http://dev.hsl.fi/gtfs.waltti/joensuu.zip','gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('JoensuuEly', 'http://dev.hsl.fi/gtfs.waltti/posely_joensuu.zip','gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('FOLI', 'http://data.foli.fi/gtfs/gtfs.zip', false, ['router-waltti/gtfs-rules/waltti.rule']),
    src('Lahti', 'http://www.lsl.fi/assets/uploads/google_transit.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('Kuopio', 'http://dev.hsl.fi/gtfs.waltti/kuopio.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
    src('OULU','http://www.transitdata.fi/oulu/google_transit.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash'),
    src('LINKKI','http://jakoon.jkl.fi/reittiopas/datajkl.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash'),
    src('tampere', 'http://tampere.fi/ekstrat/ptdata/tamperefeed.zip', false),
    src('Rovaniemi', 'http://dev.hsl.fi/gtfs.waltti/rovaniemi.zip', 'gtfs_shape_mapfit/fit_gtfs_stops.bash', ['router-waltti/gtfs-rules/waltti.rule']),
  ],
  'osm':'finland',
};

let ALL_CONFIGS;

const setCurrentConfig = (name) => {
  ALL_CONFIGS = [WALTTI_CONFIG, HSL_CONFIG, FINLAND_CONFIG].reduce((acc,nxt) => {
    if((name && name.split(',').indexOf(nxt.id)!=-1)
      || name===undefined) {
      acc.push(nxt);
    }
    return acc;
  },[]);
};

//Allow limiting active configs with env variable
if (process.env.ROUTERS) {
  setCurrentConfig(process.env.ROUTERS.replace(/ /g,''));
} else {
  setCurrentConfig();
}

//add config to every source
ALL_CONFIGS.forEach(cfg => cfg.src.forEach(src => src.config=cfg));

// create id->src-entry map
const configMap=ALL_CONFIGS.map(cfg => cfg.src)
  .reduce((acc, val) => acc.concat(val), [])
  .reduce((acc, val) => {
    if(acc[val.id]===undefined) {
      acc[val.id] = val;
    }
    return acc;
  },{});

const osm = [
  {id:'finland',url: 'http://dev.hsl.fi/osm.finland/finland.osm.pbf'},
  {id:'hsl', url: 'http://dev.hsl.fi/osm.hsl/hsl.osm.pbf'}
];

const constants = {
  BUFFER_SIZE:1024*1024*32
};

module.exports={
  ALL_CONFIGS: () => ALL_CONFIGS,
  configMap,
  osm,
  osmUrls:osm.map(e => e.url),
  osmMap:osm.reduce((acc,val) => {acc[val.id]=val; return acc;},{}),
  dataToolImage: `hsldevcom/otp-data-tools:${process.env.TOOLS_TAG || 'latest'}`,
  dataDir: process.env.DATA || `${process.cwd()}/data`,
  hostDataDir: process.env.HOST_DATA || `${process.cwd()}/data`,
  setCurrentConfig: setCurrentConfig,
  constants
};
