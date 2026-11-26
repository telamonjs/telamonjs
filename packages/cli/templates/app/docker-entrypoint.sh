#!/bin/sh
set -e

echo "🚀 Starting TelamonJS App..."

# Run migrations, retrying while the database starts (the image has no
# database client to probe it with; Prisma's own connection is the probe)
echo "📦 Running Prisma migrations..."
timeout=30
counter=0
until pnpm prisma migrate deploy; do
  counter=$((counter + 1))
  if [ $counter -ge $timeout ]; then
    echo "❌ Migrations failed after $timeout attempts (is the database up?)"
    exit 1
  fi
  echo "Waiting for database... ($counter/$timeout)"
  sleep 1
done

# Run seed (idempotent: syncs permissions; creates the first admin on an
# empty database only). A failure stops the container.
echo "🌱 Running seed..."
if ! pnpm db:seed; then
  echo "❌ Seed failed (see the error above). On an empty database, set SEED_ADMIN_PASSWORD to create the first admin."
  exit 1
fi

echo "🎉 App is ready!"

# Execute the main command
exec "$@"
