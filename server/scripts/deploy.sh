#!/bin/sh
# Render Deployment Script
# This script is called by the 'deploy' script in package.json

set -e # Exit on error

echo "🚀 Starting deployment flow..."

# 1. Generate Prisma Client
echo "📡 Generating Prisma client..."
bunx prisma generate

# 2. Sync Database Schema
# Note: 'db push' is used to force-sync the schema regardless of migration history.
echo "🗄️  Syncing database schema..."
bunx prisma db push --accept-data-loss --skip-generate

# 3. Seed the Database
# The seed script uses upsert, so it's safe to run multiple times.
echo "🌱 Seeding database..."
bun run db:seed

# 4. Start the server
echo "⚡ Starting server in production mode..."
export NODE_ENV=production
bun run start
