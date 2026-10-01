module.exports = {
  id: 'finland',
  gtfs: [
    {
      id: 'MATKA',
      url: 'https://mobility.mobility-database-test.fintraffic.fi/static/digitransit_test.zip',
      fit: true,
    },
    {
      id: 'KirkkonummiE',
      url: 'https://gtfsdata.blob.core.windows.net/hsl/hsl_flex_test1-gtfs.zip',
    },
    {
      id: 'KirkkonummiP',
      url: 'https://gtfsdata.blob.core.windows.net/hsl/hsl_flex_test2-gtfs.zip',
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
