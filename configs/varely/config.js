const { mapSrc } = require('../../src/utils/configUtils.js');

module.exports = {
  id: 'varely',
  gtfs: [
    mapSrc(
      'VARELY',
      'http://digitransit-proxy:8080/out/varelyadmin.mattersoft.fi/feeds/102.zip',
    ),
    mapSrc('FOLI', 'http://data.foli.fi/gtfs/gtfs.zip'),
    mapSrc(
      'Rauma',
      'http://digitransit-proxy:8080/out/raumaadmin.mattersoft.fi/feeds/233.zip',
    ),
    mapSrc('Salo', 'https://tvv.fra1.digitaloceanspaces.com/239.zip', true),
    mapSrc('Pori', 'https://tvv.fra1.digitaloceanspaces.com/231.zip', true),
  ],
  taxiZone: [
    {
      id: '02Taksi',
      url: 'https://gtfsdata.blob.core.windows.net/finland/02Taksi-taxizone.zip',
    },
  ],
  osm: ['varely'],
};
