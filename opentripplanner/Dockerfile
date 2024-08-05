FROM hsldevcom/opentripplanner:<OTP_TAG>

WORKDIR /

ENTRYPOINT java $JAVA_OPTS -cp $( cat /app/jib-classpath-file ) $( cat /app/jib-main-class-file ) --server --port 8888 --basePath / --graphs /var/otp/<OTP_GRAPHS_DIR> --router <ROUTER>