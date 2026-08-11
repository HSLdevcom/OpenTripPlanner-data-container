const { pipeline } = require('node:stream/promises');
const gulp = require('gulp');
const rename = require('gulp-rename');
const dl = require('./task/Download');
const dlBlob = require('./task/DownloadDEMBlob');
const { setFeedIdTask } = require('./task/SetFeedId');
const { OBAFilterTask } = require('./task/OBAFilter');
const prepareFit = require('./task/PrepareFit');
const mapFit = require('./task/MapFit');
const { validateBlobSize } = require('./task/BlobValidation');
const { testOTPFile } = require('./task/OTPTest');
const { runOSMPreprocessing } = require('./task/OSMPreprocessing');
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
const { renameFile } = require('./task/RenameFile');
const { replaceGTFSFilesTask } = require('./task/GTFSReplace');
const { extractFilesTask, addFilesTask } = require('./task/ZipTask');
const storageCleanup = require('./task/StorageCleanup');

// Warning! Lots of string interpolation all over the code. None of these
// inputs are allowed to have whitespace characters in them.

if (/\s/.test(config.dataDir) || /\s/.test(config.router.id)) {
  throw new Error(
    'no whitespace allowed in config.dataDir or config.router.id',
  );
}

const seedSourceDir = `${config.dataDir}/router-${config.router.id}`; // e.g. data/router-hsl

const osmDlDir = `${config.dataDir}/downloads/osm`;
const demDlDir = `${config.dataDir}/downloads/dem`;
const gtfsDlDir = `${config.dataDir}/downloads/gtfs`;
const netexDlDir = `${config.dataDir}/downloads/netex`;
const carPickupZoneDlDir = `${config.dataDir}/downloads/carpickupzone`;

const osmDir = `${config.dataDir}/ready/osm`;
const demDir = `${config.dataDir}/ready/dem`;
const gtfsDir = `${config.dataDir}/ready/gtfs`;
const netexDir = `${config.dataDir}/ready/netex`;
const carPickupZoneDir = `${config.dataDir}/ready/carpickupzone`;

const gtfsSeedDir = `${config.dataDir}/seed`;
const fitDir = `${config.dataDir}/fit`;
const filterDir = `${config.dataDir}/filter`;
const idDir = `${config.dataDir}/id`;
const tmpIdDir = `${config.dataDir}/tmp-id`;
const testGtfsDir = `${config.dataDir}/test/gtfs`;
const tmpDir = `${config.dataDir}/tmp`;
const tmpRenameDir = `${config.dataDir}/tmp-rename`;
const renamedDir = `${config.dataDir}/renamed`;

const noBuf = { buffer: false }; // options for gulp src

/**
 * Download netex data
 */
gulp.task('netex:download', () => {
  if (!config.router.netex) {
    return Promise.resolve();
  }
  return dl(config.router.netex, netexDlDir);
});

gulp.task('netex:rename', () =>
  pipeline(
    gulp.src(`${netexDlDir}/*`, noBuf),
    renameFile('-netex'),
    gulp.dest(netexDir),
  ),
);

gulp.task('netex:update', gulp.series('netex:download', 'netex:rename'));

/**
 * Download car pickup zone data
 */
gulp.task('carPickupZone:download', () => {
  if (!config.router.carPickupZone) {
    return Promise.resolve();
  }
  return dl(config.router.carPickupZone, carPickupZoneDlDir);
});

gulp.task('carPickupZone:rename', () =>
  pipeline(
    gulp.src(`${carPickupZoneDlDir}/*`, noBuf),
    renameFile('-carpickupzone'),
    gulp.dest(carPickupZoneDir),
  ),
);

gulp.task(
  'carPickupZone:update',
  gulp.series('carPickupZone:download', 'carPickupZone:rename'),
);

/**
 * Download osm data
 */
gulp.task('osm:download', () => {
  if (!config.osm) {
    return Promise.resolve();
  }
  return dl(config.osm, osmDlDir);
});

gulp.task('osm:copyPreprocessingFiles', () =>
  pipeline(
    gulp.src(`${config.router.id}/osm-preprocessing/*.sh`, noBuf),
    gulp.dest(`${config.dataDir}/${config.router.id}/osm-preprocessing`),
  ),
);

gulp.task(
  'osm:update',
  gulp.series(
    'osm:copyPreprocessingFiles',
    'osm:download',
    () =>
      pipeline(
        gulp.src(`${osmDlDir}/*`, noBuf),
        validateBlobSize(),
        runOSMPreprocessing(
          `${config.dataDir}/${config.router.id}/osm-preprocessing`,
        ),
        testOTPFile(),
        gulp.dest(osmDir),
      ),
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
  return Promise.all(dlBlob(config.dem, demDlDir, demDir)).catch(() => {
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
gulp.task('gtfs:download', () => dl(config.router.gtfs, gtfsDlDir));

gulp.task('gtfs:dlRename', () =>
  pipeline(
    gulp.src(`${gtfsDlDir}/*`, noBuf),
    renameFile('-gtfs'),
    gulp.dest(renamedDir),
  ),
);

gulp.task('gtfs:dlReplace', () =>
  pipeline(
    gulp.src(`${renamedDir}/*-gtfs.zip`),
    replaceGTFSFilesTask(config.gtfsMap),
    gulp.dest(fitDir),
  ),
);

gulp.task(
  'gtfs:dl',
  gulp.series(
    'del:fit',
    'gtfs:download',
    'gtfs:dlRename',
    'gtfs:dlReplace',
    () => del([tmpRenameDir]),
  ),
);

// Add feedId to gtfs files in id dir, and moves files to directory 'test/gtfs'
gulp.task(
  'gtfs:id',
  gulp.series(
    () =>
      pipeline(
        gulp.src(`${idDir}/*`, noBuf),
        extractFilesTask(['feed_info.txt']),
        setFeedIdTask(),
        addFilesTask(['feed_info.txt']),
        gulp.dest(testGtfsDir),
      ),
    () => del(tmpDir),
  ),
);

// Runs mapFit on gtfs files if fit is enabled, or just moves files to directory 'filter'
gulp.task(
  'gtfs:fit',
  config.router.gtfs.some(src => src.fit)
    ? gulp.series(
        'del:filter',
        () => prepareFit(config),
        () =>
          pipeline(
            gulp.src(`${fitDir}/*`, noBuf),
            extractFilesTask(['stops.txt']),
            mapFit(config), // modify backup of stops.txt
            addFilesTask(['stops.txt']),
            gulp.dest(filterDir),
          ),
        () => del(tmpDir),
      )
    : () => pipeline(gulp.src(`${fitDir}/*`, noBuf), gulp.dest(filterDir)),
);

gulp.task('copyRules', () =>
  pipeline(
    gulp.src(`${config.router.id}/gtfs-rules/*`, noBuf),
    gulp.dest(`${config.dataDir}/${config.router.id}/gtfs-rules`),
  ),
);

// Filter gtfs files and move result to directory 'id'
gulp.task(
  'gtfs:filter',
  config.router.gtfs.some(src => src.rules)
    ? gulp.series(
        'copyRules',
        'del:id',
        () =>
          pipeline(
            gulp.src(`${filterDir}/*.zip`, noBuf),
            extractFilesTask(config.passOBAfilter),
            OBAFilterTask(config.gtfsMap),
            addFilesTask(config.passOBAfilter),
            gulp.dest(idDir),
          ),
        () => del(tmpDir),
      )
    : () => pipeline(gulp.src(`${filterDir}/*`, noBuf), gulp.dest(idDir)),
);

// Test gtfs files and move result to directory 'ready/gtfs'
gulp.task('gtfs:test', () =>
  pipeline(
    gulp.src(`${testGtfsDir}/*`, noBuf),
    testOTPFile(),
    gulp.dest(gtfsDir),
  ),
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
  return pipeline(gulp.src(sources, noBuf), gulp.dest(gtfsDir));
});

gulp.task('gtfs:del', () => del([gtfsSeedDir, gtfsDir]));

gulp.task(
  'gtfs:seed',
  gulp.series('gtfs:del', () =>
    pipeline(
      gulp.src(`${seedSourceDir}/*-gtfs.zip`, noBuf),
      gulp.dest(gtfsSeedDir),
      gulp.dest(gtfsDir),
    ),
  ),
);

gulp.task('netex:del', () => del(netexDir));

gulp.task(
  'netex:seed',
  gulp.series('netex:del', () =>
    pipeline(
      gulp.src(`${seedSourceDir}/*-netex.zip`, noBuf),
      gulp.dest(netexDir),
    ),
  ),
);

gulp.task('carPickupZone:del', () => del(carPickupZoneDir));

gulp.task(
  'carPickupZone:seed',
  gulp.series('carPickupZone:del', () =>
    pipeline(
      gulp.src(`${seedSourceDir}/*-carpickupzone.zip`, noBuf),
      gulp.dest(carPickupZoneDir),
    ),
  ),
);

gulp.task('osm:del', () => del(osmDir));

gulp.task(
  'osm:seed',
  gulp.series('osm:del', () =>
    pipeline(gulp.src(`${seedSourceDir}/*.pbf`, noBuf), gulp.dest(osmDir)),
  ),
);

gulp.task('dem:del', () => del(demDir));

gulp.task(
  'dem:seed',
  gulp.series('dem:del', () =>
    pipeline(gulp.src(`${seedSourceDir}/*.tif`, noBuf), gulp.dest(demDir)),
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
    'netex:seed',
    'carPickupZone:seed',
    'seed:cleanup',
  ),
);

gulp.task('router:del', () => del(`${config.dataDir}/build`));

gulp.task(
  'router:copy',
  gulp.series('router:del', () =>
    pipeline(
      prepareRouterData(config.router),
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
    pipeline(
      prepareRouterDataForPrebuiltStreetGraphBuild(config.router),
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
    pipeline(
      prepareRouterDataForStreetOnlyGraphBuild(config.router),
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
  pipeline(
    gulp.src(`${config.dataDir}/build/${config.router.id}/**/*`, noBuf),
    gulp.dest(`${config.storageDir}/${global.storageDirName}/`),
  ),
);

gulp.task(
  'router:storeForPrebuiltStreetGraphDataBuild',
  gulp.series(
    'router:store',
    () =>
      pipeline(
        gulp.src(`${global.osmPrebuildDir}/report/*`, noBuf),
        gulp.dest(
          `${config.storageDir}/${global.storageDirName}/street-report/`,
        ),
      ),
    () =>
      pipeline(
        gulp.src(`${global.osmPrebuildDir}/build.log`, noBuf),
        rename('street-build.log'),
        gulp.dest(`${config.storageDir}/${global.storageDirName}`),
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
