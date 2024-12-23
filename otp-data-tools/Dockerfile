FROM eclipse-temurin:21-jre
LABEL maintainer="Digitransit (digitransit.fi)" \
      version="1.0" \
      repo="https://github.com/HSLdevcom/OpenTripPlanner-data-container"

ADD onebusaway-gtfs-transformer-cli.jar /
ADD build-otp-data-tools.sh ${WORK}
VOLUME /data
RUN ./build-otp-data-tools.sh && rm build-otp-data-tools.sh
