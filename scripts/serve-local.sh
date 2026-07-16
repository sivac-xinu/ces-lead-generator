#!/bin/bash
# Serve the dist folder locally for testing

set -e

PORT=${1:-3000}
echo "Serving CES Lead Generator on http://localhost:$PORT"
npx serve dist -l $PORT --no-clipboard
