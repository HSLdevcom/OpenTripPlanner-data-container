const { mapSrc } = require('../util')

module.exports = {
  id: 'finland',
  src: [
    mapSrc('HSL', 'https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip', false, ['finland/gtfs-rules/hsl-no-trains.rule'], { 'trips.txt': 'trips2.txt' }),
    mapSrc('MATKA', 'https://mobility.mobility-database.fintraffic.fi/static/digitransit_new.zip', true),
    mapSrc('tampere', 'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_deprecated.zip'),
    mapSrc('LINKKI', 'https://tvv.fra1.digitaloceanspaces.com/209.zip', true),
    mapSrc('OULU', 'https://tvv.fra1.digitaloceanspaces.com/229.zip'),
    mapSrc('digitraffic', 'https://rata.digitraffic.fi/api/v1/trains/gtfs-passenger-stops.zip', false, undefined, undefined, { headers: { 'Accept-Encoding': 'gzip', 'Digitraffic-User': 'Digitransit/OTP-dataloading' } }),
    mapSrc('Rauma', 'http://digitransit-proxy:8080/out/raumaadmin.mattersoft.fi/feeds/233.zip'),
    mapSrc('Hameenlinna', 'https://tvv.fra1.digitaloceanspaces.com/203.zip', true),
    mapSrc('Kotka', 'https://tvv.fra1.digitaloceanspaces.com/217.zip', true),
    mapSrc('Kouvola', 'https://tvv.fra1.digitaloceanspaces.com/219.zip', true),
    mapSrc('Lappeenranta', 'https://tvv.fra1.digitaloceanspaces.com/225.zip', true),
    mapSrc('Mikkeli', 'https://tvv.fra1.digitaloceanspaces.com/227.zip', true),
    mapSrc('Vaasa', 'https://tvv.fra1.digitaloceanspaces.com/249.zip', true),
    mapSrc('Joensuu', 'https://tvv.fra1.digitaloceanspaces.com/207.zip', true),
    mapSrc('FOLI', 'https://data.foli.fi/gtfs/gtfs.zip'),
    mapSrc('Lahti', 'https://tvv.fra1.digitaloceanspaces.com/223.zip', true),
    mapSrc('Kuopio', 'https://karttapalvelu.kuopio.fi/google_transit/google_transit.zip'),
    mapSrc('Rovaniemi', 'https://tvv.fra1.digitaloceanspaces.com/237.zip', true),
    mapSrc('Kajaani', 'https://tvv.fra1.digitaloceanspaces.com/211.zip', true),
    mapSrc('Salo', 'https://tvv.fra1.digitaloceanspaces.com/239.zip', true),
    mapSrc('Pori', 'https://tvv.fra1.digitaloceanspaces.com/231.zip', true),
    mapSrc('Viro', 'https://peatus.ee/gtfs/gtfs.zip'),
    mapSrc('Raasepori', 'https://tvv.fra1.digitaloceanspaces.com/232.zip', true),
    mapSrc('VARELY', 'http://digitransit-proxy:8080/out/varelyadmin.mattersoft.fi/feeds/102.zip', false),
    mapSrc('Harma', 'https://harmanliikenne.bussikaista.fi/sites/harma/files/gtfs/export/latest.zip', true),
    mapSrc('PohjolanMatka', 'https://minfoapi.matkahuolto.fi/gtfs/458/gtfs.zip', true),
    mapSrc('Korsisaari', 'https://minfoapi.matkahuolto.fi/gtfs/036/gtfs.zip', true)
  ],
  osm: ['finland', 'estonia']
}