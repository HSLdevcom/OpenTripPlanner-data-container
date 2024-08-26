#!/bin/bash

#Set these environment variables
#DOCKER_USER // dockerhub credentials
#DOCKER_AUTH
set -e

ROUTER_NAME=${ROUTER_NAME:-hsl}
DATE=$1

ORG=${ORG:-hsldevcom}
DOCKER_TAG=${DOCKER_TAG:-v2}
CONTAINER=opentripplanner-data-server
DOCKER_IMAGE=$ORG/$CONTAINER

docker login -u $DOCKER_USER -p $DOCKER_AUTH

DOCKER_DATE_IMAGE=$DOCKER_IMAGE:$DOCKER_TAG-$ROUTER_NAME-$DATE
DOCKER_IMAGE_TAGGED=$DOCKER_IMAGE:$DOCKER_TAG-$ROUTER_NAME
cd otp-data-server
docker build -t $DOCKER_DATE_IMAGE .
echo "*** Pushing $DOCKER_DATE_IMAGE"
docker push $DOCKER_DATE_IMAGE
docker tag $DOCKER_DATE_IMAGE $DOCKER_IMAGE_TAGGED
echo "*** Pushing $DOCKER_IMAGE_TAGGED"
docker push $DOCKER_IMAGE_TAGGED
