const gulp = require('gulp');
const dl = require('./task/Download');
const dlBlob = require('./task/DownloadDEMBlob');
const { setFeedIdTask } = require('./task/SetFeedId');
const { OBAFilterTask } = require('./task/OBAFilter');
const prepareFit = require('./task/PrepareFit');
const mapFit = require('./task/MapFit');
const { validateBlobSize } = require('./task/BlobValidation');
const { testOTPFile } = require('./task/OTPTest');
const seed = require('./task/Seed');
const {
  prepareRouterData,
  prepareRouterDataForStreetOnlyGraphBuild,
  prepareRouterDataForPrebuiltStreetGraphBuild,
} = require('./task/PrepareRouterData');
const del = require('del');
const config = require('./config');
const {
  buildOTPGraphTask,
  buildOTPStreetOnlyGraphTask,
} = require('./task/BuildOTPGraph');
const { renameGTFSFile } = require('./task/GTFSRename');
const { replaceGTFSFilesTask } = require('./task/GTFSReplace');
const { extractFilesTask, addFilesTask } = require('./task/ZipTask');
const { createDir } = require('./util');
const storageCleanup = require('./task/StorageCleanup');

const seedSourceDir = `${config.dataDir}/router-${config.router.id}`; // e.g. data/router-hsl

const osmDlDir = `${config.dataDir}/downloads/osm`;
const demDlDir = `${config.dataDir}/downloads/dem`;
const gtfsDlDir = `${config.dataDir}/downloads/gtfs`;

const osmDir = `${config.dataDir}/ready/osm`;
const demDir = `${config.dataDir}/ready/dem`;
const gtfsDir = `${config.dataDir}/ready/gtfs`;

const gtfsSeedDir = `${config.dataDir}/seed`;
const fitDir = `${config.dataDir}/fit`;
const filterDir = `${config.dataDir}/filter`;
const idDir = `${config.dataDir}/id`;
const tmpIdDir = `${config.dataDir}/tmp-id`;
const testGtfsDir = `${config.dataDir}/test/gtfs`;
const tmpDir = `${config.dataDir}/tmp`;
const tmpRenameDir = `${config.dataDir}/tmp-rename`;
const renamedDir = `${config.dataDir}/renamed`;

/**
 * Download osm data
 */
gulp.task('osm:download', async cb => {
  if (!config.osm) {
    return Promise.resolve();
  }
  createDir(osmDlDir);
  createDir(osmDir);
  await dl(config.osm, osmDlDir);
  cb();
});

gulp.task(
  'osm:update',
  gulp.series(
    'osm:download',
    () =>
      gulp
        .src(`${osmDlDir}/*`, { buffer: false })
        .pipe(validateBlobSize())
        .pipe(testOTPFile())
        .pipe(gulp.dest(osmDir)),
    () => del(tmpDir),
  ),
);

/**
 * Download and test new dem data
 */
gulp.task('dem:update', () => {
  if (!config.dem) {
    return Promise.resolve();
  }
  createDir(demDlDir);
  createDir(demDir);
  return Promise.all(dlBlob(config.dem)).catch(() => {
    global.hasFailures = true;
  });
});

gulp.task('del:filter', () => del(filterDir));
gulp.task('del:fit', () => del(fitDir));
gulp.task('del:id', () => del(idDir));

/**
 * 1. download
 * 2. name zip as <id>-gtfs.zip (in dir 'download')
 * 3. test zip with OpenTripPlanner
 * 4. copy to fit dir if test is succesful
 */
gulp.task(
  'gtfs:dl',
  gulp.series(
    'del:fit',
    cb => {
      dl(config.router.src, gtfsDlDir).then(() => {
        cb();
      });
    },
    () =>
      gulp
        .src(`${gtfsDlDir}/*`, { buffer: false })
        .pipe(renameGTFSFile())
        .pipe(gulp.dest(renamedDir))
        .pipe(replaceGTFSFilesTask(config.gtfsMap))
        .pipe(gulp.dest(fitDir)),
    () => del([tmpRenameDir]),
  ),
);

// Add feedId to gtfs files in id dir, and moves files to directory 'test/gtfs'
gulp.task('gtfs:id', () =>
  gulp
    .src(`${idDir}/*`, { buffer: false })
    .pipe(setFeedIdTask())
    .pipe(gulp.dest(testGtfsDir)),
);

// Runs mapFit on gtfs files if fit is enabled, or just moves files to directory 'filter'
gulp.task(
  'gtfs:fit',
  config.router.src.some(src => src.fit)
    ? gulp.series(
        'del:filter',
        () => prepareFit(config),
        () =>
          gulp
            .src(`${fitDir}/*`, { buffer: false })
            .pipe(extractFilesTask(['stops.txt']))
            .pipe(mapFit(config)) // modify backup of stops.txt
            .pipe(addFilesTask(['stops.txt']))
            .pipe(gulp.dest(filterDir)),
        () => del(tmpDir),
      )
    : () =>
        gulp.src(`${fitDir}/*`, { buffer: false }).pipe(gulp.dest(filterDir)),
);

gulp.task('copyRules', () =>
  gulp
    .src(`${config.router.id}/gtfs-rules/*`, { buffer: false })
    .pipe(gulp.dest(`${config.dataDir}/${config.router.id}/gtfs-rules`)),
);

// Filter gtfs files and move result to directory 'id'
gulp.task(
  'gtfs:filter',
  gulp.series(
    'copyRules',
    'del:id',
    () =>
      gulp
        .src(`${filterDir}/*.zip`, { buffer: false })
        .pipe(extractFilesTask(config.passOBAfilter))
        .pipe(OBAFilterTask(config.gtfsMap))
        .pipe(addFilesTask(config.passOBAfilter))
        .pipe(gulp.dest(idDir)),
    () => del(tmpDir),
  ),
);

// Test gtfs files and move result to directory 'ready/gtfs'
gulp.task('gtfs:test', () =>
  gulp
    .src(`${testGtfsDir}/*`, { buffer: false })
    .pipe(testOTPFile())
    .pipe(gulp.dest(gtfsDir)),
);

gulp.task(
  'gtfs:update',
  gulp.series(
    'gtfs:dl',
    'gtfs:fit',
    'gtfs:filter',
    'gtfs:id',
    'gtfs:test',
    () => del(tmpIdDir),
  ),
);

// move listed packages from seed to ready
gulp.task('gtfs:fallback', () => {
  const sources = global.failedFeeds
    .split(',')
    .map(feed => `${gtfsSeedDir}/${feed}-gtfs.zip`);
  return gulp.src(sources, { buffer: false }).pipe(gulp.dest(gtfsDir));
});

gulp.task('gtfs:del', () => del([gtfsSeedDir, gtfsDir]));

gulp.task(
  'gtfs:seed',
  gulp.series('gtfs:del', () =>
    gulp
      .src(`${seedSourceDir}/*-gtfs.zip`, { buffer: false })
      .pipe(gulp.dest(gtfsSeedDir))
      .pipe(gulp.dest(gtfsDir)),
  ),
);

gulp.task('osm:del', () => del(osmDir));

gulp.task(
  'osm:seed',
  gulp.series('osm:del', () =>
    gulp
      .src(`${seedSourceDir}/*.pbf`, { buffer: false })
      .pipe(gulp.dest(osmDir)),
  ),
);

gulp.task('dem:del', () => del(demDir));

gulp.task(
  'dem:seed',
  gulp.series('dem:del', () =>
    gulp
      .src(`${seedSourceDir}/*.tif`, { buffer: false })
      .pipe(gulp.dest(demDir)),
  ),
);

gulp.task('seed:cleanup', () =>
  del([seedSourceDir, `${config.dataDir}/*.zip`]),
);

/**
 * Seed DEM, GTFS & OSM data with data from a previous build to allow
 * continuous flow of data into production when one or more updated data files
 * are broken. The data is loaded from a storage that should persist between builds.
 */
gulp.task(
  'seed',
  gulp.series(
    () =>
      seed(
        config.storageDir,
        config.dataDir,
        config.router.id,
        process.env.SEED_TAG,
      ),
    'dem:seed',
    'osm:seed',
    'gtfs:seed',
    'seed:cleanup',
  ),
);

gulp.task('router:del', () => del(`${config.dataDir}/build`));

gulp.task(
  'router:copy',
  gulp.series('router:del', () =>
    prepareRouterData(config.router).pipe(
      gulp.dest(`${config.dataDir}/build/${config.router.id}`),
    ),
  ),
);

gulp.task(
  'router:buildGraph',
  gulp.series('router:copy', () => buildOTPGraphTask(config.router)),
);

gulp.task(
  'router:copyForPrebuiltStreetGraphDataBuild',
  gulp.series('router:del', () =>
    prepareRouterDataForPrebuiltStreetGraphBuild(config.router).pipe(
      gulp.dest(`${config.dataDir}/build/${config.router.id}`),
    ),
  ),
);

gulp.task(
  'router:buildWithPrebuiltStreetGraph',
  gulp.series('router:copyForPrebuiltStreetGraphDataBuild', () =>
    buildOTPGraphTask(config.router),
  ),
);

gulp.task(
  'router:copyStreetOnlyGraphData',
  gulp.series('router:del', () =>
    prepareRouterDataForStreetOnlyGraphBuild(config.router).pipe(
      gulp.dest(`${config.dataDir}/build/${config.router.id}`),
    ),
  ),
);

gulp.task(
  'router:buildStreetOnlyGraph',
  gulp.series('router:copyStreetOnlyGraphData', () =>
    buildOTPStreetOnlyGraphTask(config.router),
  ),
);

gulp.task('router:store', () =>
  gulp
    .src(`${config.dataDir}/build/${config.router.id}/**/*`, { buffer: false })
    .pipe(gulp.dest(`${config.storageDir}/${global.storageDirName}/`)),
);

gulp.task(
  'router:storeForPrebuiltStreetGraphDataBuild',
  gulp.series('router:store', () =>
    gulp
      .src(`${global.osmPrebuildDir}/report/*`, { buffer: false })
      .pipe(
        gulp.dest(
          `${config.storageDir}/${global.storageDirName}/street-report/`,
        ),
      ),
  ),
);

gulp.task('storage:cleanup', () =>
  storageCleanup(config.storageDir, config.router.id, process.env.SEED_TAG),
);

gulp.task('storage:cleanupStreetOnlyGraphData', () =>
  storageCleanup(
    config.storageDir,
    config.router.id,
    `osm-builds/${process.env.SEED_TAG}`,
  ),
);
