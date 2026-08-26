/*
Executes gulp tasks which download new data, builds and tests a new graph, saves it in storage and deploys
new opentripplanner-data-server and opentripplanner versions that use that data.
Data errors are detected and tolerated to a certain limit thanks to fallback mechanism to older data.
Unexpected code execution errors and failures in graph build abort the data loading.
*/
const gulp = require('gulp');
const { promisify } = require('util');
const { execFileSync } = require('child_process');
const fs = require('fs');
const {
  postSlackMessage,
  updateSlackMessage,
} = require('../utils/builderUtils.js');
require('../../gulpfile');
const { router, SPLIT_BUILD_TYPE } = require('../config');
const assert = require('assert');
const logger = require('../logger');

const MAX_GTFS_FALLBACK = 2; // threshold for aborting data loading

const start = promisify((task, cb) => gulp.series(task)(cb));

/**
 * Docker tags don't work with ':' and file names are also prettier without them. We also need to
 * remove milliseconds because they are not relevant and make converting string back to ISO format
 * more difficult.
 * @returns date as string
 */
function getDateString() {
  return new Date().toISOString().slice(0, -5).concat('Z').replace(/:/g, '.');
}

async function handleSeeding() {
  if (!process.env.NOSEED) {
    logger.info('Starting seeding');
    await start('seed');
    logger.info('Seeded');
  }
}

async function handleOsmAndDemUpdate() {
  if (!process.env.NODEM) {
    // we track data rejections using this global variable
    global.hasFailures = false;
    await start('dem:update');
    if (global.hasFailures) {
      postSlackMessage('DEM update failed, using previous version', 'warn');
    }
  }

  // OSM update is more complicated. Download often fails, so there is a retry loop,
  // which breaks when a big enough file gets loaded
  if (!process.env.USE_SEEDED_OSM) {
    global.blobSizeOk = false; // ugly hack but gulp does not return any values from tasks
    for (let i = 0; i < 3; i++) {
      await start('osm:update');
      if (global.blobSizeOk) {
        break;
      }
      if (i < 2) {
        // sleep 10 mins before next attempt
        await new Promise(resolve => setTimeout(resolve, 600000));
      }
    }
    if (!global.blobSizeOk) {
      global.hasFailures = true;
      postSlackMessage(
        'OSM data update failed, using previous version',
        'warn',
      );
    }
  } else {
    logger.info('Skipping OSM update and using existing seeded data');
  }
}

async function handleTransitDataUpdate() {
  await start('gtfs:update');
  await start('netex:update');
  await start('taxiZone:update');
}

function handleTests() {
  if (process.env.SKIPPED_SITES === 'all' || process.env.SKIP_OTP_TESTS) {
    logger.info('Skipping all tests');
  } else {
    logger.info('Test the newly built graph with OTPQA');
    execFileSync('./src/test.sh', [], { stdio: [0, 1, 2] });
  }
}

async function handleGtfsFallback(logFile) {
  // testing detected routing problems
  global.hasFailures = true;

  global.failedFeeds = fs.readFileSync(logFile, 'utf8'); // comma separated list of feed ids. No newline at end!
  fs.unlinkSync(logFile); // cleanup for local use

  if (global.failedFeeds.split(',').length > MAX_GTFS_FALLBACK) {
    updateSlackMessage(
      'Aborting the data update because too many quality tests failed',
      'error',
    );
    process.exit(1);
  }

  postSlackMessage(
    `GTFS packages ${global.failedFeeds} rejected, using fallback to current data`,
    'warn',
  );
  // use seed packages for failed feeds
  await start('gtfs:fallback');
}

function reportBuildResult(name, description) {
  if (global.hasFailures) {
    updateSlackMessage(
      `${name} ${description}, but partially falling back to older data`,
      'warn',
    );
  } else {
    updateSlackMessage(`${name} ${description} :white_check_mark:`);
  }
}

function buildAndDeployDockerImages(date) {
  logger.info('Deploying otp-data-server image...');
  execFileSync('./otp-data-server/deploy.sh', [date], {
    stdio: [0, 1, 2],
    env: {
      OTP_TAG: process.env.OTP_TAG,
      OTP_GRAPH_DIR: global.storageDirName,
      ROUTER_NAME: process.env.ROUTER_NAME,
      ORG: process.env.ORG,
      DOCKER_TAG: process.env.DOCKER_TAG,
      DOCKER_USER: process.env.DOCKER_USER,
      DOCKER_AUTH: process.env.DOCKER_AUTH,
    },
  });
  logger.info('Deploying opentripplanner image...');
  execFileSync('./opentripplanner/deploy-otp.sh', [date], {
    stdio: [0, 1, 2],
    env: {
      OTP_TAG: process.env.OTP_TAG,
      OTP_GRAPH_DIR: global.storageDirName,
      ROUTER_NAME: process.env.ROUTER_NAME,
      ORG: process.env.ORG,
      DOCKER_TAG: process.env.DOCKER_TAG,
      DOCKER_USER: process.env.DOCKER_USER,
      DOCKER_AUTH: process.env.DOCKER_AUTH,
    },
  });
}

async function handleCleanup() {
  if (!process.env.NOCLEANUP) {
    logger.info('Remove oldest data versions from storage');
    await start('storage:cleanup');
  }
}

/**
 * This function only builds the street graph with OSM and DEM data.
 */
async function buildStreetOnlyGraph(name) {
  await handleCleanup();

  await handleSeeding();

  await handleOsmAndDemUpdate();

  logger.info('Build street only graph');
  await start('router:buildStreetOnlyGraph');

  const date = getDateString();
  global.storageDirName = `osm-builds/${process.env.DOCKER_TAG}/${date}/${name}`;

  logger.info('Uploading street graph only build data to storage');
  await start('router:store');

  if (!process.env.NOCLEANUP) {
    logger.info('Remove oldest street only graph data versions from storage');
    await start('storage:cleanupStreetOnlyGraphData');
  }

  reportBuildResult(name, 'street only graph data updated');
}

/**
 * This function does the whole build.
 */
async function buildGraph(name) {
  await handleCleanup();

  await handleSeeding();

  await handleOsmAndDemUpdate();

  await handleTransitDataUpdate();

  logger.info('Build routing graph');
  await start('router:buildGraph');

  handleTests();

  const logFile = 'failed_feeds.txt';
  if (fs.existsSync(logFile)) {
    await handleGtfsFallback(logFile);
    // rebuild the graph
    logger.info('Rebuild graph using fallback data');
    await start('router:buildGraph');
  }

  const date = getDateString();
  global.storageDirName = `${process.env.DOCKER_TAG}/${date}/${name}`;

  logger.info('Uploading data to storage');
  await start('router:store');

  buildAndDeployDockerImages(date);

  reportBuildResult(name, 'data updated');
}

/**
 * This function builds the graph from prebuilt street graph data.
 */
async function buildWithPrebuiltStreetGraph(name) {
  await handleCleanup();

  await handleSeeding();

  await handleTransitDataUpdate();

  logger.info('Build routing graph from prebuilt street only graph');
  await start('router:buildWithPrebuiltStreetGraph');

  handleTests();

  const logFile = 'failed_feeds.txt';
  if (fs.existsSync(logFile)) {
    await handleGtfsFallback(logFile);
    // rebuild the graph
    logger.info('Rebuild graph using fallback data');
    await start('router:buildWithPrebuiltStreetGraph');
  }

  const date = getDateString();
  global.storageDirName = `${process.env.DOCKER_TAG}/${date}/${name}`;

  logger.info('Uploading data to storage');
  await start('router:storeForPrebuiltStreetGraphDataBuild');

  buildAndDeployDockerImages(date);

  reportBuildResult(name, 'data updated from prebuilt street only graph');
}

async function update() {
  // check environmental variables which needs to be defined
  assert(process.env.DOCKER_TAG !== undefined, 'DOCKER_TAG must be defined');

  const name = router.id;
  try {
    switch (SPLIT_BUILD_TYPE) {
      case 'ONLY_BUILD_STREET_GRAPH':
        await buildStreetOnlyGraph(name);
        break;
      case 'USE_PREBUILT_STREET_GRAPH':
        await buildWithPrebuiltStreetGraph(name);
        break;
      default:
        await buildGraph(name);
        break;
    }
  } catch (err) {
    postSlackMessage(`${name} data update failed: ${err.message}`, 'error');
    updateSlackMessage('Something went wrong with the data update', 'error');
  }
}

module.exports = {
  update,
};
