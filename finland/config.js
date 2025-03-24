const { mapSrc } = require('../util');

module.exports = {
  id: 'finland',
  src: [
    mapSrc(
      'MATKA',
      'https://mobility.mobility-database.fintraffic.fi/static/finland_gtfs.zip',
      true,
    ),
  ],
  osm: ['finland', 'estonia'],
};
