# Build process for OpenTripPlanner-data-server and router specific OpenTripPlanner images

[![Build](https://github.com/hsldevcom/OpenTripPlanner-data-container/workflows/Process%20v3%20push%20or%20pr/badge.svg?branch=v3)](https://github.com/HSLdevcom/OpenTripPlanner-data-container/actions)

## This project:

Contains tools for fetching, building and deploying fresh opentripplanner data server and opentripplanner images
for consumption by Digitransit maintained OTP version 2.x instances.

## Main components

### otp-data-builder

The actual data builder application. This is a node.js application that fetches
and processes new gtfs/osm data. It's build around gulp and all separate steps of
databuilding process can also be called directly from the source tree. The only
required external dependency is docker. Docker is used for launching external
commands that do for example data manipulation.

install gulp cli:
`yarn global add gulp-cli`

install app deps:
`yarn`

update osm data:
`ROUTER_NAME=hsl gulp osm:update`

download new gtfs data for waltti:
`ROUTER_NAME=waltti gulp gtfs:dl`

#### Configuration

It is possible to change the behaviour of the data builder by defining environment variables.

- `ROUTER_NAME` defines for which router the data gets updated for.
- `DOCKER_USER` defines username for authenticating to docker hub.
- `DOCKER_AUTH` defines password for authenticating to docker hub.
- (Optional, default v3 and tag based on date) `DOCKER_TAG` defines what will be the updated docker tag of the data server images in the remote container registry.
- (Optional, default hsldevcom) `ORG` defines what organization images belong to in the remote container registry.
- (Optional, default v3) `SEED_TAG` defines what version of the data storage should be used for seeding.
- (Optional, default v2) `OTP_TAG` defines what version of OTP is used for testing, building graphs and deploying a new OTP image (postfixed with router name).
- (Optional, default v3) `TOOLS_TAG` defines what version of otp-data-tools image is used for testing.
- (Optional, default dev) `BUILDER_TYPE` used as a postfix to slack bot name
- (Optional) `SLACK_CHANNEL_ID` defines to which slack channel the messages are sent to
- (Optional) `SLACK_ACCESS_TOKEN` bearer token for slack messaging
- (Optional, default {}) `EXTRA_SRC` defines gtfs src values that should be overridden or completely new src that should be added with unique id. Example format:
  - `{"FOLI": {"url": "https://data.foli.fi/gtfs/gtfs.zip",  "fit": false, "rules": ["router-waltti/gtfs-rules/waltti.rule"]}}`
  - You can remove a src by including `"remove": true`, `{"FOLI": {"remove": true}}`
- (Optional, default {}) `EXTRA_UPDATERS` defines router-config.json updater values that should be overridden or completely new updater that should be added with unique id. Example format:
  - `{"turku-alerts": {"type": "real-time-alerts", "frequencySec": 30, "url": "https://foli-beta.nanona.fi/gtfs-rt/reittiopas", "feedId": "FOLI", "fuzzyTripMatching": true}}`
  - You can remove a src by including `"remove": true`, `{"turku-alerts": {"remove": true}}`
- (Optional, default {}) `EXTRA_OSM` can redefine OSM source URLs. For example: `{"hsl": "https://tempserver.com/newhsl.pbf"}`
- (Optional) `VERSION_CHECK` is a comma-separated list of feedIds from which the GTFS data's `feed_info.txt`'s file's `feed_version` field is parsed into a date object and it's checked if the data has been updated within the last 8 hours. If not, a message is sent to stdout (and slack, only monday-friday) to inform about usage of "old" data.
- (Optional) `SKIPPED_SITES` defines a comma-separated list of sites from OTPQA tests that should be skipped. Example format:
  - `"turku.digitransit.fi,reittiopas.hsl.fi"`
- (Optional) `DISABLE_BLOB_VALIDATION` should be included if blob (OSM) validation should be disabled temporarily.
- (Optional) `NOSEED` should be included (together with DISABLE_BLOB_VALIDATION) when data loading for a new configuration is run first time and no seed image is available.
- (Optional) `NOCLEANUP` can be used to disable removal of historical data in storage
- (Optional) `JAVA_OPTS` Java parameters for running OTP
- (Optional) `SPLIT_BUILD_TYPE` is an enum used to configure if the build should be split. The values are:
  - `ONLY_BUILD_STREET_GRAPH` to only build the street graph
  - `USE_PREBUILT_STREET_GRAPH` to use the prebuilt street graph to finish a complete graph build
  - All other values default to `NO_SPLIT_BUILD` which indicates that the build is run as normal
- (Optional) `USE_SEEDED_OSM` skips OSM updating and uses existing seed version
- (Optional) `SKIP_OSM_PREPROCESSING` skips OSM preprocessing even if an instruction file is defined
- (Optional) `SKIP_OTP_TESTS` skips OTP tests

### Data processing steps

- `seed` downloads previous data from storage (env variable SEED_TAG can be used to customize which storage location is used)
  and then extracts osm, dem, and gtfs data and places it in the `data/seed` and `data/ready` directories.
  The old data acts as backup in case fetching/validating new data fails. The command uses the zipped contents of the latest build that built a complete graph (from prebuilt data or from a normal build).

- `dem:update` downloads required DEM information, after which data is copied to the `data/downloads/dem` directory.

- `osm:update` downloads required OSM packages from configured locations, tests the files with OTP,
  and if the tests pass, data is copied to the `data/downloads/osm` directory.

- `gtfs:update`

  - `gtfs:dl` downloads a GTFS package from a configured location and data is copied to the `data/fit` directory. The resulting zip file is named `<feedid>.zip`.

  - `gtfs:fit` runs configured map fits. Copies data to the `data/filter` directory.

  - `gtfs:filter` runs configured filters. Copies data to the `data/id` directory.

  - `gtfs:id` sets the gtfs feed id to `<id>` and copies data to the `data/test/gtfs` directory.

  - `gtfs:test` tests the file with OTP and if the test passes, data is copied to the `data/ready/gtfs` directory.

- `router:buildGraph`

  - `router:copy` copies files needed for the build.
  - `buildOTPGraphTask(config.router)` builds a new graph with all the new data sets (and maybe seeded data sets if there were issues with new data).

- `router:buildStreetOnlyGraph`

  - `router:copyStreetOnlyGraphData` copies files needed for the street only build.
  - `buildOTPStreetOnlyGraphTask(config.router)` builds a new street only graph with all the new data sets (and maybe seeded data sets if there were issues with new data).

- `router:buildWithPrebuiltStreetGraph`

  - `router:copyForPrebuiltStreetGraphDataBuild` copies files needed for the build from prebuilt data.
  - `buildOTPGraphTask(config.router)` builds a new graph from prebuilt street only data with new gtfs data sets (and maybe seeded data sets if there were issues with new data).

- `test.sh` runs the routing quality test bench defined in the `hsldevcom/OTPQA` repository. OTPQA test sets are associated with GTFS packages.
  If there are quality regressions, a comma separated list of failed GTFS feed identifiers is written to the local file `failed_feeds.txt`.

- `router:store` stores the new data in storage (which can be a mounted storage volume).

- `router:storeForPrebuiltStreetGraphDataBuild` stores the new data in storage (which can be a mounted storage volume). Also copies the `report` directory from the street only build to the output directory under the name `street-report`.

- `deploy.sh` deploys a new opentripplanner-data-server image with the `DOCKER_TAG` env variable (default `v3`) postfixed with the router name, and
  pushes the image to Dockerhub.<p>
  Normally, when the application is running as a container, the script `index.js` is run to execute all steps.
  The end result of the build is a data server image uploaded to dockerhub.<p>
  Each data server image runs an http server listening to port `8080`. It serves a data bundle required for building a graph and a prebuilt graph. For example, in the HSL case: http://localhost:8080/router-hsl.zip and `graph-hsl-$OTPVERSION.zip`. The image
  does not include the data, the data needs to be mounted while running the container.

- `deploy-otp.sh` tags an OTP image using the `OTP_TAG` env variable (default `v2`) postfixed with the router name and pushes the image to Dockerhub.
  This new OTP image will automatically use the graph and configuration from the storage location where the build's end result was stored at.

- `storage:cleanup` keeps the 10 latest versions of the data in storage and removes the rest.

- `storage:cleanupStreetOnlyGraphData` keeps the 10 latest versions of the street only build data in storage and removes the rest.

#### Normal build

1. `seed`
2. `dem:update`
3. `osm:update`
4. `gtfs:update`
   - `gtfs:dl`
   - `gtfs:fit`
   - `gtfs:filter`
   - `gtfs:id`
5. `router:buildGraph`
   - `router:copy`
   - `buildOTPGraphTask(config.router)`
6. `test.sh`
7. `router:store`
8. `deploy.sh`
9. `deploy-otp.sh`
10. `storage:cleanup`

#### Street only build

1. `seed`
2. `dem:update`
3. `osm:update`
4. `router:buildStreetOnlyGraph`
   - `router:copyStreetOnlyGraphData`
   - `buildOTPStreetOnlyGraphTask(config.router)`
5. `router:store`
6. `storage:cleanupStreetOnlyGraphData`

#### Build from prebuilt street data

1. `seed`
2. `gtfs:update`
   - `gtfs:dl`
   - `gtfs:fit`
   - `gtfs:filter`
   - `gtfs:id`
3. `router:buildWithPrebuiltStreetGraph`
   - `router:copyForPrebuiltStreetGraphDataBuild`
   - `buildOTPGraphTask(config.router)`
4. `test.sh`
5. `router:storeForPrebuiltStreetGraphDataBuild`
6. `deploy.sh`
7. `deploy-otp.sh`
8. `storage:cleanup`

### otp-data-tools

Contains tools, such as the OneBusAway gtfs filter, for gtfs manipulation.
It uses the [opentransitsoftwarefoundation/onebusaway-gtfs-transformer-cli](https://registry.hub.docker.com/r/opentransitsoftwarefoundation/onebusaway-gtfs-transformer-cli) as the base image.
These tools are packaged inside a docker container and are used during the data build process.

#### OSM preprocessing

OSM preprocessing is done if a bash script is defined for a specific config and a specific OSM file.
See [hsl.sh](hsl/osm-preprocessing/hsl.sh) for an example.

When creating OSM preprocessing instructions you should:
1. Name the bash file as follows: `<osm_id>.sh`. Valid file names can be e.g. `hsl.sh` or `southFinland.sh`.
2. Place the file in the `osm-preprocessing` directory of the config you want to use.
3. Make sure that the name of the output file is the same as the input file. The file has to be named `<osm_id>.pbf`, e.g. `hsl.pbf` or `southFinland.pbf`.
4. Make sure that you do not reuse input and output filenames in commands:
   - INCORRECT `osmfilter hsl.o5m -o=hsl.o5m ...`
   - CORRECT `osmfilter hsl.o5m -o=hsl2.o5m ...`
5. Test the script by running it locally and verifying that the output makes sense.
