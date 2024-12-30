const { mapSrc } = require('../util')

module.exports = {
  id: 'waltti-alt',
  src: [
    mapSrc('WalttiTest', 'http://digitransit-proxy:8080/out/lmjadmin.mattersoft.fi/feeds/229.zip', true),
  ],
  osm: ['oulu']
}