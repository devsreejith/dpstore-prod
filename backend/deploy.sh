#!/bin/bash
set -e

echo "=== Deploying DP Store Backend ==="

# Move to backend directory
cd /var/www/dpstore-prod/backend

# Remove previous compiled build
echo "Cleaning old build..."
rm -rf .medusa/server

# Build Medusa
echo "Building Medusa..."
pnpm medusa build

# Move to compiled server
cd .medusa/server

# Copy environment file
echo "Copying environment file..."
cp ../../.env .env

# Install dependencies
echo "Installing dependencies..."
pnpm install --prod

# Start in production mode
echo "Starting production server..."
NODE_ENV=production pnpm start
