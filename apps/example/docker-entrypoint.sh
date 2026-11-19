#!/bin/sh
set -e

echo "🚀 Starting TelamonJS App..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
timeout=30
counter=0
until pg_isready -h db -p 5432 -U postgres > /dev/null 2>&1 || [ $counter -eq $timeout ]; do
  counter=$((counter + 1))
  echo "Waiting for database... ($counter/$timeout)"
  sleep 1
done

if [ $counter -eq $timeout ]; then
  echo "❌ Database not available after $timeout seconds"
  exit 1
fi

echo "✅ Database is ready!"

# Run migrations
echo "📦 Running Prisma migrations..."
pnpm prisma migrate deploy

# Run seed
echo "🌱 Running seed..."
pnpm db:seed || echo "⚠️  Seed already exists or failed (this is ok)"

echo "🎉 App is ready!"

# Execute the main command
exec "$@"
