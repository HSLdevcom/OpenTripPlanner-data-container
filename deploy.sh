#!/bin/bash

# Set these environment variables
#ROUTER_NAME // hsl/waltti/finland
#DOCKER_USER // dockerhub credentials
#DOCKER_AUTH
#DOCKER_TAG or TRAVIS_COMMIT
set -e


ORG=${ORG:-hsldevcom}
CONTAINER=opentripplanner-data-container
DOCKER_TAG=${DOCKER_TAG:-$TRAVIS_COMMIT}
DOCKER_IMAGE=$ORG/$CONTAINER-$ROUTER_NAME
DOCKER_LATEST_IMAGE=$DOCKER_IMAGE:latest
DOCKER_PROD_IMAGE=$DOCKER_IMAGE:prod
export DOCKER_TAGGED_IMAGE=$DOCKER_IMAGE:$DOCKER_TAG

#retrieve the image we built recently
docker pull $DOCKER_TAGGED_IMAGE

./test.sh

echo "*** Tests passed, deploying for $ROUTER_NAME"

docker login -u $DOCKER_USER -p $DOCKER_AUTH
docker tag $DOCKER_TAGGED_IMAGE $DOCKER_LATEST_IMAGE
docker push $DOCKER_LATEST_IMAGE

#enable when new there's good confidence in the new build
#docker tag -f $DOCKER_TAGGED_IMAGE $DOCKER_PROD_IMAGE
#docker push $DOCKER_PROD_IMAGE

echo "*** $ROUTER_NAME build finished succesfully"