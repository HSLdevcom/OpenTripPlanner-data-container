const JSZip = require('jszip')
const fs = require('fs')
const { execSync } = require('child_process')
const globby = require('globby')
const readline = require('readline')
const path = require('path')
const request = require('request')
const { promisify } = require('util')
const promisifiedRequest = promisify(request)

/**
 * zipFile file to create
 * dir directory for source files
 * glob pattern array
 * cb function to call when done
 */
const zipWithGlob = (zipFile, glob, zipDir, cb) => {
  return globby(glob).then(paths => {
    let zip = new JSZip()

    if (zipDir !== undefined) {
      zip.folder(zipDir)
    }
    paths.forEach(file => {
      zip.file((zipDir !== undefined ? (zipDir + '/') : '') + file.split('/').pop(), fs.createReadStream(file))
    })
    zip.generateNodeStream({ streamFiles: true, compression: 'DEFLATE', compressionOptions: { level: 6 } })
      .pipe(fs.createWriteStream(zipFile))
      .on('finish', (err) => {
        cb(err)
      })
  })
}

async function postSlackMessage (messageText) {
  try {
    const response = await promisifiedRequest({
      method: 'POST',
      url: 'https://slack.com/api/chat.postMessage',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      json: {
        channel: process.env.SLACK_CHANNEL_ID,
        text: messageText,
        username: `OTP data builder ${process.env.BUILDER_TYPE || 'dev'}`,
        thread_ts: global.messageTimeStamp // either null (will be a new message) or pointing to parent message (will be a reply)
      }
    })

    // Return the response, it contains information such as the message timestamp that is needed to reply to messages
    return response.body
  } catch (e) {
    // Something went wrong in the Slack-cycle... log it and continue build
    process.stdout.write(`Something went wrong when trying to send message to Slack: ${e}\n`)
    return e
  }
}

async function updateSlackMessage (messageText) {
  try {
    const response = await promisifiedRequest({
      method: 'POST',
      url: 'https://slack.com/api/chat.update',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      json: {
        channel: process.env.SLACK_CHANNEL_ID,
        text: messageText,
        username: `OTP data builder ${process.env.BUILDER_TYPE || 'dev'}`,
        ts: global.messageTimeStamp
      }
    })

    // Return the response, it contains information such as the message timestamp that is needed to reply to messages
    return response.body
  } catch (e) {
    // Something went wrong in the Slack-cycle... log it and continue build
    process.stdout.write(`Something went wrong when trying to update Slack message: ${e}\n`)
    return e
  }
}

/**
 * Compare size of a newly downloaded file (either from headers or from the downloaded file locally)
 * to the size of the local version of a file (either downloaded or seeded).
 * maxDifference should be a decimal of how much smaller the new file can be than the localFile (i.e. 0.01 = 1%).
 */
const compareSizes = (localFile, newFileSize, maxDifference) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(localFile)) {
      reject('error')
    }
    if (newFileSize === undefined) {
      return resolve()
    }
    let fileSize = fs.statSync(localFile).size
    if (fileSize * (1 - maxDifference) <= newFileSize) {
      resolve()
    } else {
      process.stdout.write(`Local file size was: ${fileSize} and remote size: ${newFileSize} \n`)
      reject('end') // eslint-disable-line
    }
  })
}

const UNCONNECTED = /Could not connect ([A-Z]?[a-z]?\d{4}) at \((\d+\.\d+), (\d+\.\d+)/
const CONNECTED = /Connected <.*:(\d*) lat,lng=(\d+\.\d+),(\d+\.\d+)> \(([A-Z]?[a-z]?\d{4})\) to (.*) at \((\d+\.\d+), (\d+\.\d+)/

function distance (lat1, lon1, lat2, lon2) {
  var p = Math.PI / 180
  var a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p)) / 2

  return 12742 * 1000 * Math.asin(Math.sqrt(a)) // 2 * R; R = 6371 km
}

async function match (line, connectedStream, unconnectedStream) {
  let res = UNCONNECTED.exec(line)
  if (res != null) {
    const [stopCode, jorelon, jorelat] = res.slice(1)
    unconnectedStream.write([stopCode, jorelat, jorelon].join(',') + '\n')
    return
  }
  res = CONNECTED.exec(line)
  if (res != null) {
    const [stopId, jorelat, jorelon, stopCode, osmnode, osmlon, osmlat] = res.slice(1)
    const dist = distance(jorelat, jorelon, osmlat, osmlon)
    connectedStream.write([stopId, stopCode, jorelat, jorelon, osmnode, osmlat, osmlon, dist].join(',') + '\n')
  }
}

// process taggedStops.log file into connected.csv and unconnected.csv in given dir path
const otpMatching = function (directory) {
  return new Promise(resolve => {
    const promises = []

    const connectedStream = fs.createWriteStream(path.join(directory, 'connected.csv'))
    const unconnectedStream = fs.createWriteStream(path.join(directory, 'unconnected.csv'))
    connectedStream.write('stop_id,stop_code,jore_lat,jore_lon,osm_node,osm_lat,osm_lon,distance\n')
    unconnectedStream.write('stop_code,jore_lat,jore_lon\n')

    const rl = readline.createInterface({
      input: fs.createReadStream(path.join(directory, 'taggedStops.log'))
    })

    rl.on('line', line => {
      promises.push(match(line, connectedStream, unconnectedStream))
    })

    rl.on('close', () => {
      Promise.all(promises).then(resolve)
    })
  })
}

/*
 * Directory names follow ISO 8601 format without milliseconds and
 * with ':' replaced with '.'. Returns null if date can't be parsed.
 */
function dirNameToDate (dirName) {
  const date = new Date(dirName.replace(/\./g, ':'))
  return date instanceof Date && !isNaN(date) ? date : null
}

/**
 * Extracts files from a zip archive and saves them to given path
 * @param {string} zipPath - zip file name
 * @param {string} destinationPath - The path to the data directory where files are put
 */
function extractAllFiles (zipPath, destinationPath) {
  execSync(`unzip -o ${zipPath} -d ${destinationPath}`)
  process.stdout.write(`Unzipped ${zipPath} to ${destinationPath}\n`)
}

module.exports = {
  zipDir: (zipFile, dir, cb) => {
    zipWithGlob(zipFile, [`${dir}/*`], undefined, cb)
  },
  zipWithGlob,
  routerDir: (config) => `router-${config.id}`,
  postSlackMessage,
  updateSlackMessage,
  compareSizes,
  otpMatching,
  dirNameToDate,
  extractAllFiles
}
