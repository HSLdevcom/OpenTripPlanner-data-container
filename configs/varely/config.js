module.exports = {
  id: 'varely',
  gtfs: [
    {
      id: 'VARELY',
      url: 'http://digitransit-proxy:8080/out/varelyadmin.mattersoft.fi/feeds/102.zip',
    },
    { id: 'FOLI', url: 'http://data.foli.fi/gtfs/gtfs.zip' },
    {
      id: 'Rauma',
      url: 'http://digitransit-proxy:8080/out/raumaadmin.mattersoft.fi/feeds/233.zip',
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
      id: '02Taksi',
      url: 'https://gtfsdata.blob.core.windows.net/finland/02Taksi-taxizone.zip',
      taxiProvider: true,
    },
  ],
  osm: ['varely'],
};
