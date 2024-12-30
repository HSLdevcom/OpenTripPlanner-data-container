const { mapSrc } = require('../util')

module.exports = {
  id: 'kela',
  src: [
    mapSrc('kela', 'https://mobility.mobility-database.fintraffic.fi/static/Kela_suuret.zip'),
    mapSrc('kela_varely', 'https://mobility.mobility-database.fintraffic.fi/static/Kela_varely.zip'),
    mapSrc('kela_waltti', 'https://mobility.mobility-database.fintraffic.fi/static/kela_waltti.zip'),
    mapSrc('matkahuolto', mhAddress, false, ['kela/gtfs-rules/matkahuolto.rule'], { 'transfers.txt': null }),
  ],
  osm: ['finland']
}