const fs = require('fs')
const { execSync } = require('child_process')
const gulp = require('gulp')
const dl = require('./task/Download')
const dlBlob = require('./task/DownloadDEMBlob')
const { setFeedIdTask } = require('./task/setFeedId')
const { OBAFilterTask } = require('./task/OBAFilter')
const { fitGTFSTask } = require('./task/MapFit')
const { validateBlobSize } = require('./task/BlobValidation')
const { testOTPFile } = require('./task/OTPTest')
const Seed = require('./task/Seed')
const prepareRouterData = require('./task/prepareRouterData')
const del = require('del')
const config = require('./config')
const { buildOTPGraphTask } = require('./task/buildOTPGraph')
const hslHackTask = require('./task/hslHackTask')
const { postSlackMessage } = require('./util')

/**
 * Download and test new osm data
 */
gulp.task('osm:update', function () {
  const osmFiles = [...new Set(config.ALL_CONFIGS().map(cfg => cfg.osm))]
  const urls = osmFiles.length > 0 ? osmFiles.map(key => config.osmMap[key]) : [config.osmMap['finland']]
  return dl(urls)
    .pipe(gulp.dest(`${config.dataDir}/downloads/osm`))
    .pipe(validateBlobSize())
    .pipe(testOTPFile())
    .pipe(gulp.dest(`${config.dataDir}/ready/osm`))
})

/**
 * Download and test new dem data
 */
gulp.task('dem:update', function () {
  const map = config.ALL_CONFIGS().map(cfg => cfg.dem).reduce((acc, val) => { acc[val] = true; return acc }, {})
  const urls = Object.keys(map).map(key => config.demMap[key]).filter((url) => (url !== undefined))
  if (urls.length === 0) {
    return Promise.resolve()
  }
  const demDownloadDir = `${config.dataDir}/downloads/dem/`
  if (!fs.existsSync(demDownloadDir)) {
    execSync(`mkdir -p ${demDownloadDir}`)
  }
  const demReadyDir = `${config.dataDir}/ready/dem/`
  if (!fs.existsSync(demReadyDir)) {
    execSync(`mkdir -p ${demReadyDir}`)
  }
  const promises = dlBlob(urls, true, true)
  return Promise.all(promises)
    .catch((err) => {
      if (err === 'fail') {
        process.stdout.write('Failing build because of a failed DEM download!\n')
        postSlackMessage(`Failing build because of a failed DEM download.`)
        process.exit(1)
      }
    })
})

gulp.task('del:filter', () => del([`${config.dataDir}/filter`]))

gulp.task('del:id', () => del([`${config.dataDir}/id`]))

/**
 * download and test new gtfs data:
 * clear download & stage dir
 * 1. download
 * 2. name zip as <id>.zip (in dir download)
 * 3. test zip loads with OpenTripPlanner
 * 4. copy to id dir if test is succesful
 */
gulp.task('gtfs:dl', gulp.series('del:id', function () {
  const urlEntry = {}
  config.ALL_CONFIGS().map(cfg => cfg.src).reduce((acc, val) => acc.concat(val), []).forEach(
    (entry) => {
      if (urlEntry[entry.url] === undefined) {
        urlEntry[entry.url] = entry
      }
    }
  )

  const files = Object.keys(urlEntry).map(key => urlEntry[key])

  return dl(files)
    .pipe(gulp.dest(`${config.dataDir}/downloads/gtfs`))
  //    .pipe(vinylPaths(del))
    .pipe(testOTPFile())
    .pipe(gulp.dest(`${config.dataDir}/fit/gtfs`))
}))

// Add feedId to gtfs files in id dir, and moves files to directory 'fit'
gulp.task('gtfs:id', function () {
  return gulp.src([`${config.dataDir}/id/gtfs/*`])
    .pipe(setFeedIdTask())
  //    .pipe(vinylPaths(del))
    .pipe(gulp.dest(`${config.dataDir}/ready/gtfs`))
})

gulp.task('hslHack', function () {
  return hslHackTask()
})

// Run MapFit on gtfs files (based on config) and moves files to directory
// 'filter'
gulp.task('gtfs:fit', gulp.series('del:filter', 'hslHack', function () {
  return gulp.src([`${config.dataDir}/fit/gtfs/*`])
    .pipe(fitGTFSTask(config.configMap))
    // .pipe(vinylPaths(del))
    .pipe(gulp.dest(`${config.dataDir}/filter/gtfs`))
}))

gulp.task('copyRouterConfig', function () {
  return gulp.src(['router-*/**']).pipe(
    gulp.dest(config.dataDir))
})

// Run one of more filter runs on gtfs files(based on config) and moves files to
// directory 'ready'
gulp.task('gtfs:filter', gulp.series('copyRouterConfig', function () {
  return gulp.src([`${config.dataDir}/filter/gtfs/*`])
    .pipe(OBAFilterTask(config.configMap))
    // .pipe(vinylPaths(del))
    .pipe(gulp.dest(`${config.dataDir}/id/gtfs`))
}))

gulp.task('gtfs:del', () => del([`${config.dataDir}/ready/gtfs`]))

gulp.task('gtfs:seed', gulp.series('gtfs:del', function () {
  return Seed(config.ALL_CONFIGS(), /\.zip/).pipe(gulp.dest(`${config.dataDir}/ready/gtfs`))
}))

gulp.task('osm:del', () => del([`${config.dataDir}/ready/osm`]))

gulp.task('osm:seed', gulp.series('osm:del', function () {
  return Seed(config.ALL_CONFIGS(), /.pbf/).pipe(gulp.dest(`${config.dataDir}/ready/osm`))
}))

gulp.task('dem:del', () => del([`${config.dataDir}/ready/dem`]))

gulp.task('dem:seed', gulp.series('dem:del', function () {
  return Seed(config.ALL_CONFIGS(), /.tif/).pipe(gulp.dest(`${config.dataDir}/ready/dem`))
}))

/**
 * Seed DEM, GTFS & OSM data with data from previous data-containes to allow
 * continuous flow of data into production when one or more updated data files
 * are broken.
 */
gulp.task('seed', gulp.series('dem:seed', 'osm:seed', 'gtfs:seed'))

gulp.task('router:del', () => del([`${config.dataDir}/build`]))

gulp.task('router:copy', gulp.series('router:del', function () {
  return prepareRouterData(config.ALL_CONFIGS()).pipe(gulp.dest(`${config.dataDir}/build`))
}))

gulp.task('router:buildGraph', gulp.series('router:copy', function () {
  gulp.src(['otp-data-container/*', 'otp-data-container/.*'])
    .pipe(gulp.dest(`${config.dataDir}/build/waltti`))
    .pipe(gulp.dest(`${config.dataDir}/build/finland`))
    .pipe(gulp.dest(`${config.dataDir}/build/hsl`))
    .pipe(gulp.dest(`${config.dataDir}/build/varely`))
  return buildOTPGraphTask(config.ALL_CONFIGS())
}))
