#!/bin/sh
set -e

# Node.js is available via nvm in Xcode Cloud but not in PATH by default
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install
