#!/usr/bin/env bash
# Render Deployment Script
# This script is called by the 'deploy' script in package.json

set -e # Exit on error

echo "🚀 Starting deployment flow..."

# 1. Generate Prisma Client
echo "📡 Generating Prisma client..."
bunx prisma generate

# 2. Run Database Migrations
# Note: 'migrate deploy' is for production; it applies pending migrations without reset.
echo "🗄️  Running database migrations..."
bunx prisma migrate deploy

# 3. Seed the Database
# The seed script uses upsert, so it's safe to run multiple times.
echo "🌱 Seeding database..."
bun run db:seed

# 4. Start the server
echo "⚡ Starting server in production mode..."
export NODE_ENV=production
bun run start
