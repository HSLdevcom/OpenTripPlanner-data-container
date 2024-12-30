/*
Executes gulp tasks which download new data, builds and tests a new graph, saves it in storage and deploys
new opentripplanner-data-server and opentripplanner versions that use that data.
Data errors are detected and tolerated to a certain limit thanks to fallback mechanism to older data.
Unexpected code execution errors and failures in graph build abort the data loading.
*/
const gulp = require('gulp')
const { promisify } = require('util')
const { execFileSync } = require('child_process')
const fs = require('fs')
const { postSlackMessage, updateSlackMessage } = require('../util')
require('../gulpfile')
const { router } = require('../config')
const assert = require('assert')

const MAX_GTFS_FALLBACK = 2 // threshold for aborting data loading

const start = promisify((task, cb) => gulp.series(task)(cb))

async function update() {
  // check environmental variables which needs to be defined
  assert(process.env.DOCKER_TAG !== undefined, 'DOCKER_TAG must be defined')

  if (!process.env.NOSEED) {
    process.stdout.write('Starting seeding\n')
    await start('seed')
    process.stdout.write('Seeded\n')
  }

  if (!process.env.NODEM) {
    // we track data rejections using this global variable
    global.hasFailures = false
    await start('dem:update')
    if (global.hasFailures) {
      postSlackMessage('DEM update failed, using previous version :boom:')
    }
  }
  
  // OSM update is more complicated. Download often fails, so there is a retry loop,
  //  which breaks when a big enough file gets loaded
  global.blobSizeOk = false // ugly hack but gulp does not return any values from tasks
  for (let i = 0; i < 3; i++) {
    await start('osm:update')
    if (global.blobSizeOk) {
      break
    }
    if (i < 2) {
      // sleep 10 mins before next attempt
      await new Promise(resolve => setTimeout(resolve, 600000))
    }
  }
  if (!global.blobSizeOk) {
    global.hasFailures = true
    postSlackMessage('OSM data update failed, using previous version :boom:')
  }

  const name = router.id
  try {
    await start('gtfs:update')

    process.stdout.write('Build routing graph\n')
    await start('router:buildGraph')

    if (process.env.SKIPPED_SITES === 'all' || process.env.SKIP_OTP_TESTS) {
      process.stdout.write('Skipping all tests')
    } else {
      process.stdout.write('Test the newly built graph with OTPQA\n')
      execFileSync('./test.sh', [], { stdio: [0, 1, 2] })
    }

    const logFile = 'failed_feeds.txt'
    if (fs.existsSync(logFile)) { // testing detected routing problems
      global.hasFailures = true

      global.failedFeeds = fs.readFileSync(logFile, 'utf8') // comma separated list of feed ids. No newline at end!
      fs.unlinkSync(logFile) // cleanup for local use

      if (global.failedFeeds.split(',').length > MAX_GTFS_FALLBACK) {
        updateSlackMessage('Aborting the data update because too many quality tests failed :boom:')
        process.exit(1)
      }

      postSlackMessage(`GTFS packages ${global.failedFeeds} rejected, using fallback to current data`)
      // use seed packages for failed feeds
      await start('gtfs:fallback')

      // rebuild the graph
      process.stdout.write('Rebuild graph using fallback data\n')
      await start('router:buildGraph')
    }

    // Docker tags don't work with ':' and file names are also prettier without them. We also need to
    // remove milliseconds because they are not relevant and make converting string back to ISO format
    // more difficult.
    const date = new Date().toISOString().slice(0, -5).concat('Z').replace(/:/g, '.')

    global.storageDirName = `${process.env.DOCKER_TAG}/${date}/${name}`

    process.stdout.write('Uploading data to storage\n')
    await start('router:store')


    process.stdout.write('Build and deploy Docker images\n')
    execFileSync('./otp-data-server/deploy.sh', [date], {
      stdio: [0, 1, 2], env: {
        OTP_TAG: process.env.OTP_TAG,
        OTP_GRAPH_DIR: global.storageDirName,
        ROUTER_NAME: process.env.ROUTER_NAME,
        ORG: process.env.ORG,
        DOCKER_TAG: process.env.DOCKER_TAG,
        DOCKER_USER: process.env.DOCKER_USER,
        DOCKER_AUTH: process.env.DOCKER_AUTH
      }
    })
    execFileSync('./opentripplanner/deploy-otp.sh', [date], {
      stdio: [0, 1, 2], env: {
        OTP_GRAPH_DIR: global.storageDirName,
        ROUTER_NAME: process.env.ROUTER_NAME,
        ORG: process.env.ORG,
        DOCKER_TAG: process.env.DOCKER_TAG,
        DOCKER_USER: process.env.DOCKER_USER,
        DOCKER_AUTH: process.env.DOCKER_AUTH
      }
    })

    if (!process.env.NOCLEANUP) {
      process.stdout.write('Remove oldest data versions from storage\n')
      await start('storage:cleanup')
    }

    if (global.hasFailures) {
      updateSlackMessage(`${name} data updated, but partially falling back to older data :boom:`)
    } else {
      updateSlackMessage(`${name} data updated :white_check_mark:`)
    }
  } catch (err) {
    postSlackMessage(`${name} data update failed: ` + err.message)
    updateSlackMessage('Something went wrong with the data update :boom:')
  }
}

module.exports = {
  update
}
