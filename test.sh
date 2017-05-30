#!/bin/bash

# needs env variables:
# ROUTER_NAME // hsl/waltti/finland
# DOCKER_TAGGED_IMAGE // test this image

# set defaults

XMX=${XMX:-6100M}
XMS=${XMS:-3G}
ORG=${ORG:-hsldevcom}
ROUTER_NAME=${ROUTER_NAME:-hsl}

if [ "$ROUTER_NAME" == "hsl" ]; then
    MAX_WAIT=10
    URL="http://127.0.0.1:10000/otp/routers/default/plan?fromPlace=60.19812876015124%2C24.934051036834713&toPlace=60.218630210423306%2C24.807472229003906"
elif [ "$ROUTER_NAME" == "waltti" ]; then
    MAX_WAIT=15
    URL="http://127.0.0.1:10000/otp/routers/default/plan?fromPlace=60.44638185995603%2C22.244396209716797&toPlace=60.45053041945487%2C22.313575744628906"
else
    MAX_WAIT=40
    URL="http://127.0.0.1:10000/otp/routers/default/plan?fromPlace=60.19812876015124%2C24.934051036834713&toPlace=60.218630210423306%2C24.807472229003906"
fi

echo -e "\n##### Testing $ROUTER_NAME #####\n"

function shutdown() {
  docker stop otp-data
  docker stop otp
  docker rm otp-data
  docker rm otp
  echo shutting down
}

docker run --name otp-data $DOCKER_TAGGED_IMAGE &
sleep 2
docker run --name otp -p 10000:8080 -e ROUTER_NAME=$ROUTER_NAME -e JAVA_OPTS="-Xms$XMS -Xmx$XMX" -e ROUTER_DATA_CONTAINER_URL=http://otp-data:8080/ --link otp-data:otp-data $ORG/opentripplanner:prod &

ITERATIONS=$(($MAX_WAIT * 6))
echo "max wait (minutes): $MAX_WAIT"

for (( c=1; c<=$ITERATIONS; c++ ));do
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:10000/otp/routers/default)

  if [ $STATUS_CODE = 200 ]; then
    echo "OTP started"
    curl -s "$URL"|grep error
    if [ $? = 1 ]; then #grep finds no error
	echo "OK"
	shutdown
	exit 0;
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
shutdown

exit 1;

