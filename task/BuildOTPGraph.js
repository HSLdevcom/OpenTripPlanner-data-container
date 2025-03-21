const fs = require('fs');
const { exec, execSync } = require('child_process');
const del = require('del');
const { zipWithGlob, otpMatching, postSlackMessage } = require('../util');
const { dataDir, constants } = require('../config.js');
const graphBuildTag = process.env.OTP_TAG || 'v2';
const JAVA_OPTS = process.env.JAVA_OPTS || '-Xmx12g';
const SPLIT_BUILD_TYPE = process.env.SPLIT_BUILD_TYPE || 'NO_SPLIT_BUILD';
const dockerImage = `hsldevcom/opentripplanner:${graphBuildTag}`;

const buildGraph = function (router) {
  const lastLog = [];
  const collectLog = data => {
    lastLog.push(data.toString());
    if (lastLog.length > 20) {
      lastLog.splice(0, 1);
    }
  };
  return new Promise((resolve, reject) => {
    const version = execSync(
      `docker pull ${dockerImage};docker run --rm ${dockerImage} --version`,
    );
    const commit = version.toString().match(/commit: ([0-9a-f]+)/)[1];

    let command;
    switch (SPLIT_BUILD_TYPE) {
      case 'ONLY_BUILD_STREET_GRAPH':
        command = `docker run -e JAVA_OPTS="${JAVA_OPTS}" -v ${dataDir}/build/${router.id}:/var/opentripplanner --mount type=bind,source=${dataDir}/../logback-include-extensions.xml,target=/logback-include-extensions.xml ${dockerImage} --buildStreet --save`;
        break;
      case 'USE_PREBUILT_STREET_GRAPH':
        command = `docker run -e JAVA_OPTS="${JAVA_OPTS}" -v ${dataDir}/build/${router.id}:/var/opentripplanner --mount type=bind,source=${dataDir}/../logback-include-extensions.xml,target=/logback-include-extensions.xml ${dockerImage} --loadStreet --save`;
        break;
      default:
        command = `docker run -e JAVA_OPTS="${JAVA_OPTS}" -v ${dataDir}/build/${router.id}:/var/opentripplanner --mount type=bind,source=${dataDir}/../logback-include-extensions.xml,target=/logback-include-extensions.xml ${dockerImage} --build --save`;
        break;
    }

    const buildGraph = exec(command, { maxBuffer: constants.BUFFER_SIZE });
    const buildLog = fs.openSync(
      `${dataDir}/build/${router.id}/build.log`,
      'w+',
    );

    buildGraph.stdout.on('data', function (data) {
      collectLog(data);
      process.stdout.write(data.toString());
      fs.writeSync(buildLog, data);
    });

    buildGraph.stderr.on('data', function (data) {
      collectLog(data);
      process.stdout.write(data.toString());
      fs.writeSync(buildLog, data);
    });

    buildGraph.on('exit', status => {
      fs.closeSync(buildLog);
      if (status === 0) {
        resolve({ commit, router });
      } else {
        const log = lastLog.join('');
        postSlackMessage(`${router.id} build failed: ${status}:${log} :boom:`);
        reject('could not build');
      }
    });
  });
};

const packData = function (commit, router) {
  const path = `${dataDir}/build/${router.id}`;

  const p1 = new Promise((resolve, reject) => {
    process.stdout.write('Creating zip file for router data\n');
    const osmFiles = router.osm.map(osm => `${path}/${osm}.pbf`);

    // create a zip file which includes all data required
    // for graph build and routing: gtfs, osm, dem + otp configs
    zipWithGlob(
      `${path}/router-${router.id}.zip`,
      [
        `${path}/*gtfs.zip`,
        `${path}/*.json`,
        ...osmFiles,
        `${path}/${router.dem}.tif`,
      ],
      `router-${router.id}`,
      err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
  const p2 = new Promise((resolve, reject) => {
    process.stdout.write('Creating zip file for otp graph\n');
    // create a zip file for routing only
    // include  graph.obj, router-config.json and otp-config.json
    zipWithGlob(
      `${path}/graph-${router.id}-${commit}.zip`,
      [
        `${path}/graph.obj`,
        `${path}/router-config.json`,
        `${path}/otp-config.json`,
      ],
      router.id,
      err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
  const p3 = new Promise((resolve, reject) => {
    fs.writeFile(
      `${path}/version.txt`,
      new Date().toISOString(),
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
  return Promise.all([p1, p2, p3]);
};

module.exports = {
  buildOTPGraphTask: router =>
    buildGraph(router)
      .then(resp => packData(resp.commit, resp.router))
      .then(() => otpMatching(`${dataDir}/build/${router.id}`))
      .then(() => del(`${dataDir}/build/${router.id}/taggedStops.log`))
      .then(() => process.stdout.write('Graph build SUCCESS\n')),
  buildOTPStreetOnlyGraphTask: router =>
    buildGraph(router).then(() =>
      process.stdout.write('Street only graph build SUCCESS\n'),
    ),
};
