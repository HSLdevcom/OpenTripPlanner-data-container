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
      'OULU',
      'https://tvv.fra1.digitaloceanspaces.com/229.zip',
      true,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    ),
    mapSrc(
      'Pori',
      'https://tvv.fra1.digitaloceanspaces.com/231.zip',
      true,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    ),
  ],
  osm: ['oulu', 'southFinland'],
};
