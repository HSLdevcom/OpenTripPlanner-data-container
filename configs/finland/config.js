const { mapSrc } = require('../../src/utils/configUtils.js');

module.exports = {
  id: 'finland',
  gtfs: [
    mapSrc(
      'MATKA',
      'https://mobility.mobility-database.fintraffic.fi/static/Digitransit_main.zip',
      true,
    ),
    mapSrc(
      'flixbus',
      'https://mobility.mobility-database.fintraffic.fi/static/flixbus_only.zip',
    ),
    mapSrc(
      'Viro',
      'https://mobility.mobility-database.fintraffic.fi/static/viro.zip',
    ),
    mapSrc(
      'KirkkonummiE',
      'https://gtfsdata.blob.core.windows.net/hsl/hsl_flex_test1-gtfs.zip',
      false,
    ),
    mapSrc(
      'KirkkonummiP',
      'https://gtfsdata.blob.core.windows.net/hsl/hsl_flex_test2-gtfs.zip',
      false,
    ),
  ],
  carPickupZone: [
    {
      id: '02Taksi_carpickupzone',
      url: 'https://gtfsdata.blob.core.windows.net/finland/02Taksi-carpickupzone-gtfs.zip',
    },
  ],
  netex: [
    {
      id: 'VR_bussit',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/vr_bussit.zip',
      groupFilePattern: '(line)_.*\\.xml',
      sharedFilePattern: '_.*\\.xml',
    },
    {
      id: 'CAR_FERRIES',
      url: 'https://schedules.finferries.fi/export/netex.zip',
      groupFilePattern: '().*\\.xml',
    },
  ],
  osm: ['finland', 'estonia'],
};
