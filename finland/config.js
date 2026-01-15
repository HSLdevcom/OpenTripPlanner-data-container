const { mapSrc } = require('../util');

module.exports = {
  id: 'finland',
  src: [
    mapSrc(
      'MATKA',
      'https://mobility.mobility-database.fintraffic.fi/static/finland_gtfs.zip',
      true,
    ),
    mapSrc(
      '02Taksi',
      'https://resources.02taksi.fi/digitransit_02_taksi.zip',
      false,
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
