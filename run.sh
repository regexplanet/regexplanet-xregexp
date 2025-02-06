#!/bin/bash
#
# run the RegexPlanet XRegExp backend locally
#
set -o errexit
set -o pipefail
set -o nounset

ENVFILE="./.env"

if [ -f "${ENVFILE}" ]
then
    echo "INFO: load env file ${ENVFILE}"
    export $(grep "^[^#]" "${ENVFILE}")
fi

npm install

node src/server.js
