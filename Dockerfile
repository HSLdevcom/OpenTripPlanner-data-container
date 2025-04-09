FROM docker:dind
MAINTAINER Digitransit version: 1

RUN apk add --update --no-cache bash zip curl nodejs yarn && rm -rf /var/cache/apk/*

WORKDIR /opt/otp-data-builder

ADD . /opt/otp-data-builder/

RUN yarn install

CMD ( dockerd-entrypoint.sh & ) && sleep 30 && unset DOCKER_HOST && node index.js
