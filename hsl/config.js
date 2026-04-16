const { mapSrc } = require('../util');

module.exports = {
  id: 'hsl',
  src: [
    mapSrc(
      'HSL',
      'https://infopalvelut.storage.hsldev.com/gtfs/hsl_google_transit.zip',
      false,
      undefined,
      { 'trips.txt': 'trips2.txt' },
    ),
    /*
    mapSrc(
      'HSLlautta',
      'https://mobility.mobility-database.fintraffic.fi/static/lautat_new.zip',
      ),
    */
    // src('Sipoo', 'https://koontikartta.navici.com/tiedostot/rae/sipoon_kunta_sibbo_kommun.zip')
  ],
  osm: ['hsl'],
  dem: 'hsl',
};
