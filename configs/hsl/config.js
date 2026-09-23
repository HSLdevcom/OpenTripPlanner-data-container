module.exports = {
  id: 'hsl',
  gtfs: [
    {
      id: 'HSL',
      url: 'https://infopalvelut.storage.hsldev.com/gtfs/hsl_google_transit.zip',
      replacements: { 'trips.txt': 'trips2.txt' },
    },
    {
      id: 'Uber',
      url: 'https://gtfsdata.blob.core.windows.net/hsl/ubertaksi-gtfs.zip',
      rules: ['hsl/gtfs-rules/remove-route-color.rule'],
    },
    {
      id: 'HSLlautta',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/lautat_new.zip',
    },
    // { id: 'Sipoo', url: 'https://koontikartta.navici.com/tiedostot/rae/sipoon_kunta_sibbo_kommun.zip' }
  ],
  osm: ['hsl'],
  dem: 'hsl',
};
