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
      'tampere',
      'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_mattersoft.zip',
    ),
  ],
  osm: ['oulu', 'southFinland'],
};
