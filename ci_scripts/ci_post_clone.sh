#!/bin/sh
set -e

# Install node_modules so Capacitor SPM packages can be resolved
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install
