#!/bin/bash
set +e

# set defaults
ORG=${ORG:-hsldevcom}
JAVA_OPTS=${JAVA_OPTS:--Xmx12g}
ROUTER_NAME=${ROUTER_NAME:-hsl}
OTP_TAG=${OTP_TAG:-v2}
TOOLS_TAG=${TOOLS_TAG:-v3}

# set useful variables
TOOL_IMAGE=$ORG/otp-data-tools:$TOOLS_TAG

OTPCONT=otp-$ROUTER_NAME
TOOLCONT=otp-data-tools

function shutdown() {
  echo shutting down
  docker stop $OTPCONT
  docker rm $TOOLCONT &> /dev/null
}

echo -e "\n##### Testing new data #####\n"

echo Starting otp...

docker run --rm --name $OTPCONT -e JAVA_OPTS="$JAVA_OPTS" \
    --mount type=bind,source=$(pwd)/logback-include-extensions.xml,target=/logback-include-extensions.xml \
    --mount type=bind,source=$(pwd)/data/build/$ROUTER_NAME/graph.obj,target=/var/opentripplanner/graph.obj \
    --mount type=bind,source=$(pwd)/data/build/$ROUTER_NAME/otp-config.json,target=/var/opentripplanner/otp-config.json \
    --mount type=bind,source=$(pwd)/data/build/$ROUTER_NAME/router-config.json,target=/var/opentripplanner/router-config.json \
    $ORG/opentripplanner:$OTP_TAG --load --serve &
    sleep 10

echo Getting otp ip..
timeout=$(($(date +%s) + 480))
until IP=$(docker inspect --format '{{ .NetworkSettings.IPAddress }}' $OTPCONT) || [[ $(date +%s) -gt $timeout ]]; do sleep 1;done;

if [ "$IP" == "" ]; then
  echo Could not get ip. failing test
  shutdown
  exit 1
fi

echo Got otp ip: $IP

OTP_URL=http://$IP:8080/otp

for (( c=1; c<=20; c++ ));do
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" $OTP_URL/actuators/health || true)

  if [ $STATUS_CODE = 200 ]; then
    echo OTP started
    curl -s $OTP_URL/gtfs/v1 -H "Content-Type: application/graphql" --data "{agencies {name}}" |grep error
    if [ $? = 1 ]; then #grep finds no error
	echo OTP works
    break
    else
	echo OTP has errors
	shutdown
	exit 1
    fi
  else
    echo waiting for service
    sleep 30
  fi
done

echo running otpqa

docker pull $TOOL_IMAGE
docker run --entrypoint /bin/bash --name $TOOLCONT $TOOL_IMAGE -c "cd OTPQA; /python-venv/bin/python3 otpprofiler_json.py $OTP_URL/gtfs/v1 $ROUTER_NAME $SKIPPED_SITES"

if [ $? == 0 ]; then
  echo getting failed feed list from container
  docker cp $TOOLCONT:/OTPQA/failed_feeds.txt . &> /dev/null
  shutdown
  exit 0
else
  shutdown
  exit 1
fi
