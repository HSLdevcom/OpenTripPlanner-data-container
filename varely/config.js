const { mapSrc } = require('../util');

module.exports = {
  id: 'varely',
  src: [
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
    mapSrc(
      '02Taksi',
      'https://gtfsdata.blob.core.windows.net/finland/02Taksi-carpickupzone-gtfs.zip',
      false,
    ),
  ],
  osm: ['varely'],
};
