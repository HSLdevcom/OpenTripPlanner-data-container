FROM hsldevcom/opentripplanner:<OTP_TAG>

WORKDIR /var/otp/<OTP_GRAPH_DIR>

ENTRYPOINT java $JAVA_OPTS -cp $( cat /app/jib-classpath-file ) $( cat /app/jib-main-class-file ) --server --port 8888 --basePath ./ --graphs /var/otp/ --router <OTP_GRAPH_DIR>