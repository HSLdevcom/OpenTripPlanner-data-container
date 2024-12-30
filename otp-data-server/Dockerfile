FROM       alpine:latest
LABEL authors="Digitransit version: 2"

RUN apk add --update --no-cache \
  lighttpd \
  lighttpd-mod_auth \
  busybox \
  && rm -rf /var/cache/apk/*

ARG OTP_GRAPH_DIR
ENV OTP_GRAPH_DIR=${OTP_GRAPH_DIR}
ADD lighttpd.conf /etc/lighttpd/lighttpd.conf
RUN printf '#!/bin/sh\ngrep -v "#" /etc/lighttpd/lighttpd.conf |grep port > /dev/null\nif [ "$?" = "1" ]\nthen\n  echo "server.port = $PORT" >> /etc/lighttpd/lighttpd.conf\nfi\n/usr/sbin/lighttpd -D -f /etc/lighttpd/lighttpd.conf 2>&1' > /usr/sbin/startlighttpd && chmod 755 /usr/sbin/startlighttpd

ENV PORT="8080"
EXPOSE 8080

CMD /bin/ash -c "/usr/sbin/startlighttpd"
