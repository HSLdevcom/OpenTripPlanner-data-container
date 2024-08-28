#!/bin/bash
set +e

# set defaults
ORG=${ORG:-hsldevcom}
JAVA_OPTS=${JAVA_OPTS:--Xmx10g}
ROUTER_NAME=${1:-hsl}
TEST_TAG=${2:-latest}
TOOLS_TAG=${3:-latest}
SKIPPED_SITES="$4"

function shutdown() {
  echo shutting down
  docker stop otp-$ROUTER_NAME || true
}

if [ -n "$SKIPPED_SITES" ] && [ $SKIPPED_SITES == "all" ]; then
    echo "*** Skipping all tests"
    exit 0
fi

echo -e "\n##### Testing $ROUTER_NAME #####\n"

echo "Starting otp..."
docker run --rm --name otp-$ROUTER_NAME -e JAVA_OPTS="$JAVA_OPTS" \
    --mount type=bind,source=$(pwd)/data/build/$ROUTER_NAME/Graph.obj,target=/var/opentripplanner/Graph.obj \
    --mount type=bind,source=$(pwd)/data/build/$ROUTER_NAME/router-config.json,target=/var/opentripplanner/router-config.json \
    $ORG/opentripplanner:$TEST_TAG --server --port 8888 --basePath ./ --graphs /var/ --router opentripplanner &
    sleep 10

echo "Getting otp ip.."
timeout=$(($(date +%s) + 480))
until IP=$(docker inspect --format '{{ .NetworkSettings.IPAddress }}' otp-$ROUTER_NAME) || [[ $(date +%s) -gt $timeout ]]; do sleep 1;done;

if [ "$IP" == "" ]; then
  echo "Could not get ip. failing test"
  shutdown
  exit 1
fi

echo "Got otp ip: $IP"

if [ "$ROUTER_NAME" == "hsl" ]; then
    MAX_WAIT=30
    URL="http://$IP:8080/otp/routers/default/plan?fromPlace=60.19812876015124%2C24.934051036834713&toPlace=60.218630210423306%2C24.807472229003906"
elif [ "$ROUTER_NAME" == "waltti" ]; then
    MAX_WAIT=60
    URL="http://$IP:8080/otp/routers/default/plan?fromPlace=61.525191269%2C23.637256622&toPlace=61.451403852726%2C23.8454389572"
else
    MAX_WAIT=60
    URL="http://$IP:8080/otp/routers/default/plan?fromPlace=60.19812876015124%2C24.934051036834713&toPlace=60.218630210423306%2C24.807472229003906"
fi

ITERATIONS=$(($MAX_WAIT * 6))
echo "max wait (minutes): $MAX_WAIT"

for (( c=1; c<=$ITERATIONS; c++ ));do
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$IP:8080/otp/routers/default || true)

  if [ $STATUS_CODE = 200 ]; then
    echo "OTP started"
    curl -s "$URL"|grep error
    if [ $? = 1 ]; then #grep finds no error
	echo "OK"
    break
    else
	echo "ERROR"
	shutdown
	exit 1;
    fi
  else
    echo "waiting for service"
    sleep 10
  fi
done

echo "running otpqa"
docker pull $ORG/otp-data-tools:$TOOLS_TAG
docker run --rm --name otp-data-tools $ORG/otp-data-tools:$TOOLS_TAG /bin/sh -c "cd OTPQA; python otpprofiler_json.py http://$IP:8080/otp/routers/default $ROUTER_NAME $SKIPPED_SITES"
if [ $? == 0 ]; then
  echo "OK"
  shutdown
  exit 0;
else
  echo "ERROR"
  shutdown
  exit 1;
fi

shutdown
exit 1;
