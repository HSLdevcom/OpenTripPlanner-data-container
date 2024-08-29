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
const seed = require('./task/Seed')
const prepareRouterData = require('./task/prepareRouterData')
const del = require('del')
const config = require('./config')
const { buildOTPGraphTask } = require('./task/buildOTPGraph')
const hslHackTask = require('./task/hslHackTask')
const patchDeploymentFiles = require('./task/PatchDeploymentFiles')
const storageCleanup = require('./task/StorageCleanup')
const { postSlackMessage } = require('./util')

const routerId = config.ALL_CONFIGS()[0].id

const seedSourceDir = `${config.dataDir}/router-${routerId}` // e.g. data/router-hsl

const osmDir = `${config.dataDir}/ready/osm`
const demDir = `${config.dataDir}/ready/dem`
const gtfsDir = `${config.dataDir}/ready/gtfs`
const gtfsSeedDir = `${config.dataDir}/seed`

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

gulp.task('gtfs:seed', gulp.series('gtfs:del',
  () => gulp.src(`${seedSourceDir}/*-gtfs.zip`).pipe(gulp.dest(gtfsSeedDir)).pipe(gulp.dest(gtfsDir))))

gulp.task('osm:del', () => del([`${config.dataDir}/ready/osm`]))


gulp.task('osm:seed', gulp.series('osm:del',
  () => gulp.src(`${seedSourceDir}/*.pbf`).pipe(gulp.dest(osmDir))))

gulp.task('dem:del', () => del([`${config.dataDir}/ready/dem`]))

gulp.task('dem:seed', gulp.series('dem:del',
  () => gulp.src(`${seedSourceDir}/*.tif`).pipe(gulp.dest(demDir))))

gulp.task('seed:cleanup', () => del([seedSourceDir, `${config.dataDir}/*.zip`]))

/**
 * Seed DEM, GTFS & OSM data with data from previous data-containes to allow
 * continuous flow of data into production when one or more updated data files
 * are broken.
 */
gulp.task('seed', gulp.series(() => seed(config.storageDir, config.dataDir, routerId, process.env.SEED_TAG), 'dem:seed', 'osm:seed', 'gtfs:seed', 'seed:cleanup'))

gulp.task('router:del', () => del([`${config.dataDir}/build`]))

gulp.task('router:copy', gulp.series('router:del', function () {
  return prepareRouterData(config.ALL_CONFIGS()).pipe(gulp.dest(`${config.dataDir}/build`))
}))

gulp.task('router:buildGraph', gulp.series('router:copy', () => buildOTPGraphTask(config.ALL_CONFIGS())))

gulp.task('router:store', () =>
  gulp.src(`${config.dataDir}/build/${routerId}/**/*`, { buffer: false }).pipe(gulp.dest(`${config.storageDir}/${global.storageDirName}/`))
)

gulp.task('deploy:prepare', () => patchDeploymentFiles())

gulp.task('storage:cleanup', () => storageCleanup(config.storageDir, routerId, process.env.SEED_TAG))
