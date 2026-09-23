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
  gtfs: [
    {
      id: 'kela',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/Kela_suuret.zip',
      rules: ['kela/gtfs-rules/remove-route-color.rule'],
    },
    {
      id: 'kela_varely',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/Kela_varely.zip',
      rules: ['kela/gtfs-rules/remove-route-color.rule'],
    },
    {
      id: 'kela_waltti',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/kela_waltti.zip',
      rules: ['kela/gtfs-rules/remove-route-color.rule'],
    },
    {
      id: 'kela_lautat',
      url: 'https://mobility.mobility-database.fintraffic.fi/static/kelalautat.zip',
    },
    {
      id: 'matkahuolto',
      url: mhAddress,
      rules: [
        'kela/gtfs-rules/matkahuolto.rule',
        'kela/gtfs-rules/remove-route-color.rule',
      ],
      replacements: { 'transfers.txt': null },
    },
  ],
  osm: ['finland'],
};
