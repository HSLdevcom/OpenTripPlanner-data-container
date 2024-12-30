#!/bin/bash
#deploys otp image with updated ENTRYPOINT

set -e

cd "$(dirname "$0")"

ROUTER_NAME=${ROUTER_NAME:-hsl}
DATE=$1

ORG=${ORG:-hsldevcom}
OTP_TAG=${OTP_TAG:-v2}
DOCKER_TAG=$OTP_TAG-$ROUTER_NAME
PROJECT=opentripplanner
DOCKER_IMAGE=$ORG/$PROJECT
DOCKER_DATE_IMAGE=$DOCKER_IMAGE:$DOCKER_TAG-$DATE
DOCKER_IMAGE_TAGGED=$DOCKER_IMAGE:$DOCKER_TAG

if [[ -z "${OTP_GRAPH_DIR}" ]]; then
  echo "*** OTP_GRAPH_DIR is not defined."
  exit 1
fi

if [[ -z "${DOCKER_USER}" ]]; then
  echo "*** DOCKER_USER is not defined. Unable to log in to the registry."
else
  docker login -u $DOCKER_USER -p $DOCKER_AUTH
fi

# remove old version (may be necessary in local use)
docker rmi --force $DOCKER_IMAGE_TAGGED &> /dev/null
docker rmi --force $DOCKER_DATE_IMAGE &> /dev/null

echo "Building router's opentripplanner image..."

docker build --progress=plain --network=host --build-arg OTP_TAG=$OTP_TAG --build-arg OTP_GRAPH_DIR=$OTP_GRAPH_DIR -t $DOCKER_IMAGE_TAGGED .

docker tag $DOCKER_IMAGE_TAGGED $DOCKER_DATE_IMAGE

if [[ -z "${DOCKER_USER}" ]]; then
  echo "*** Not signed into the registry. Image not pushed."
else
  echo "*** Pushing $DOCKER_IMAGE_TAGGED"
  docker push $DOCKER_IMAGE_TAGGED
  echo "*** Pushing $DOCKER_DATE_IMAGE"
  docker push $DOCKER_DATE_IMAGE
fi
