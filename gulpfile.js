const fs = require('fs')
const { execSync } = require('child_process')
const gulp = require('gulp')
const dl = require('./task/Download')
const dlBlob = require('./task/DownloadDEMBlob')
const { setFeedIdTask } = require('./task/SetFeedId')
const { OBAFilterTask } = require('./task/OBAFilter')
const prepareFit = require('./task/PrepareFit')
const mapFit = require('./task/MapFit')
const { validateBlobSize } = require('./task/BlobValidation')
const { testOTPFile } = require('./task/OTPTest')
const seed = require('./task/Seed')
const prepareRouterData = require('./task/PrepareRouterData')
const del = require('del')
const config = require('./config')
const { buildOTPGraphTask } = require('./task/BuildOTPGraph')
const { renameGTFSFile } = require('./task/GTFSRename')
const { replaceGTFSFilesTask } = require('./task/GTFSReplace')
const { extractFromZip, addToZip } = require('./task/ZipTask')
const storageCleanup = require('./task/StorageCleanup')

const seedSourceDir = `${config.dataDir}/router-${config.router.id}` // e.g. data/router-hsl

const osmDlDir = `${config.dataDir}/downloads/osm`
const demDlDir = `${config.dataDir}/downloads/dem`
const gtfsDlDir = `${config.dataDir}/downloads/gtfs`

const osmDir = `${config.dataDir}/ready/osm`
const demDir = `${config.dataDir}/ready/dem`
const gtfsDir = `${config.dataDir}/ready/gtfs`

const gtfsSeedDir = `${config.dataDir}/seed`
const fitDir = `${config.dataDir}/fit`
const filterDir = `${config.dataDir}/filter`
const idDir = `${config.dataDir}/id`
const tmpDir = `${config.dataDir}/tmp`

/**
 * Download osm data
 */
gulp.task('osm:download', async cb => {
  if (!config.osm) {
    return Promise.resolve()
  }
  if (!fs.existsSync(osmDlDir)) {
    execSync(`mkdir -p ${osmDlDir}`)
  }
  if (!fs.existsSync(osmDir)) {
    execSync(`mkdir -p ${osmDir}`)
  }
  await dl(config.osm, osmDlDir)
  cb()
})

gulp.task('osm:update', gulp.series(
  'osm:download',
  () => gulp.src(`${osmDlDir}/*`)
    .pipe(validateBlobSize())
    .pipe(testOTPFile())
    .pipe(gulp.dest(osmDir)),
  () => del(tmpDir)
))

/**
 * Download and test new dem data
 */
gulp.task('dem:update', () => {
  if (!config.dem) {
    return Promise.resolve()
  }
  if (!fs.existsSync(demDlDir)) {
    execSync(`mkdir -p ${demDlDir}`)
  }
  if (!fs.existsSync(demDir)) {
    execSync(`mkdir -p ${demDir}`)
  }
  return Promise.all(dlBlob(config.dem)).catch(() => { global.hasFailures = true })
})

gulp.task('del:filter', () => del(filterDir))
gulp.task('del:fit', () => del(fitDir))
gulp.task('del:id', () => del(idDir))

/**
 * 1. download
 * 2. name zip as <id>-gtfs.zip (in dir 'download')
 * 3. test zip with OpenTripPlanner
 * 4. copy to fit dir if test is succesful
 */
gulp.task('gtfs:dl', gulp.series(
  'del:fit',
  cb => {
    dl(config.router.src, tmpDir).then(() => {
      cb()
    })
  },
  () => gulp.src(`${tmpDir}/*`)
    .pipe(renameGTFSFile())
    .pipe(replaceGTFSFilesTask(config.gtfsMap))
    .pipe(gulp.dest(gtfsDlDir))
    .pipe(testOTPFile())
    .pipe(gulp.dest(fitDir)),
  () => del(tmpDir)
))

// Add feedId to gtfs files in id dir, and moves files to directory 'ready'
gulp.task('gtfs:id', () => gulp.src(`${idDir}/*`)
  .pipe(setFeedIdTask())
  .pipe(gulp.dest(gtfsDir)))

// Runs mapFit on gtfs files if fit is enabled, or just moves files to directory 'filter'
gulp.task('gtfs:fit', config.router.src.some(src => src.fit)
  ? gulp.series(
    'del:filter',
    () => prepareFit(config),
    () => gulp.src(`${fitDir}/*`)
      .pipe(extractFromZip(['stops.txt']))
      .pipe(mapFit(config)) // modify backup of stops.txt
      .pipe(addToZip(['stops.txt']))
      .pipe(gulp.dest(filterDir)),
    () => del(tmpDir))
  : () => gulp.src(`${fitDir}/*`)
      .pipe(gulp.dest(filterDir))
)

gulp.task('copyRules', () =>
  gulp.src(`${config.router.id}/gtfs-rules/*`).pipe(gulp.dest(`${config.dataDir}/${config.router.id}/gtfs-rules`))
)

// Filter gtfs files and move result to directory 'id'
gulp.task('gtfs:filter', gulp.series(
  'copyRules',
  () => gulp.src(`${filterDir}/*.zip`)
    .pipe(extractFromZip(config.passOBAfilter))
    .pipe(OBAFilterTask(config.gtfsMap))
    .pipe(addToZip(config.passOBAfilter))
    .pipe(gulp.dest(idDir)),
  () => del(tmpDir)
))

gulp.task('gtfs:update', gulp.series('gtfs:dl', 'gtfs:fit', 'gtfs:filter', 'gtfs:id'))

// move listed packages from seed to ready
gulp.task('gtfs:fallback', () => {
  const sources = global.failedFeeds.split(',').map(feed => `${gtfsSeedDir}/${feed}-gtfs.zip`)
  return gulp.src(sources).pipe(gulp.dest(gtfsDir))
})

gulp.task('gtfs:del', () => del([gtfsSeedDir, gtfsDir]))

gulp.task('gtfs:seed', gulp.series('gtfs:del',
  () => gulp.src(`${seedSourceDir}/*-gtfs.zip`).pipe(gulp.dest(gtfsSeedDir)).pipe(gulp.dest(gtfsDir))))

gulp.task('osm:del', () => del(osmDir))

gulp.task('osm:seed', gulp.series('osm:del',
  () => gulp.src(`${seedSourceDir}/*.pbf`).pipe(gulp.dest(osmDir))))

gulp.task('dem:del', () => del(demDir))

gulp.task('dem:seed', gulp.series('dem:del',
  () => gulp.src(`${seedSourceDir}/*.tif`).pipe(gulp.dest(demDir))))

gulp.task('seed:cleanup', () => del([seedSourceDir, `${config.dataDir}/*.zip`]))

/**
 * Seed DEM, GTFS & OSM data with data from a previous build to allow
 * continuous flow of data into production when one or more updated data files
 * are broken. The data is loaded from a storage that should persist between builds.
 */
gulp.task('seed', gulp.series(() => seed(config.storageDir, config.dataDir, config.router.id, process.env.SEED_TAG), 'dem:seed', 'osm:seed', 'gtfs:seed', 'seed:cleanup'))

gulp.task('router:del', () => del(`${config.dataDir}/build`))

gulp.task('router:copy', gulp.series('router:del',
  () => prepareRouterData(config.router).pipe(gulp.dest(`${config.dataDir}/build/${config.router.id}`))))

gulp.task('router:buildGraph', gulp.series('router:copy', () => buildOTPGraphTask(config.router)))

gulp.task('router:store', () =>
  gulp.src(`${config.dataDir}/build/${config.router.id}/**/*`, { buffer: false }).pipe(gulp.dest(`${config.storageDir}/${global.storageDirName}/`))
)

gulp.task('storage:cleanup', () => storageCleanup(config.storageDir, config.router.id, process.env.SEED_TAG))
