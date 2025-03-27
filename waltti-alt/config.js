const { mapSrc } = require('../util');

module.exports = {
  id: 'waltti-alt',
  src: [
    mapSrc(
      'WalttiTest',
      'http://digitransit-proxy:8080/out/lmjadmin.mattersoft.fi/feeds/229.zip',
      true,
    ),
    mapSrc('TurkuTrunkroutes', 'http://data-test.foli.fi/gtfs/gtfs.zip', true),
    mapSrc(
      'Lahti',
      'https://www.lsl.fi/tiedostot/testidata',
      true,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
      {
        headers: {
          insecureHTTPParser: true,
        },
      },
    ),
    mapSrc(
      'tampere',
      'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_mattersoft.zip',
    ),
  ],
  osm: ['oulu', 'southFinland'],
};
