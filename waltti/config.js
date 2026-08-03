const { mapSrc } = require('../util');

module.exports = {
  id: 'waltti',
  src: [
    mapSrc(
      'Hameenlinna',
      'https://tvv.fra1.digitaloceanspaces.com/203.zip',
      true,
    ),
    mapSrc(
      'Kotka',
      'https://tvv.fra1.digitaloceanspaces.com/217.zip',
      true,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    ),
    mapSrc('Kouvola', 'https://tvv.fra1.digitaloceanspaces.com/219.zip', true),
    mapSrc(
      'Lappeenranta',
      'https://tvv.fra1.digitaloceanspaces.com/225.zip',
      true,
    ),
    mapSrc('Mikkeli', 'https://tvv.fra1.digitaloceanspaces.com/227.zip', true),
    mapSrc('Vaasa', 'https://tvv.fra1.digitaloceanspaces.com/249.zip', true),
    mapSrc(
      'Joensuu',
      'https://tvv.fra1.digitaloceanspaces.com/207.zip',
      true,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    ),
    mapSrc('FOLI', 'http://data.foli.fi/gtfs/gtfs.zip', true),
    mapSrc(
      'Lahti',
      'https://tvv.fra1.digitaloceanspaces.com/223.zip',
      true,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    ),
    mapSrc(
      'Kuopio',
      'https://tvv.fra1.digitaloceanspaces.com/221.zip',
      true,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    ),
    mapSrc(
      'OULU',
      'https://tvv.fra1.digitaloceanspaces.com/229.zip',
      true,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    ),
    mapSrc(
      'LINKKI',
      'https://tvv.fra1.digitaloceanspaces.com/209.zip',
      true,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    ),
    mapSrc(
      'tampere',
      'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_deprecated.zip',
      true,
    ),
    mapSrc(
      'Rovaniemi',
      'https://tvv.fra1.digitaloceanspaces.com/237.zip',
      true,
    ),
    mapSrc(
      'Pori',
      'https://tvv.fra1.digitaloceanspaces.com/231.zip',
      true,
      undefined,
      {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
    ),
    mapSrc(
      'FUNI',
      'https://foligtfs.blob.core.windows.net/routeplanner/gtfs-foli-ff.zip',
      true,
    ),
    mapSrc(
      'Raasepori',
      'https://tvv.fra1.digitaloceanspaces.com/232.zip',
      true,
    ),
    mapSrc('Salo', 'https://tvv.fra1.digitaloceanspaces.com/239.zip', true),
    mapSrc('Kajaani', 'https://tvv.fra1.digitaloceanspaces.com/211.zip', true),
    mapSrc(
      'VARELY',
      'http://digitransit-proxy:8080/out/varelyadmin.mattersoft.fi/feeds/102.zip',
      true,
    ),
    mapSrc(
      'Rauma',
      'http://digitransit-proxy:8080/out/raumaadmin.mattersoft.fi/feeds/233.zip',
      true,
    ),
  ],
  osm: ['kajaani', 'oulu', 'rovaniemi', 'southFinland', 'vaasa'],
};
