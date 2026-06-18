#!/bin/sh
set -e

# Install node_modules so Capacitor SPM packages can be resolved
cd "$CI_WORKSPACE"
npm install
