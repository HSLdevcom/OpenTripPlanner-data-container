const fs = require('fs');
const readline = require('readline');
const path = require('path');
const axios = require('axios');
const dns = require('dns').promises;
const logger = require('../logger');
const { SPLIT_BUILD_TYPE } = require('../config');

function getStartBuildMessage(splitBuildType) {
  switch (splitBuildType) {
    case 'ONLY_BUILD_STREET_GRAPH':
      return 'Starting street only graph data build :rocket:';
    case 'USE_PREBUILT_STREET_GRAPH':
      return 'Starting graph data build from prebuilt street graph :rocket:';
    default:
      return 'Starting data build :rocket:';
  }
}

function getBuilderLabel(splitBuildType) {
  switch (splitBuildType) {
    case 'ONLY_BUILD_STREET_GRAPH':
      return 'OTP street builder';
    case 'USE_PREBUILT_STREET_GRAPH':
      return 'OTP transit builder';
    default:
      return 'OTP combined builder';
  }
}

const username = `${getBuilderLabel(SPLIT_BUILD_TYPE)} ${process.env.BUILDER_TYPE || 'dev'}`;
const channel = process.env.SLACK_CHANNEL_ID;
const headers = {
  Authorization: `Bearer ${process.env.SLACK_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
  Accept: '*/*',
};

function withLevelEmoji(text, level) {
  switch (level) {
    case 'error':
      return `${text} :boom:`;
    case 'warn':
      return `${text} :warning:`;
    default:
      return text;
  }
}

async function postSlackMessage(text, level = 'info') {
  logger[level](text); // write important messages also to log
  try {
    const { data } = await axios.post(
      'https://slack.com/api/chat.postMessage',
      {
        channel,
        text: withLevelEmoji(text, level),
        username,
        thread_ts: global.messageTimeStamp, // either null (will be a new message) or pointing to parent message (will be a reply)
      },
      { headers },
    );
    // Return the response, it contains information such as the message timestamp that is needed to reply to messages
    return data;
  } catch (e) {
    // Something went wrong in the Slack-cycle... log it and continue build
    logger.error(
      `Something went wrong when trying to send message to Slack: ${e}`,
    );
    return e;
  }
}

async function updateSlackMessage(text, level = 'info') {
  logger[level](text);
  try {
    const { data } = await axios.post(
      'https://slack.com/api/chat.update',
      {
        channel: process.env.SLACK_CHANNEL_ID,
        text: withLevelEmoji(text, level),
        username,
        ts: global.messageTimeStamp,
      },
      { headers },
    );
    // Return response data, it contains information such as the message timestamp that is needed to reply to messages
    return data;
  } catch (e) {
    // Something went wrong in the Slack-cycle... log it and continue build
    logger.error(
      `Something went wrong when trying to update Slack message: ${e}`,
    );
    return e;
  }
}

const UNCONNECTED =
  /Could not connect .*:(\d*) \(([A-Z]?[a-z]?\d{4})\) at \((\d+\.\d+), (\d+\.\d+)/;
const CONNECTED =
  /Connected {.*:(\d*) lat,lng=(\d+\.\d+),(\d+\.\d+)} \(([A-Z]?[a-z]?\d{4})\) to (.*) at \((\d+\.\d+), (\d+\.\d+)/;

function distance(lat1, lon1, lat2, lon2) {
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) *
      Math.cos(lat2 * p) *
      (1 - Math.cos((lon2 - lon1) * p))) /
      2;

  return 12742 * 1000 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

async function match(line, connectedStream, unconnectedStream) {
  let res = UNCONNECTED.exec(line);
  if (res != null) {
    // eslint-disable-next-line
    const [stopid, stopcode, jorelon, jorelat] = res.slice(1);
    unconnectedStream.write([stopcode, jorelat, jorelon].join(',') + '\n');
    return;
  }
  res = CONNECTED.exec(line);
  if (res != null) {
    const [stopid, jorelat, jorelon, stopcode, osmnode, osmlon, osmlat] =
      res.slice(1);
    const dist = distance(jorelat, jorelon, osmlat, osmlon);
    connectedStream.write(
      [stopid, stopcode, jorelat, jorelon, osmnode, osmlat, osmlon, dist].join(
        ',',
      ) + '\n',
    );
  }
}

// process taggedStops.log file into connected.csv and unconnected.csv in given dir path
const otpMatching = function (directory) {
  return new Promise(resolve => {
    const promises = [];

    const connectedStream = fs.createWriteStream(
      path.join(directory, 'connected.csv'),
    );
    const unconnectedStream = fs.createWriteStream(
      path.join(directory, 'unconnected.csv'),
    );
    connectedStream.write(
      'stop_id,stop_code,jore_lat,jore_lon,osm_node,osm_lat,osm_lon,distance\n',
    );
    unconnectedStream.write('stop_code,jore_lat,jore_lon\n');

    const rl = readline.createInterface({
      input: fs.createReadStream(path.join(directory, 'taggedStops.log')),
    });

    rl.on('line', line => {
      promises.push(match(line, connectedStream, unconnectedStream));
    });

    rl.on('close', () => {
      Promise.all(promises).then(resolve);
    });
  });
};

// extract feed id from zip file name: 'path/HSL-gtfs.zip' -> HSL
const parseId = function (gtfsFile) {
  const fileName = gtfsFile.split('/').pop();
  return fileName.substring(0, fileName.indexOf('-gtfs'));
};

/*
 * Directory names follow ISO 8601 format without milliseconds and
 * with ':' replaced with '.'. Returns null if date can't be parsed.
 */
function dirNameToDate(dirName) {
  const date = new Date(dirName.replace(/\./g, ':'));
  return date instanceof Date && !isNaN(date) ? date : null;
}

/**
 * @param {string} dirPath dir to create including its path
 */
function createDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const CANARY_HOST = 'slack.com';
const MAX_ATTEMPTS = 12;
const RETRY_DELAY_MS = 5000;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Waits for basic outbound DNS/network connectivity to become available,
 * polling a canary host a bounded number of times. This works around a
 * transient `getaddrinfo EAI_AGAIN` DNS failure seen on AKS: the nested
 * `dockerd` (docker:dind) rewrites iptables rules on startup, which can
 * race with the pod's CNI-managed DNS routing.
 *
 * @returns {Promise<void>} resolves once connectivity is confirmed.
 */
async function waitForNetwork() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await dns.lookup(CANARY_HOST);
      return;
    } catch (err) {
      logger.warn(
        `Network not ready yet (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}`,
      );
      if (attempt < MAX_ATTEMPTS) {
        await wait(RETRY_DELAY_MS);
      }
    }
  }
  logger.error(
    'Network did not become ready in time. Exiting so Kubernetes can restart the pod.',
  );
  process.exit(1);
}

module.exports = {
  postSlackMessage,
  updateSlackMessage,
  getStartBuildMessage,
  otpMatching,
  parseId,
  dirNameToDate,
  createDir,
  waitForNetwork,
};
