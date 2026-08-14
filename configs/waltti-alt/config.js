const mapSrc = require('../../src/utils/configUtils.js');

module.exports = {
  id: 'waltti-alt',
  gtfs: [
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
      'https://github.com/tvv-lippu-ja-maksujarjestelma-oy/waltti-digitransit-config-data/raw/refs/heads/main/GTFStestireittiopas.zip',
      'true',
    ),
  ],
  carPickupZone: [
    mapSrc(
      '02Taksi_carpickupzone',
      'https://gtfsdata.blob.core.windows.net/finland/02Taksi-carpickupzone-gtfs.zip',
    ),
  ],
  osm: ['oulu', 'southFinland'],
};
