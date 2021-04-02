#  Build process for OpenTripPlanner-data-container

[![Build](https://github.com/hsldevcom/OpenTripPlanner-data-container/workflows/Process%20master%20push%20or%20pr/badge.svg?branch=master)](https://github.com/HSLdevcom/OpenTripPlanner-data-container/actions)

## This project:
Contains tools for fetching, building and deploying fresh otp data-containers
for consumption by hsl, waltti and finland otp instances. This project can be
reused for building data for other otp instances but it is only tested to
work for the aforementioned otp instances. Currently, this is used for OTP
version 1.x.

## Main components

### otp-data-builder
The actual data builder application. This is a node.js application that fetches
and processes new gtfs/osm data. It's build around gulp and all separate steps of
databuilding process can also be called directly from the source tree. The only
required external dependency is docker. Docker is used for launching external
commands that do for example data manipulation.

install gulp cli:
  `npm install -g gulp-cli`

install app deps:
  `npm install`

update osm data:
  `gulp osm:update`

download new gtfs data for waltti:
  `ROUTERS=waltti gulp gtfs:dl`

#### Configuration
It is possible to change the behaviour of the data builder by defining environment variables.

* "DOCKER_USER" defines username for authenticating to docker hub.
* "DOCKER_AUTH" defines password for authenticating to docker hub.
* (Optional, default latest and tag based on date) "DOCKER_TAG" defines what will be the updated docker tag of the data container images in the remote container registry.
* (Optional, default hsldevcom) "ORG" defines what organization images belong to in the remote container registry.
* (Optional, default latest) "SEED_TAG" defines what version of data container should be used for seeding.
* (Optional, default latest) "OTP_TAG" defines what version of OTP is used for testing and building graphs.
* (Optional, default latest) "TOOLS_TAG" defines what version of otp-data-tools image is used for testing.
* (Optional, default ${process.cwd()}/data) "HOST_DATA" defines base path for volume directories.
* (Optional, default 'finland, waltti, hsl') "ROUTERS" defines which data containers are being built and deployed.
* (Optional, default ${process.cwd()}/data) "DATA" defines base path for data directories in container's file system.
* (Optional, default 23:00:00) "BUILD_TIME" defines when data build is being run. Uses UTC time.
* (Optional, default dev) "BUILDER_TYPE" used as a postfix to slack bot name
* (Optional, default {}) "EXTRA_SRC" defines gtfs src values that should be overridden or completely new src that should be added with unique id. "routers" is always a mandatory field. Example format:
  - `{"FOLI": {"url": "http://data.foli.fi/gtfs/gtfs.zip",  "fit": false, "rules": ["router-waltti/gtfs-rules/waltti.rule"], "routers": ["hsl", "finland"]}}`
  - You can remove a src by including "remove": true, `{"FOLI": {"remove": true, "routers": ["hsl"]}`
* (Optional, default {}) "EXTRA_UPDATERS" defines router-config.json updater values that should be overridden or completely new updater that should be added with unique id. "routers" is always a mandatory field. Example format:
  - `{"turku-alerts": {"type": "real-time-alerts", "frequencySec": 30, "url": "https://foli-beta.nanona.fi/gtfs-rt/reittiopas", "feedId": "FOLI", "fuzzyTripMatching": true, "routers": ["waltti"]}}`
  - You can remove a src by including "remove": true, `{"turku-alerts": {"remove": true, "routers": ["waltti"]}`
* (Optional) "VERSION_CHECK" is a comma-separated list of feedIds from which the GTFS data's `feed_info.txt`'s file's `feed_version` field is parsed into a date object and it's checked if the data has been updated within the last 8 hours. If not, a message is sent to stdout (and slack, only monday-friday) to inform about usage of "old" data.

#### Data processing steps

Seed data can be retrieved with a single gulp command:

1. seed

Downloads previous data containers (env variable SEED_TAG can be used to customize which tag is pulled)
and extracts osm and gtfs data from there and places it in 'data/ready' directory.
Old data acts as backup in case fetching/validating new data fails.

Currently there is single processing step for OSM data. Because gtfs processing steps require osm data,
the osm data must be available before running the gtfs:fit stage later below.

2. osm:update

This command downloads required OSM packages from configured location, tests the file(s) with otp,
and if tests pass data is copied to 'data/downloads/osm' directory.

The data is then processed with the following steps:

3. gtfs:dl
Downloads a GTFS package from configured location, tests the file with otp, if
test passes data is copied to directory 'data/fit/gtfs'. The resulting zip is named <feedid>.zip.

4. gtfs:fit
Runs configured map fits. Copies data to directory 'data/filter/gtfs'.

5. gtfs:filter
Runs configured filterings. Copies data to directory 'data/id/gtfs'.

6. gtfs:id
Sets the gtfs feed id to <id> and copies data to directory 'data/ready/gtfs'.

Building the router from available (seeded or downloaded and processed) data:

7. router:buildGraph

Prebuilds graph with either current latest version or user defined version (with env variable OTP_TAG) of OTP and creates zip files
ready for building the otp-data container.


The final step is router deployment:

8. deploy.sh

Builds a data container, starts it, starts either latest or user defined version (with env variable OTP_TAG) of otp and runs
routing tests (otp-data-tools latest image is used for it by default, TOOLS_TAG env variable can be used to change that)
to verify that the data container looks ok. If tests pass the fresh data container is pushed to Dockerhub.

Normally when the application is running (as a container) the index.js is used.
It runs the data updating process on a schedule specified as a cron pattern. Data build can be executed immediately
by attaching to the builder container with bash 'docker exec -i -t <dockerid> /bin/bash' and then
exexuting the command 'node index.js once'. The end result of the build is 2 docker containers uploaded into dockerhub.
Digitransit-deployer detects the changes and restarts OTP instances, so that new data becomes in use.

Each data container image runs a http server listening to port 8080, serving both a gtfs data bundle and a pre-built graph:
- hsl: http://localhost:8080/router-hsl.zip and graph-hsl-<otpversion>.zip
- waltti: http://localhost:8080/router-waltti.zip and graph-waltti-<otpversion>.zip
- finland: http://localhost:8080/router-finland.zip and graph-finland-<otpversion>.zip

### otp-data-tools
Contains tools for gtfs manipulation, such as One Bus Away gtfs filter.
These tools are packaged inside docker container and are used dunring the data build process.

