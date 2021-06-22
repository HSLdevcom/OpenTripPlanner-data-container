FROM docker:20.10.7-dind
MAINTAINER Digitransit version: 0.1

RUN apk add --update --no-cache bash curl nodejs nodejs-npm \
  && rm -rf /var/cache/apk/*

WORKDIR /opt/otp-data-builder

ADD package-lock.json package.json *.js *.sh  gulpfile.js /opt/otp-data-builder/

ADD task /opt/otp-data-builder/task
ADD router-finland /opt/otp-data-builder/router-finland
ADD router-hsl /opt/otp-data-builder/router-hsl
ADD router-waltti /opt/otp-data-builder/router-waltti
ADD otp-data-container /opt/otp-data-builder/otp-data-container

RUN npm install

CMD ( dockerd-entrypoint.sh & ) && sleep 30 && unset DOCKER_HOST && node index.js once
