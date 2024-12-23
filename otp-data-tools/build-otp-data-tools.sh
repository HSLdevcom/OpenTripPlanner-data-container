#!/usr/bin/env bash
set -e

apt-get update && apt-get -y install git python3 python3-pip python3-venv
rm -rf /var/lib/apt/lists/*
python3 -m venv python-venv && python-venv/bin/pip install future grequests numpy
git clone -b v3 --single-branch https://github.com/HSLdevcom/OTPQA.git
