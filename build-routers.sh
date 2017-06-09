#!/bin/bash
set -e
set -x
set -o pipefail

# Default value is for tmalloc threshold is 1073741824
# This is too small, and causes GTFS shape mapfit to
# log info, which then breaks the build
# Therefore, we increase this value
export TCMALLOC_LARGE_ALLOC_REPORT_THRESHOLD=2147483648

echo ""
echo "================================="
echo "  Building image for $ROUTER_NAME"
echo "================================="
echo ""

# Base locations
ROOT=/opt/opentripplanner-data-container

# router alternatives
ROUTER_FINLAND=$ROOT/router-finland
ROUTER_HSL=$ROOT/router-hsl
ROUTER_WALTTI=$ROOT/router-waltti

# Tools
FIT_GTFS=$ROOT/gtfs_shape_mapfit/fit_gtfs.bash
FIT_GTFS_STOPS=$ROOT/gtfs_shape_mapfit/fit_gtfs_stops.bash
OBA_GTFS=$ROOT/one-busaway-gtfs-transformer/onebusaway-gtfs-transformer-cli.jar


function downloadTampere() {
  echo "Retrieving Tampere data..."
  cd $ROUTER_FINLAND
  curl -sS -z tampere.zip "http://data.itsfactory.fi/journeys/files/gtfs/latest/gtfs_tampere.zip" -o tampere.zip
}
function retrieveTampere() {
  downloadTampere
  set +e
  $FIT_GTFS finland-latest.osm.pbf +init=epsg:3067 tampere.zip tampere_fitted.zip &> tampere.fit.log.txt
  fit_pid=$!

  while  ps | grep " $fit_pid "
  do
      echo "fitting GTFS..."
      sleep 60
  done

  wait

  RESULT=$?
  if [ $RESULT -ne 0 ]; then
      echo "GTFS fit failed"
      tail -100 tampere.fit.log.txt
      exit 1
  fi
  set -e
  mv tampere_fitted.zip tampere.zip
  add_feed_id tampere.zip JOLI
}

function downloadJyvaskyla() {
  echo "Retrieving Jyväskylä data..."
  cd $ROUTER_FINLAND
  curl -sS -z jyvaskyla.zip "http://data.jyvaskyla.fi/tiedostot/linkkidata.zip" -o jyvaskyla.zip
}
function retrieveJyvaskyla() {
  downloadJyvaskyla
  add_feed_id jyvaskyla.zip LINKKI

  cp jyvaskyla.zip $ROUTER_WALTTI
}

function downloadOulu() {
  echo "Retrieving Oulu data..."
  cd $ROUTER_FINLAND
  curl -sS -z oulu.zip "http://www.transitdata.fi/oulu/google_transit.zip" -o oulu.zip
}
function retrieveOulu() {
  downloadOulu
  add_feed_id oulu.zip OULU

  cp oulu.zip $ROUTER_WALTTI
}


function downloadLauttaNet() {
  echo "Retrieving Lautta.net data..."
  cd $ROUTER_FINLAND
  curl -sS -z lautta.zip "http://lautta.net/db/gtfs/gtfs.zip" -o lautta.zip
}
function retrieveLauttaNet() {
  downloadLauttaNet
  add_feed_id lautta.zip LAUTTA
}


function downloadHsl() {
  echo "Retrieving HSL data..."
  cd $ROUTER_HSL
  curl -sS -z hsl.zip "http://dev.hsl.fi/gtfs/hsl.zip" -o hsl.zip
}
function retrieveHsl() {
  downloadHsl
  unzip -o hsl.zip stop_times.txt
  # TODO: Check that the line is in expected format
  # Needed in order to get rid of "shape_distance_travelled"
  # this field is not currently available in shapes.txt. OpenTripPlanner needs it to be.
  cut --complement -f 9 -d, stop_times.txt > stop_times.new
  mv stop_times.new stop_times.txt
  zip -f hsl.zip stop_times.txt
  rm stop_times.txt

  # Note! we use finland OSM graph
  echo "Note! Next mapfit requires lot of memory. If it fails mysteriously, try adding more."
  set +e
  $FIT_GTFS $ROUTER_FINLAND/finland-latest.osm.pbf +init=epsg:3067 hsl.zip hsl_fitted.zip &> hsl.fit.log.txt &
  fit_pid=$!

  while   ps | grep " $fit_pid "
  do
      echo "fitting GTFS..."
      sleep 60
  done

  wait

  RESULT=$?
  if [ $RESULT -ne 0 ]; then
      echo "GTFS fit failed"
      tail -100 hsl.fit.log.txt
      exit 1
  fi
  set -e
  echo "HSL mapfit ready."
  mv hsl_fitted.zip hsl.zip
  add_feed_id hsl.zip HSL
  # HSL data is also needed in national graph
  cp hsl.zip $ROUTER_FINLAND
}

function downloadWaltti() {
  echo "Retrieving Waltti data..."
  cd $ROUTER_WALTTI
  curl -sS -z hameenlinna.zip "http://dev.hsl.fi/gtfs.waltti/hameenlinna.zip" -o hameenlinna.zip
  curl -sS -z kajaani.zip "http://dev.hsl.fi/gtfs.waltti/kajaani.zip" -o kajaani.zip
  curl -sS -z keski-suomen_ely.zip "http://dev.hsl.fi/gtfs.waltti/keski-suomen_ely.zip" -o keski-suomen_ely.zip
  curl -sS -z kotka.zip "http://dev.hsl.fi/gtfs.waltti/kotka.zip" -o kotka.zip
  curl -sS -z kvl.zip "http://dev.hsl.fi/gtfs.waltti/kvl.zip" -o kvl.zip
  curl -sS -z lappeenranta.zip "http://dev.hsl.fi/gtfs.waltti/lappeenranta.zip" -o lappeenranta.zip
  curl -sS -z mikkeli.zip "http://dev.hsl.fi/gtfs.waltti/mikkeli.zip" -o mikkeli.zip
  curl -sS -z pohjois-pohjanmaan_ely.zip "http://dev.hsl.fi/gtfs.waltti/pohjois-pohjanmaan_ely.zip" -o pohjois-pohjanmaan_ely.zip
  curl -sS -z posely_iisalmi.zip "http://dev.hsl.fi/gtfs.waltti/posely_iisalmi.zip" -o posely_iisalmi.zip
  curl -sS -z posely_mikkeli.zip "http://dev.hsl.fi/gtfs.waltti/posely_mikkeli.zip" -o posely_mikkeli.zip
  curl -sS -z vaasa.zip "http://dev.hsl.fi/gtfs.waltti/vaasa.zip" -o vaasa.zip
}
function retrieveWaltti() {
  downloadWaltti
  # Note! we use finland OSM graph
  cp $ROUTER_FINLAND/finland-latest.osm.pbf .

  add_feed_id hameenlinna.zip Hameenlinna
  add_feed_id kajaani.zip Kajaani
  add_feed_id keski-suomen_ely.zip KeskiSuomenEly
  add_feed_id kotka.zip Kotka
  add_feed_id kvl.zip Kouvola
  add_feed_id lappeenranta.zip Lappeenranta
  add_feed_id mikkeli.zip Mikkeli
  add_feed_id pohjois-pohjanmaan_ely.zip PohjoisPohjanmaanEly
  add_feed_id posely_iisalmi.zip IisalmiEly
  add_feed_id posely_mikkeli.zip MikkeliEly
  add_feed_id vaasa.zip Vaasa
}

function downloadJoensuu() {
  echo "Retrieving Joensuu data..."
  cd $ROUTER_WALTTI
  curl -sS -z joensuu.zip "http://dev.hsl.fi/gtfs.waltti/joensuu.zip" -o joensuu.zip
  curl -sS -z posely_joensuu.zip "http://dev.hsl.fi/gtfs.waltti/posely_joensuu.zip" -o posely_joensuu.zip
}
function retrieveJoensuu() {
  downloadJoensuu
  rm -rf joensuu

  transformGTFS "java -server -Xmx8G -jar $OBA_GTFS --transform=$ROUTER_WALTTI/gtfs-rules/waltti.rule joensuu.zip joensuu"

  rm joensuu.zip
  cd joensuu
  zip ../joensuu.zip *
  cd ..

  add_feed_id joensuu.zip Joensuu
  add_feed_id posely_joensuu.zip JoensuuEly
}


function downloadTurku() {
  echo "Retrieving Turku/Foli data..."
  cd $ROUTER_WALTTI
  curl -sS -z foli.zip "http://dev.hsl.fi/gtfs.foli/foli.zip" -o foli.zip
}
function retrieveTurku() {
  downloadTurku
  add_feed_id foli.zip FOLI
}

function downloadLahti() {
  echo "Retrieving Lahti data..."
  cd $ROUTER_WALTTI
  curl -sS -z lahti.zip "http://dev.hsl.fi/gtfs.lahti/lahti.zip" -o lahti.zip
}
function retrieveLahti() {
  downloadLahti
  add_feed_id lahti.zip Lahti
}

function downloadKuopio() {
  echo "Retrieving Kuopio data..."
  cd $ROUTER_WALTTI
  curl -sS -z kuopio.zip "http://dev.hsl.fi/gtfs.kuopio/kuopio.zip" -o kuopio.zip
}

function retrieveKuopio() {
  downloadKuopio
  add_feed_id kuopio.zip Kuopio
}

function downloadKoontikanta() {
  echo "Retrieving Koontikanta data..."
  cd $ROUTER_FINLAND

  curl -sS -z matka.zip "http://dev.hsl.fi/gtfs.matka/matka.zip" -o matka.zip
}
function retrieveKoontikanta() {
  downloadKoontikanta
  rm -rf koontikanta
  mkdir -p koontikanta

  transformGTFS "java -server -Xmx8G -jar $OBA_GTFS --transform=$ROUTER_FINLAND/gtfs-rules/matka.rule matka.zip koontikanta/matka.tmp"
  # rename id's as a separate pass to avoid nondeterminism
  transformGTFS "java -server -Xmx8G -jar $OBA_GTFS --transform=$ROUTER_FINLAND/gtfs-rules/matka-id.rule koontikanta/matka.tmp koontikanta/matka"
  # sed -i -e '1 a''MATKA,matka.fi,http://www.matka.fi/,Europe/Helsinki,' koontikanta/matka/agency.txt

  cd koontikanta/matka
  zip ../../matka.filtered.zip *
  cd ../..

  mv matka.filtered.zip matka.zip
  set +e
  $FIT_GTFS_STOPS finland-latest.osm.pbf +init=epsg:3067 matka.zip matka_fitted.zip &> matka.fit.log.txt
  fit_pid=$!

  while ps | grep " $fit_pid "
  do
      echo "fitting GTFS..."
      sleep 60
  done

  wait

  RESULT=$?
  if [ $RESULT -ne 0 ]; then
      echo "GTFS fit failed"
      tail -100 matka.fit.log.txt
      exit 1
  fi
  set -e

  mv matka_fitted.zip matka.zip

  add_feed_id matka.zip MATKA
}

# One Bus away transform does not end terminate with a correct error code. Check that here and fail if configuration is set
function transformGTFS() {
  if (! $1 2>&1) | grep "Exception"
  then
    echo "Failed to transform GTFS data"
    exit 1
  fi
}

#add (or modify) feed_info.txt that contains the feed_id
function add_feed_id() {
  echo "Adding feed" $2
  set +o pipefail
  filename=$1
  id=$2

  contains_fileinfo=`unzip -l $filename|grep feed_info.txt|wc -l`

  if [ "$contains_fileinfo" -ne "1" ]; then
    echo "creating new feed-info"
    #no feed info available in zip, write whole file
    cat <<EOT > feed_info.txt
feed_publisher_name,feed_publisher_url,feed_lang,feed_id
$id-fake-name,$id-fake-url,$id-fake-lang,$id
EOT
  else
    unzip -o $filename feed_info.txt
    tr -d '\r' < feed_info.txt > feed_info_new.txt
    mv feed_info_new.txt feed_info.txt
    #see if if feed_id is already there
    count=`grep feed_id feed_info.txt|wc -l`
    if [ "$count" -ne "1" ]; then
      echo "adding feed_id column"
      #no feed_id in feed_info.txt, append
      awk -vc="feed_id" -vd="$id" 'NR==1{$0=$0","c}NR!=1{$0=$0","d}1' feed_info.txt > feed_info_new.txt
    else
      echo "changing existing id"
      #existing feed_id, replace it
      original=`awk -F ',' 'NR==1 {for (i=1; i<=NF; i++) {ix[$i] = iNR>1 {printf "%s\n", $ix["feed_id"]}' c1=feed_id feed_info.txt`
      echo "chaning existing id $original to $id"
      cat feed_info.txt | sed s/$original/$id/g > feed_info_new.txt
    fi
    mv feed_info_new.txt feed_info.txt
  fi

  # add feed_info to zip
  zip $filename feed_info.txt
  set -o pipefail
  echo "Feed" $2 "added"
}


function download1() {
    downloadTampere
    downloadJyvaskyla
    downloadOulu
    downloadLauttaNet
}

function download2() {
    downloadHsl
}

function download3() {
    downloadKoontikanta
}

function retrieve1() {
    retrieveTampere
    retrieveHsl
}

function retrieve2() {
    retrieveJyvaskyla
    retrieveOulu
    retrieveLauttaNet
}

function retrieve3() {
    retrieveKoontikanta
}

# Here we go

mkdir ${WEBROOT}

if [ "$ROUTER_NAME" == "hsl" ]; then
    retrieveHsl
    cd $ROOT
    zip -D ${WEBROOT}/router-hsl.zip router-hsl/*
elif [ "$ROUTER_NAME" == "waltti" ]; then
    retrieveJyvaskyla
    retrieveOulu
    retrieveWaltti
    retrieveJoensuu
    retrieveTurku
    retrieveLahti
    retrieveKuopio
    cd $ROOT
    zip -D ${WEBROOT}/router-waltti.zip router-waltti/*
else
    retrieveTampere
    retrieveHsl
    retrieveJyvaskyla
    retrieveOulu
    retrieveLauttaNet
    retrieveKoontikanta
    cd $ROOT
    zip -D ${WEBROOT}/router-finland.zip router-finland/*
fi

echo $DOCKER_TAG > ${WEBROOT}/version.txt

echo "GTFS data fetched, transformed and packed"
