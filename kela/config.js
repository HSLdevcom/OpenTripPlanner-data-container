const { mapSrc } = require('../util');

// matkahuolto data source often fails when accessed through digitransit proxy
// here we exceptionally set up direct calls with basic auth
let mhAddress;
if (process.env.MH_BASIC_AUTH) {
  const basic = Buffer.from(process.env.MH_BASIC_AUTH, 'base64').toString(
    'utf8',
  );
  mhAddress = `https://${basic}@minfoapi.matkahuolto.fi/gtfs/kokomaa-fi/gtfs.zip`;
} else {
  mhAddress =
    'http://digitransit-proxy:8080/out/minfoapi.matkahuolto.fi/gtfs/kokomaa-fi/gtfs.zip';
}

module.exports = {
  id: 'kela',
  src: [
    mapSrc(
      'kela',
      'https://mobility.mobility-database.fintraffic.fi/static/Kela_suuret.zip',
      false,
      ['kela/gtfs-rules/remove-route-color.rule'],
    ),
    mapSrc(
      'kela_varely',
      'https://mobility.mobility-database.fintraffic.fi/static/Kela_varely.zip',
      false,
      ['kela/gtfs-rules/remove-route-color.rule'],
    ),
    mapSrc(
      'kela_waltti',
      'https://mobility.mobility-database.fintraffic.fi/static/kela_waltti.zip',
      false,
      ['kela/gtfs-rules/remove-route-color.rule'],
    ),
    mapSrc(
      'matkahuolto',
      mhAddress,
      false,
      [
        'kela/gtfs-rules/matkahuolto.rule',
        'kela/gtfs-rules/remove-matching-route.rule',
        'kela/gtfs-rules/remove-route-color.rule',
      ],
      { 'transfers.txt': null },
    ),
  ],
  osm: ['finland'],
};
