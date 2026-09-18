module.exports = {
  id: 'finland',
  gtfs: [
    {
      id: 'HSL',
      url: 'https://infopalvelut.storage.hsldev.com/gtfs/hsl_google_transit.zip',
      rules: ['finland/gtfs-rules/hsl-no-trains.rule'],
      replacements: { 'trips.txt': 'trips2.txt' },
    },
    {
      id: 'MATKA',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/digitransit_new.zip',
      fit: true,
    },
    {
      id: 'flixbus',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/flixbus_only.zip',
      fit: true,
    },
    {
      id: 'tampere',
      url: 'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_deprecated.zip',
    },
    {
      id: 'LINKKI',
      url: 'https://tvv.fra1.digitaloceanspaces.com/209.zip',
      fit: true,
    },
    { id: 'OULU', url: 'https://tvv.fra1.digitaloceanspaces.com/229.zip' },
    {
      id: 'digitraffic',
      url: 'https://rata.digitraffic.fi/api/v1/trains/gtfs-passenger-stops.zip',
      request: {
        headers: {
          'Accept-Encoding': 'gzip',
          'Digitraffic-User': 'Digitransit/OTP-dataloading',
        },
      },
    },
    {
      id: 'Rauma',
      url: 'http://digitransit-proxy:8080/out/raumaadmin.mattersoft.fi/feeds/233.zip',
    },
    {
      id: 'Hameenlinna',
      url: 'https://tvv.fra1.digitaloceanspaces.com/203.zip',
      fit: true,
    },
    {
      id: 'Kotka',
      url: 'https://tvv.fra1.digitaloceanspaces.com/217.zip',
      fit: true,
    },
    {
      id: 'Kouvola',
      url: 'https://tvv.fra1.digitaloceanspaces.com/219.zip',
      fit: true,
    },
    {
      id: 'Lappeenranta',
      url: 'https://tvv.fra1.digitaloceanspaces.com/225.zip',
      fit: true,
    },
    {
      id: 'Mikkeli',
      url: 'https://tvv.fra1.digitaloceanspaces.com/227.zip',
      fit: true,
    },
    {
      id: 'Vaasa',
      url: 'https://tvv.fra1.digitaloceanspaces.com/249.zip',
      fit: true,
    },
    {
      id: 'Joensuu',
      url: 'https://tvv.fra1.digitaloceanspaces.com/207.zip',
      fit: true,
    },
    { id: 'FOLI', url: 'http://data.foli.fi/gtfs/gtfs.zip' },
    {
      id: 'Lahti',
      url: 'https://tvv.fra1.digitaloceanspaces.com/223.zip',
      fit: true,
    },
    {
      id: 'Kuopio',
      url: 'https://karttapalvelu.kuopio.fi/google_transit/google_transit.zip',
    },
    {
      id: 'Rovaniemi',
      url: 'https://tvv.fra1.digitaloceanspaces.com/237.zip',
      fit: true,
    },
    {
      id: 'Kajaani',
      url: 'https://tvv.fra1.digitaloceanspaces.com/211.zip',
      fit: true,
    },
    {
      id: 'Salo',
      url: 'https://tvv.fra1.digitaloceanspaces.com/239.zip',
      fit: true,
    },
    {
      id: 'Pori',
      url: 'https://tvv.fra1.digitaloceanspaces.com/231.zip',
      fit: true,
    },
    {
      id: 'Viro',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/viro.zip',
    },
    {
      id: 'Raasepori',
      url: 'https://tvv.fra1.digitaloceanspaces.com/232.zip',
      fit: true,
    },
    {
      id: 'VARELY',
      url: 'http://digitransit-proxy:8080/out/varelyadmin.mattersoft.fi/feeds/102.zip',
    },
    {
      id: 'Harma',
      url: 'https://harmanliikenne.bussikaista.fi/sites/harma/files/gtfs/export/latest.zip',
      fit: true,
    },
    {
      id: 'PohjolanMatka',
      url: 'https://minfoapi.matkahuolto.fi/gtfs/458/gtfs.zip',
      fit: true,
    },
    {
      id: 'Korsisaari',
      url: 'https://minfoapi.matkahuolto.fi/gtfs/036/gtfs.zip',
      fit: true,
    },
    {
      id: 'KoivistonAuto',
      url: 'https://minfoapi.matkahuolto.fi/gtfs/020/gtfs.zip',
      fit: true,
    },
    {
      id: 'PahkakankaanLiikenne',
      url: 'https://minfoapi.matkahuolto.fi/gtfs/198/gtfs.zip',
      fit: true,
    },
    {
      id: 'IngvesSvanback',
      url: 'https://minfoapi.matkahuolto.fi/gtfs/177/gtfs.zip',
      fit: true,
    },
    {
      id: '02Taksi',
      url: 'https://gtfsdata.blob.core.windows.net/finland/02Taksi-taxizone.zip',
      taxiProvider: true,
    },
  ],
  netex: [
    {
      id: 'VR_bussit',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/vr_bussit.zip',
      groupFilePattern: '(line)_.*\\.xml',
      sharedFilePattern: '_.*\\.xml',
    },
    {
      id: 'CAR_FERRIES',
      url: 'https://schedules.finferries.fi/export/netex.zip',
      groupFilePattern: '().*\\.xml',
    },
  ],
  osm: ['finland', 'estonia'],
};
