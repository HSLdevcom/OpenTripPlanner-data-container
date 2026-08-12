const mapSrc = require('../utils/configUtils.js');

module.exports = {
  id: 'waltti',
  gtfs: [
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
    mapSrc('FOLI', 'http://data.foli.fi/gtfs/gtfs.zip'),
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
    ),
    mapSrc(
      'Rovaniemi',
      'https://tvv.fra1.digitaloceanspaces.com/237.zip',
      true,
    ),
    mapSrc(
      'digitraffic',
      'https://rata.digitraffic.fi/api/v1/trains/gtfs-passenger-stops.zip',
      false,
      undefined,
      undefined,
      {
        headers: {
          'Accept-Encoding': 'gzip',
          'Digitraffic-User': 'Digitransit/OTP-dataloading',
        },
      },
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
    mapSrc(
      'KotkaLautat',
      'https://mobility.mobility-database.fintraffic.fi/static/ferries_cars.zip',
      true,
      ['waltti/gtfs-rules/only-kotka-ferries.rule'],
    ),
    mapSrc('Salo', 'https://tvv.fra1.digitaloceanspaces.com/239.zip', true),
    mapSrc('Kajaani', 'https://tvv.fra1.digitaloceanspaces.com/211.zip', true),
  ],
  carPickupZone: [
    mapSrc(
      '02Taksi_carpickupzone',
      'https://gtfsdata.blob.core.windows.net/finland/02Taksi-carpickupzone-gtfs.zip',
    ),
  ],
  osm: ['kajaani', 'oulu', 'rovaniemi', 'southFinland', 'vaasa'],
};
