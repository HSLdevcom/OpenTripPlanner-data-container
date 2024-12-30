#!/bin/bash
set -e

echo "OTP_GRAPH_DIR: ${OTP_GRAPH_DIR}"

java $JAVA_OPTS -cp @/app/jib-classpath-file @/app/jib-main-class-file /var/otp/${OTP_GRAPH_DIR} --load --serve
