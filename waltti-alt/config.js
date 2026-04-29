const { mapSrc } = require('../util');

module.exports = {
  id: 'waltti-alt',
  src: [
    mapSrc('TurkuTrunkroutes', 'http://data-test.foli.fi/gtfs/gtfs.zip', true),
    mapSrc(
      'tampere',
      'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_mattersoft.zip',
      false,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    ),
    mapSrc(
      'digitraffic',
      'https://rata.digitraffic.fi/api/v1/trains/gtfs-passenger-stops.zip',
      false,
      undefined,
      undefined,
      {
        headers: {
          'Accept-Encoding': 'gzip',
          'Digitraffic-User': 'Digitransit/OTP-dataloading',
        },
      },
    ),
    mapSrc(
      'WalttiTest',
      'https://tvv.fra1.digitaloceanspaces.com/229.zip',
      'true',
    ),
  ],
  osm: ['oulu', 'southFinland'],
};
