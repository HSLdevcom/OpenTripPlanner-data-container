const fs = require('fs')

const OTP_TAG = process.env.OTP_TAG || 'v1'

function patchDockerfile (otpTag, graphDir) {
  const dockerFile = 'opentripplanner/Dockerfile'
  const data = fs.readFileSync(dockerFile, { encoding: 'utf8' })
  const patchedData = data
    .replace(/<OTP_TAG>/g, otpTag)
    .replace(/<OTP_GRAPH_DIR>/g, graphDir)
  fs.writeFileSync(dockerFile, patchedData, { encoding: 'utf8' })
}

function patchLighttpdConf (graphDir) {
  const confFile = 'otp-data-server/lighttpd.conf'
  const data = fs.readFileSync(confFile, { encoding: 'utf8' })
  const patchedData = data
    .replace(/<OTP_GRAPH_DIR>/g, graphDir)
  fs.writeFileSync(confFile, patchedData, { encoding: 'utf8' })
}

module.exports = function () {
  return new Promise((resolve) => {
    patchDockerfile(OTP_TAG, global.storageDirName)
    patchLighttpdConf(global.storageDirName)
    resolve()
  })
}
