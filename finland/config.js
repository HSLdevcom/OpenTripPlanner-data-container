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
  ],
  osm: ['finland', 'estonia'],
};
