FROM opentransitsoftwarefoundation/onebusaway-gtfs-transformer-cli:12.0.0
LABEL maintainer="Digitransit (digitransit.fi)" \
      version="1.1" \
      repo="https://github.com/HSLdevcom/OpenTripPlanner-data-container"

RUN apt-get update && apt-get -y install git python3 python3-pip python3-venv osmctools
RUN rm -rf /var/lib/apt/lists/*
RUN python3 -m venv python-venv && python-venv/bin/pip install future grequests numpy
RUN git clone -b v3 --single-branch https://github.com/HSLdevcom/OTPQA.git

RUN mkdir /data
VOLUME /data
