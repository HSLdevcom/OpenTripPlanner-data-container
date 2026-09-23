module.exports = {
  id: 'waltti-alt',
  gtfs: [
    {
      id: 'TurkuTrunkroutes',
      url: 'http://data-test.foli.fi/gtfs/gtfs.zip',
      fit: true,
    },
    {
      id: 'tampere',
      url: 'https://ekstrat.tampere.fi/ekstrat/ptdata/tamperefeed_mattersoft.zip',
      replacements: {
        'fare_attributes.txt': 'digitransit_fare_attributes.txt',
        'fare_rules.txt': 'digitransit_fare_rules.txt',
      },
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
      id: 'WalttiTest',
      url: 'https://github.com/tvv-lippu-ja-maksujarjestelma-oy/waltti-digitransit-config-data/raw/refs/heads/main/GTFStestireittiopas.zip',
      fit: true,
    },
    {
      id: '02Taksi',
      url: 'https://gtfsdata.blob.core.windows.net/finland/02Taksi-taxizone.zip',
      taxiProvider: true,
    },
  ],
  osm: ['oulu', 'southFinland'],
};
