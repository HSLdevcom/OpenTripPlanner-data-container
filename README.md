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

* "ROUTER_NAME" defines for which router the data gets updated for.
* "DOCKER_USER" defines username for authenticating to docker hub.
* "DOCKER_AUTH" defines password for authenticating to docker hub.
* (Optional, default v3 and tag based on date) "DOCKER_TAG" defines what will be the updated docker tag of the data server images in the remote container registry.
* (Optional, default hsldevcom) "ORG" defines what organization images belong to in the remote container registry.
* (Optional, default v3) "SEED_TAG" defines what version of the data storage should be used for seeding.
* (Optional, default v2) "OTP_TAG" defines what version of OTP is used for testing, building graphs and deploying a new OTP image (postfixed with router name).
* (Optional, default v3) "TOOLS_TAG" defines what version of otp-data-tools image is used for testing.
* (Optional, default dev) "BUILDER_TYPE" used as a postfix to slack bot name
* (Optional) "SLACK_CHANNEL_ID" defines to which slack channel the messages are sent to
* (Optional) "SLACK_ACCESS_TOKEN" bearer token for slack messaging
* (Optional, default {}) "EXTRA_SRC" defines gtfs src values that should be overridden or completely new src that should be added with unique id. Example format:
  - `{"FOLI": {"url": "https://data.foli.fi/gtfs/gtfs.zip",  "fit": false, "rules": ["router-waltti/gtfs-rules/waltti.rule"]}}`
  - You can remove a src by including "remove": true, `{"FOLI": {"remove": true}}`
* (Optional, default {}) "EXTRA_UPDATERS" defines router-config.json updater values that should be overridden or completely new updater that should be added with unique id. Example format:
  - `{"turku-alerts": {"type": "real-time-alerts", "frequencySec": 30, "url": "https://foli-beta.nanona.fi/gtfs-rt/reittiopas", "feedId": "FOLI", "fuzzyTripMatching": true}}`
  - You can remove a src by including "remove": true, `{"turku-alerts": {"remove": true}}`
* (Optional, default {}) "EXTRA_OSM" can redefine OSM source URLs. For example: `{"hsl": "https://tempserver.com/newhsl.pbf"}`
* (Optional) "VERSION_CHECK" is a comma-separated list of feedIds from which the GTFS data's `feed_info.txt`'s file's `feed_version` field is parsed into a date object and it's checked if the data has been updated within the last 8 hours. If not, a message is sent to stdout (and slack, only monday-friday) to inform about usage of "old" data.
* (Optional) "SKIPPED_SITES" defines a comma-separated list of sites from OTPQA tests that should be skipped. Example format:
  - `"turku.digitransit.fi,reittiopas.hsl.fi"`
* (Optional) "DISABLE_BLOB_VALIDATION" should be included if blob (OSM) validation should be disabled temporarily.
* (Optional) "NOSEED" should be included (together with DISABLE_BLOB_VALIDATION) when data loading for a new configuration is run first time and no seed image is available.
* (Optional) "NOCLEANUP" can be used to disable removal of historical data in storage
* (Optional) "JAVA_OPTS" Java parameters for running OTP

#### Data processing steps

Seed data can be retrieved with a single gulp command:

1. `seed`

Downloads previous data from storage (env variable SEED_TAG can be used to customize which storage location is used)
and extracts osm, dem and gtfs data from there and places it in 'data/seed' and 'data/ready' directories.
Old data acts as backup in case fetching/validating new data fails.

2. `osm:update`

This command downloads required OSM packages from configured location, tests the file(s) with otp,
and if tests pass data is copied to 'data/downloads/osm' directory.

The data is then processed with the following steps:

3. `gtfs:dl`
Downloads a GTFS package from configured location, tests the file with otp, if
test passes data is copied to directory 'data/fit/gtfs'. The resulting zip is named <feedid>.zip.

4. `gtfs:fit`
Runs configured map fits. Copies data to directory 'data/filter/gtfs'.

5. `gtfs:filter`
Runs configured filterings. Copies data to directory 'data/id/gtfs'.

6. `gtfs:id`
Sets the gtfs feed id to <id> and copies data to directory 'data/ready/gtfs'.

Steps 3. - 6. can also be run together using a single `gtfs:update` command.

Building the router from available (seeded or downloaded and processed) data:

7. `router:buildGraph`

Builds a new graph with all the new data sets (and maybe seeded data sets if there were issues with new data).

8. `test.sh`

Runs routing quality test bench defined in the repository 'hsldevcom/OTPQA'. OTPQA test sets are associated with GTFS packages.
If there are quality regressions, a comma separated list of failed GTFS feed identifiers is is written to local file 'failed_feeds.txt'.

9. `router:store`

Stores the new data in storage (which can be a mounted storage volume).

10. `deploy:prepare`

Patches the data server configuration and the Dockerfile for OpenTripPlanner so that the correct storage location is used.

11. `deploy.sh`

Deploys new opentripplanner-data-server image with 'DOCKER_TAG' env variable (default 'v3') postfixed with the router name and
pushes the image to Dockerhub.

Normally, when the application is running as a container, the script 'index.js' is run to execute all steps 1 - 10 described above.
The end result of the build is a data server image uploaded into dockerhub.

Each data server image runs a http server listening to port 8080, serving both a data bundle required for building a graph,
and a pre-built graph. For example, in HSL case: http://localhost:8080/router-hsl.zip and graph-hsl-$OTPVERSION.zip. The image
does not include the data, the data needs to be mounted while running the container.

12. `deploy-otp.sh`

Tags opentripplanner image with using 'OTP_TAG' env variable (default 'v3') postfixed with the router name and pushes the image to Dockerhub.

This new opentripplanner image will automatically use the graph and configuration from the storage location where the build's end result
was stored at.

13. `storage:cleanup`

Keeps 10 latest versions of the data in storage and removes the rest.

### otp-data-tools

Contains tools for gtfs manipulation, such as One Bus Away gtfs filter. OBA filter tool version 1.3.9 is embedded into this repository.
It should be replaced with a newer version if such one appears e.g. into https://mvnrepository.com/.

These tools are packaged inside docker container and are used during the data build process.
