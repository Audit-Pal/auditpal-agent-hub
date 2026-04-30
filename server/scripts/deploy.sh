#!/bin/sh
# Render Deployment Script
# This script is called by the 'deploy' script in package.json

set -e # Exit on error

echo "🚀 Starting deployment flow..."

# Load local environment if .env.dev exists and DATABASE_URL is not set
if [ -f .env.dev ] && [ -z "$DATABASE_URL" ]; then
    echo "ℹ️  Loading environment from .env.dev..."
    export $(grep -v '^#' .env.dev | xargs)
fi

# 1. Generate Prisma Client
echo "📡 Generating Prisma client..."
bun prisma generate

# 2. Sync Database Schema
# Note: 'db push' is used to force-sync the schema regardless of migration history.
echo "🗄️  Syncing database schema..."
bun prisma db push --accept-data-loss --skip-generate

# 3. Seed the Database
# The seed script uses upsert, so it's safe to run multiple times.
echo "🌱 Seeding database..."
bun run db:seed

# 4. Start the server
echo "⚡ Starting server in production mode..."
export NODE_ENV=production
bun run start
