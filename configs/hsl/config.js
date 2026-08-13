const { mapSrc } = require('../../src/utils/configUtils.js');

module.exports = {
  id: 'hsl',
  gtfs: [
    mapSrc(
      'HSL',
      'https://infopalvelut.storage.hsldev.com/gtfs/hsl_google_transit.zip',
      false,
      undefined,
      { 'trips.txt': 'trips2.txt' },
    ),
    mapSrc(
      'Uber',
      'https://gtfsdata.blob.core.windows.net/hsl/ubertaksi-gtfs.zip',
      false,
      ['hsl/gtfs-rules/remove-route-color.rule'],
    ),
    mapSrc(
      'HSLlautta',
      'https://mobility.mobility-database.fintraffic.fi/static/lautat_new.zip',
    ),
    // src('Sipoo', 'https://koontikartta.navici.com/tiedostot/rae/sipoon_kunta_sibbo_kommun.zip')
  ],
  osm: ['hsl'],
  dem: 'hsl',
};
