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
const { postSlackMessage, finalizeBuild } = require('../utils/builderUtils.js');
const { timeSection } = require('../utils/timerUtils.js');
const {
  getDateStringForDockerTag,
  formatCodeBlock,
} = require('../utils/formatUtils.js');
require('../../gulpfile');
const { router, SPLIT_BUILD_TYPE } = require('../config');
const assert = require('assert');
const logger = require('../logger');

const MAX_GTFS_FALLBACK = 2; // threshold for aborting data loading

const start = promisify((task, cb) => gulp.series(task)(cb));

async function handleSeeding() {
  await timeSection('Seeding', async () => {
    if (!process.env.NOSEED) {
      logger.info('Starting seeding');
      await start('seed');
      logger.info('Seeded');
    }
  });
}

async function handleOsmAndDemUpdate() {
  await timeSection('OSM & DEM update', async () => {
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
  });
}

async function handleTransitDataUpdate() {
  await timeSection('Transit data update', async () => {
    await start('gtfs:update');
    await start('netex:update');
  });
}

async function handleTests() {
  if (process.env.SKIPPED_SITES === 'all' || process.env.SKIP_OTP_TESTS) {
    logger.info('Skipping all tests');
    return;
  }
  await timeSection('Tests', async () => {
    logger.info('Test the newly built graph with OTPQA');
    execFileSync('./src/test.sh', [], { stdio: [0, 1, 2] });
  });
}

async function handleGtfsFallback(logFile) {
  // testing detected routing problems
  global.hasFailures = true;

  global.failedFeeds = fs.readFileSync(logFile, 'utf8'); // comma separated list of feed ids. No newline at end!
  fs.unlinkSync(logFile); // cleanup for local use

  if (global.failedFeeds.split(',').length > MAX_GTFS_FALLBACK) {
    const err = new Error(
      'Aborting the data update because too many quality tests failed',
    );
    // Marks this as an intentional abort so update()'s catch block can post
    // this exact message instead of the generic failure message.
    err.isAbort = true;
    throw err;
  }

  postSlackMessage(
    `GTFS packages ${global.failedFeeds} rejected, using fallback to current data`,
    'warn',
  );
  // use seed packages for failed feeds
  await start('gtfs:fallback');
}

function buildAndDeployDockerImages(date) {
  return timeSection('Deploy', async () => {
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
  });
}

async function handleCleanup() {
  await timeSection('Cleanup', async () => {
    if (!process.env.NOCLEANUP) {
      logger.info('Remove oldest data versions from storage');
      await start('storage:cleanup');
    }
  });
}

/**
 * This function only builds the street graph with OSM and DEM data.
 */
async function buildStreetOnlyGraph(routerId) {
  await handleCleanup();

  await handleSeeding();

  await handleOsmAndDemUpdate();

  logger.info('Build street only graph');
  await timeSection('Build graph', () => start('router:buildStreetOnlyGraph'));

  const date = getDateStringForDockerTag();
  global.storageDirName = `osm-builds/${process.env.DOCKER_TAG}/${date}/${routerId}`;

  logger.info('Uploading street graph only build data to storage');
  await timeSection('Upload', () => start('router:store'));

  if (!process.env.NOCLEANUP) {
    logger.info('Remove oldest street only graph data versions from storage');
    await start('storage:cleanupStreetOnlyGraphData');
  }
}

/**
 * This function does the whole build.
 */
async function buildGraph(routerId) {
  await handleCleanup();

  await handleSeeding();

  await handleOsmAndDemUpdate();

  await handleTransitDataUpdate();

  logger.info('Build routing graph');
  await timeSection('Build graph', () => start('router:buildGraph'));

  await handleTests();

  const logFile = 'failed_feeds.txt';
  if (fs.existsSync(logFile)) {
    await timeSection('GTFS fallback + rebuild', async () => {
      await handleGtfsFallback(logFile);
      // rebuild the graph
      logger.info('Rebuild graph using fallback data');
      await start('router:buildGraph');
    });
  }

  const date = getDateStringForDockerTag();
  global.storageDirName = `${process.env.DOCKER_TAG}/${date}/${routerId}`;

  logger.info('Uploading data to storage');
  await timeSection('Upload', () => start('router:store'));

  await buildAndDeployDockerImages(date);
}

/**
 * This function builds the graph from prebuilt street graph data.
 */
async function buildWithPrebuiltStreetGraph(routerId) {
  await handleCleanup();

  await handleSeeding();

  await handleTransitDataUpdate();

  logger.info('Build routing graph from prebuilt street only graph');
  await timeSection('Build graph', () =>
    start('router:buildWithPrebuiltStreetGraph'),
  );

  await handleTests();

  const logFile = 'failed_feeds.txt';
  if (fs.existsSync(logFile)) {
    await timeSection('GTFS fallback + rebuild', async () => {
      await handleGtfsFallback(logFile);
      // rebuild the graph
      logger.info('Rebuild graph using fallback data');
      await start('router:buildWithPrebuiltStreetGraph');
    });
  }

  const date = getDateStringForDockerTag();
  global.storageDirName = `${process.env.DOCKER_TAG}/${date}/${routerId}`;

  logger.info('Uploading data to storage');
  await timeSection('Upload', () =>
    start('router:storeForPrebuiltStreetGraphDataBuild'),
  );

  await buildAndDeployDockerImages(date);
}

async function update() {
  // check environmental variables which needs to be defined
  assert(process.env.DOCKER_TAG !== undefined, 'DOCKER_TAG must be defined');

  try {
    let description;
    switch (SPLIT_BUILD_TYPE) {
      case 'ONLY_BUILD_STREET_GRAPH':
        await buildStreetOnlyGraph(router.id);
        description = 'street only graph data updated';
        break;
      case 'USE_PREBUILT_STREET_GRAPH':
        await buildWithPrebuiltStreetGraph(router.id);
        description = 'data updated from prebuilt street only graph';
        break;
      default:
        await buildGraph(router.id);
        description = 'data updated';
        break;
    }

    if (global.hasFailures) {
      await finalizeBuild({
        statusMessage: `${router.id} ${description}, but partially falling back to older data`,
        statusLevel: 'warn',
        summaryPrefix: 'Section timings',
        exitCode: 0,
      });
    } else {
      await finalizeBuild({
        statusMessage: `${router.id} ${description} :white_check_mark:`,
        summaryPrefix: 'Section timings',
        exitCode: 0,
      });
    }
  } catch (err) {
    if (!err.isAbort) {
      // post the error detail/stack as a thread reply for debugging; abort
      // errors already have a concise, user-friendly message so skip this
      await postSlackMessage(
        `${router.id} data update failed:\n${formatCodeBlock(err.message)}`,
        'error',
      );
    }
    await finalizeBuild({
      statusMessage: err.isAbort
        ? err.message
        : 'Something went wrong with the data update',
      statusLevel: 'error',
      summaryPrefix: 'Section timings',
      exitCode: 1,
    });
  }
}

module.exports = {
  update,
};
