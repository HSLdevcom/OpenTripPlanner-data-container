const { mapSrc } = require('../util');

module.exports = {
  id: 'finland',
  src: [
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
      'CAR_FERRIES',
      'https://mobility.mobility-database.fintraffic.fi/static/ferries_cars.zip',
      true,
    ),
    mapSrc(
      'Viro',
      'https://mobility.mobility-database.fintraffic.fi/static/viro.zip',
    ),
    mapSrc(
      '02Taksi',
      'https://resources.02taksi.fi/digitransit_02_taksi.zip',
      false,
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
  osm: ['finland', 'estonia'],
};
