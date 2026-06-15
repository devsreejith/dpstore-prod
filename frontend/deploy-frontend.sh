#!/bin/bash
set -e

echo "=== Deploying DP Store Frontend ==="

# Move to frontend directory
cd /var/www/dpstore-prod/frontend

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build the Next.js application
echo "Building Frontend..."
pnpm build

# Start the production server
echo "Starting production server..."
pnpm start
