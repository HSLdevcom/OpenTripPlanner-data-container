#!/bin/bash
#deploys otp image with updated ENTRYPOINT

set -e

ROUTER_NAME=${ROUTER_NAME:-hsl}
DATE=$1

ORG=${ORG:-hsldevcom}
DOCKER_TAG=${OTP_TAG:-v1}-$ROUTER_NAME
PROJECT=opentripplanner
DOCKER_IMAGE=$ORG/$PROJECT
DOCKER_DATE_IMAGE=$DOCKER_IMAGE:$DOCKER_TAG-$DATE
DOCKER_IMAGE_TAGGED=$DOCKER_IMAGE:$DOCKER_TAG

docker login -u $DOCKER_USER -p $DOCKER_AUTH

# remove old version (may be necessary in local use)
docker rmi --force $DOCKER_IMAGE_TAGGED &> /dev/null
docker rmi --force $DOCKER_DATE_IMAGE &> /dev/null

echo "Building router's opentripplanner image..."
# Local file context is not needed
# https://docs.docker.com/reference/cli/docker/image/build/#build-with--
cd data/build/$ROUTER_NAME
docker build -t $DOCKER_IMAGE_TAGGED - < ../../../opentripplanner/Dockerfile

echo "*** Pushing $DOCKER_IMAGE_TAGGED"
docker push $DOCKER_IMAGE_TAGGED

docker tag $DOCKER_IMAGE_TAGGED $DOCKER_DATE_IMAGE
echo "*** Pushing $DOCKER_DATE_IMAGE"
docker push $DOCKER_DATE_IMAGE
