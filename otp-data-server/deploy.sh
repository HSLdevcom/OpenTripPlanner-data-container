#!/bin/bash

#Set these environment variables
#DOCKER_USER // dockerhub credentials
#DOCKER_AUTH
set -e

cd "$(dirname "$0")"

ROUTER_NAME=${ROUTER_NAME:-hsl}
DATE=$1

ORG=${ORG:-hsldevcom}
DOCKER_TAG=${DOCKER_TAG:-v3}
CONTAINER=opentripplanner-data-server
DOCKER_IMAGE=$ORG/$CONTAINER

if [[ -z "${OTP_GRAPH_DIR}" ]]; then
  echo "*** OTP_GRAPH_DIR is not defined."
  exit 1
fi

if [[ -z "${DOCKER_USER}" ]]; then
  echo "*** DOCKER_USER is not defined. Unable to log in to the registry."
else
  docker login -u $DOCKER_USER -p $DOCKER_AUTH
fi

DOCKER_DATE_IMAGE=$DOCKER_IMAGE:$DOCKER_TAG-$ROUTER_NAME-$DATE
DOCKER_IMAGE_TAGGED=$DOCKER_IMAGE:$DOCKER_TAG-$ROUTER_NAME

docker build --progress=plain --network=host --build-arg OTP_GRAPH_DIR=$OTP_GRAPH_DIR -t $DOCKER_DATE_IMAGE .

docker tag $DOCKER_DATE_IMAGE $DOCKER_IMAGE_TAGGED

if [[ -z "${DOCKER_USER}" ]]; then
  echo "*** Not signed into the registry. Image not pushed."
else
  echo "*** Pushing $DOCKER_DATE_IMAGE"
  docker push $DOCKER_DATE_IMAGE
  echo "*** Pushing $DOCKER_IMAGE_TAGGED"
  docker push $DOCKER_IMAGE_TAGGED
fi
