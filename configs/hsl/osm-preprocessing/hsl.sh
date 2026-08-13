#!/usr/bin/env bash

set -x

osmconvert hsl.pbf -o=hsl.o5m
osmfilter hsl.o5m -o=hsl2.o5m --modify-tags="ref=H0071 to ref=no \
                                             ref=H0091 to ref=no \
                                             ref=H0072 to ref=no \
                                             ref=H0079 to ref=no \
                                             ref=H0082 to ref=no \
                                             ref=H0083 to ref=no \
                                             ref=H0084 to ref=no"
osmconvert hsl2.o5m -o=hsl.pbf
