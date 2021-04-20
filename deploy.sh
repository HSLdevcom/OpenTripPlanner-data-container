#!/bin/bash
#builds tests and deploys data container from prepared data


# Set these environment variables
#DOCKER_USER // dockerhub credentials
#DOCKER_AUTH
set -e

ROUTER_NAME=${1:-hsl}
DATE=$(date +"%Y-%m-%dT%H.%M.%S")

ORG=${ORG:-hsldevcom}
CONTAINER=opentripplanner-data-container
DOCKER_IMAGE=$ORG/$CONTAINER-$ROUTER_NAME
DOCKER_TEST_IMAGE=$DOCKER_IMAGE:test


echo "*** Testing $ROUTER_NAME..."

./test.sh $ROUTER_NAME $TEST_TAG $TOOLS_TAG

echo "*** $ROUTER_NAME tests passed"
docker login -u $DOCKER_USER -p $DOCKER_AUTH

if [ -v DOCKER_TAG ] && [ "$DOCKER_TAG" != "undefined" ]; then
    DOCKER_DATE_IMAGE=$DOCKER_IMAGE:$DOCKER_TAG-$DATE
    DOCKER_CUSTOM_IMAGE_TAG=$DOCKER_IMAGE:$DOCKER_TAG
    docker tag $DOCKER_TEST_IMAGE $DOCKER_DATE_IMAGE
    echo "*** Pushing $DOCKER_DATE_IMAGE"
    docker push $DOCKER_DATE_IMAGE
    docker tag $DOCKER_TEST_IMAGE $DOCKER_CUSTOM_IMAGE_TAG
    echo "*** Pushing $DOCKER_CUSTOM_IMAGE_TAG"
    docker push $DOCKER_CUSTOM_IMAGE_TAG
else
    DOCKER_DATE_IMAGE=$DOCKER_IMAGE:latest-$DATE
    DOCKER_LATEST_IMAGE=$DOCKER_IMAGE:latest
    docker tag $DOCKER_TEST_IMAGE $DOCKER_DATE_IMAGE
    echo "*** Pushing $DOCKER_DATE_IMAGE"
    docker push $DOCKER_DATE_IMAGE
    docker tag $DOCKER_TEST_IMAGE $DOCKER_LATEST_IMAGE
    echo "*** Pushing $DOCKER_LATEST_IMAGE"
    docker push $DOCKER_LATEST_IMAGE
    echo "*** Deployed $ROUTER_NAME"
fi
