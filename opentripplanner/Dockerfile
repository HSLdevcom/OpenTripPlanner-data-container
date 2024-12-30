ARG OTP_TAG="v2"
FROM hsldevcom/opentripplanner:${OTP_TAG}

ARG OTP_GRAPH_DIR
ENV OTP_GRAPH_DIR=$OTP_GRAPH_DIR

ADD entrypoint.sh /var/entrypoint.sh

WORKDIR /var/otp/${OTP_GRAPH_DIR}

ENTRYPOINT ["/var/entrypoint.sh"]