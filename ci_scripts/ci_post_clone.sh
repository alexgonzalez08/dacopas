#!/bin/sh
set -e

echo "=== ci_post_clone.sh ==="
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"

# Load nvm so node/npm are in PATH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Fallback: install node via Homebrew if npm not found
if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found, installing via Homebrew..."
    brew install node
fi

echo "node: $(node --version)"
echo "npm: $(npm --version)"

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

echo "=== node_modules instalados ==="
