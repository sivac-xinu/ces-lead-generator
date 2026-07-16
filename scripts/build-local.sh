#!/bin/bash
# Build the app for local deployment (base path /)

set -e

echo "Building for local deployment..."
npx vite build --base /
cp dist/index.html dist/404.html
echo "Build complete: dist/"
