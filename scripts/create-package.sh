#!/bin/bash
# Create a deployable package

set -e

VERSION=${1:-"1.0.0"}
PACKAGE_NAME="ces-lead-generator-v2-${VERSION}"
DIST_DIR="dist"
OUTPUT_DIR="deploy-packages"
OUTPUT_FILE="${OUTPUT_DIR}/${PACKAGE_NAME}.tar.gz"

echo "Creating deployable package v${VERSION}..."

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Build for local deployment
echo "Building app..."
npm run build -- --base /

# Create package directory
rm -rf "$PACKAGE_NAME"
mkdir -p "$PACKAGE_NAME"

# Copy dist contents
cp -r "$DIST_DIR"/* "$PACKAGE_NAME/"

# Create .env.example
cat > "$PACKAGE_NAME/.env.example" << 'EOF'
# Backend: "supabase" (default) or "rest" (any REST API server)
VITE_DB_BACKEND=supabase

# Supabase config (only needed when VITE_DB_BACKEND=supabase)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# REST API config (only needed when VITE_DB_BACKEND=rest)
VITE_API_URL=http://localhost:3000
EOF

# Create serve script
cat > "$PACKAGE_NAME/serve.sh" << 'EOF'
#!/bin/bash
PORT=${1:-3000}
echo "Serving CES Lead Generator on http://localhost:$PORT"
npx serve . -l $PORT --no-clipboard
EOF

chmod +x "$PACKAGE_NAME/serve.sh"

# Create package.json for serve dependency
cat > "$PACKAGE_NAME/package.json" << 'EOF'
{
  "name": "ces-lead-generator-v2",
  "version": "VERSION_PLACEHOLDER",
  "private": true,
  "scripts": {
    "serve": "npx serve . -l 3000",
    "start": "npx serve . -l 3000"
  },
  "devDependencies": {
    "serve": "^14.2.6"
  }
}
EOF
sed -i '' "s/VERSION_PLACEHOLDER/$VERSION/g" "$PACKAGE_NAME/package.json"

# Create README
cat > "$PACKAGE_NAME/README.md" << 'EOF'
# CES Lead Generator v2 - Deployable Package

## Quick Start

1. Install dependencies (optional, for local serving):
   ```bash
   npm install
   ```

2. Serve locally:
   ```bash
   npm start
   # or
   ./serve.sh
   ```

3. Open http://localhost:3000

## Options

### Using Supabase (default)
Set `VITE_DB_BACKEND=supabase` and configure Supabase credentials.

### Using Custom REST Backend
Set `VITE_DB_BACKEND=rest` and configure your REST API server.

## Deploy to Production

Copy all files in this package to your web server's document root.
EOF

# Create tarball
tar -czf "$OUTPUT_FILE" "$PACKAGE_NAME"

# Cleanup
rm -rf "$PACKAGE_NAME"

echo "Package created: $OUTPUT_FILE"
echo "Extract and run ./serve.sh to test locally"
