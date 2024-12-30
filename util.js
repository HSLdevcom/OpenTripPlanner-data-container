const JSZip = require('jszip')
const fs = require('fs')
const globby = require('globby')
const readline = require('readline')
const path = require('path')
const axios = require('axios')

/**
 * zipFile file to create
 * dir directory for source files
 * glob pattern array
 * cb function to call when done
 */
const zipWithGlob = (zipFile, glob, zipDir, cb) => {
  return globby(glob).then(paths => {
    const zip = new JSZip()

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

const username = `OTP data builder ${process.env.BUILDER_TYPE || 'dev'}`
const channel = process.env.SLACK_CHANNEL_ID
const headers = {
  Authorization: `Bearer ${process.env.SLACK_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
  Accept: '*/*'
}

async function postSlackMessage (text) {
  process.stdout.write(`${text}\n`) // write important messages also to log
  try {
    const { data } = await axios.post('https://slack.com/api/chat.postMessage', {
      channel,
      text,
      username,
      thread_ts: global.messageTimeStamp // either null (will be a new message) or pointing to parent message (will be a reply)
    }, { headers })
    // Return the response, it contains information such as the message timestamp that is needed to reply to messages
    return data
  } catch (e) {
    // Something went wrong in the Slack-cycle... log it and continue build
    process.stdout.write(`Something went wrong when trying to send message to Slack: ${e}\n`)
    return e
  }
}

async function updateSlackMessage (text) {
  process.stdout.write(`${text}\n`)
  try {
    const { data } = await axios.post('https://slack.com/api/chat.update', {
      channel: process.env.SLACK_CHANNEL_ID,
      text,
      username,
      ts: global.messageTimeStamp
    }, { headers })
    // Return response data, it contains information such as the message timestamp that is needed to reply to messages
    return data
  } catch (e) {
    // Something went wrong in the Slack-cycle... log it and continue build
    process.stdout.write(`Something went wrong when trying to update Slack message: ${e}\n`)
    return e
  }
}

const UNCONNECTED = /Could not connect ([A-Z]?[a-z]?\d{4}) at \((\d+\.\d+), (\d+\.\d+)/
const CONNECTED = /Connected {.*:(\d*) lat,lng=(\d+\.\d+),(\d+\.\d+)} \(([A-Z]?[a-z]?\d{4})\) to (.*) at \((\d+\.\d+), (\d+\.\d+)/

function distance (lat1, lon1, lat2, lon2) {
  const p = Math.PI / 180
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p)) / 2

  return 12742 * 1000 * Math.asin(Math.sqrt(a)) // 2 * R; R = 6371 km
}

async function match (line, connectedStream, unconnectedStream) {
  let res = UNCONNECTED.exec(line)
  if (res != null) {
    const [stopcode, jorelon, jorelat] = res.slice(1)
    unconnectedStream.write([stopcode, jorelat, jorelon].join(',') + '\n')
    return
  }
  res = CONNECTED.exec(line)
  if (res != null) {
    const [stopid, jorelat, jorelon, stopcode, osmnode, osmlon, osmlat] = res.slice(1)
    const dist = distance(jorelat, jorelon, osmlat, osmlon)
    connectedStream.write(
      [stopid, stopcode, jorelat, jorelon, osmnode, osmlat, osmlon, dist].join(',') + '\n'
    )
  }
}

// process taggedStops.log file into connected.csv and unconnected.csv in given dir path
const otpMatching = function (directory) {
  return new Promise(resolve => {
    const promises = []

    const connectedStream = fs.createWriteStream(path.join(directory, 'connected.csv'))
    const unconnectedStream = fs.createWriteStream(path.join(directory, 'unconnected.csv'))
    connectedStream.write(
      'stop_id,stop_code,jore_lat,jore_lon,osm_node,osm_lat,osm_lon,distance\n'
    )
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

// extract feed id from zip file name: 'path/HSL-gtfs.zip' -> HSL
const parseId = function (gtfsFile) {
  const fileName = gtfsFile.split('/').pop()
  return fileName.substring(0, fileName.indexOf('-gtfs'))
}

/*
 * Directory names follow ISO 8601 format without milliseconds and
 * with ':' replaced with '.'. Returns null if date can't be parsed.
 */
function dirNameToDate (dirName) {
  const date = new Date(dirName.replace(/\./g, ':'))
  return date instanceof Date && !isNaN(date) ? date : null
}

/*
 * id = feedid (String)
 * url = feed url (String)
 * fit = mapfit shapes (true/falsy)
 * rules = OBA Filter rules to apply (array of strings or undefined)
 * replacements = replace or remove file from gtfs package (format: {'file_to_replace': 'file_to_replace_with' or null})
 * request options = optional special options for request
 */
const mapSrc = (id, url, fit, rules, replacements, request) => ({ id, url, fit, rules, replacements, request })

module.exports = {
  zipDir: (zipFile, dir, cb) => {
    zipWithGlob(zipFile, [`${dir}/*`], undefined, cb)
  },
  zipWithGlob,
  postSlackMessage,
  updateSlackMessage,
  otpMatching,
  parseId,
  dirNameToDate,
  mapSrc
}
