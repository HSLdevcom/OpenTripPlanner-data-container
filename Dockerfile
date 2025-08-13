FROM docker:dind

RUN apk add --update --no-cache bash zip p7zip curl nodejs yarn && rm -rf /var/cache/apk/*

WORKDIR /opt/otp-data-builder

ADD . /opt/otp-data-builder/

RUN yarn install

CMD ( dockerd-entrypoint.sh --log-level=error > /dev/null 2>&1 & ) && unset DOCKER_HOST && sleep 180 && node index.js
