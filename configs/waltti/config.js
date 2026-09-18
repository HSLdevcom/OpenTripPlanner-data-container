module.exports = {
  id: 'waltti',
  gtfs: [
    {
      id: 'Hameenlinna',
      url: 'https://tvv.fra1.digitaloceanspaces.com/203.zip',
      fit: true,
    },
    {
      id: 'Kotka',
      url: 'https://tvv.fra1.digitaloceanspaces.com/217.zip',
      fit: true,
      replacements: {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
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
      replacements: {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    },
    { id: 'FOLI', url: 'http://data.foli.fi/gtfs/gtfs.zip' },
    {
      id: 'Lahti',
      url: 'https://tvv.fra1.digitaloceanspaces.com/223.zip',
      fit: true,
      replacements: {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    },
    {
      id: 'Kuopio',
      url: 'https://tvv.fra1.digitaloceanspaces.com/221.zip',
      fit: true,
      replacements: {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    },
    {
      id: 'OULU',
      url: 'https://tvv.fra1.digitaloceanspaces.com/229.zip',
      fit: true,
      replacements: {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    },
    {
      id: 'LINKKI',
      url: 'https://tvv.fra1.digitaloceanspaces.com/209.zip',
      fit: true,
      replacements: {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    },
    {
      id: 'tampere',
      url: 'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_deprecated.zip',
    },
    {
      id: 'Rovaniemi',
      url: 'https://tvv.fra1.digitaloceanspaces.com/237.zip',
      fit: true,
    },
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
      id: 'Pori',
      url: 'https://tvv.fra1.digitaloceanspaces.com/231.zip',
      fit: true,
      replacements: {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    },
    {
      id: 'FUNI',
      url: 'https://foligtfs.blob.core.windows.net/routeplanner/gtfs-foli-ff.zip',
      fit: true,
    },
    {
      id: 'Raasepori',
      url: 'https://tvv.fra1.digitaloceanspaces.com/232.zip',
      fit: true,
    },
    {
      id: 'KotkaLautat',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/ferries_cars.zip',
      fit: true,
      rules: ['waltti/gtfs-rules/only-kotka-ferries.rule'],
    },
    {
      id: 'Salo',
      url: 'https://tvv.fra1.digitaloceanspaces.com/239.zip',
      fit: true,
    },
    {
      id: 'Kajaani',
      url: 'https://tvv.fra1.digitaloceanspaces.com/211.zip',
      fit: true,
    },
    {
      id: '02Taksi',
      url: 'https://gtfsdata.blob.core.windows.net/finland/02Taksi-taxizone.zip',
      taxiProvider: true,
    },
  ],
  osm: ['kajaani', 'oulu', 'rovaniemi', 'southFinland', 'vaasa'],
};
