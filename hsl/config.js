const { mapSrc } = require('../util');

module.exports = {
  id: 'hsl',
  src: [
    mapSrc(
      'HSL',
      'https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip',
      false,
      undefined,
      { 'trips.txt': 'trips2.txt' },
    ),
    mapSrc(
      'HSLlautta',
      'https://mobility.mobility-database.fintraffic.fi/static/lautat_new.zip',
    ),
    mapSrc(
      '02Taksi',
      'https://resources.02taksi.fi/digitransit_02_taksi_espoo.zip',
      false,
    ),
    // src('Sipoo', 'https://koontikartta.navici.com/tiedostot/rae/sipoon_kunta_sibbo_kommun.zip')
  ],
  osm: ['hsl'],
  dem: 'hsl',
};
