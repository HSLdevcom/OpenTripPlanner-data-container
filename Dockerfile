FROM docker:dind

RUN apk add --update --no-cache bash zip p7zip curl nodejs yarn tzdata && rm -rf /var/cache/apk/*

ENV TZ=Europe/Helsinki

WORKDIR /opt/otp-data-builder

ADD . /opt/otp-data-builder/

RUN yarn install --immutable

CMD ( dockerd-entrypoint.sh --log-level=error > /dev/null 2>&1 & ) && unset DOCKER_HOST && node src/index.js
