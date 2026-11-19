#!/bin/bash

# Database Dump Script
# Creates a timestamped dump of the current database
# Executed by the telamonjs CLI

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Database Dump Tool${NC}\n"

# Read DATABASE_URL from .env
if [ ! -f .env ]; then
  echo -e "${RED}❌ Error: .env not found${NC}"
  exit 1
fi

DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ Error: DATABASE_URL not found in .env${NC}"
  exit 1
fi

# Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo -e "${BLUE}Configuration:${NC}"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Generate dump filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CUSTOM_NAME=$1

if [ -z "$CUSTOM_NAME" ]; then
  DUMP_NAME="dump_${TIMESTAMP}"
else
  DUMP_NAME="${CUSTOM_NAME}_${TIMESTAMP}"
fi

DUMP_FILE="database/dumps/${DUMP_NAME}.sql.gz"

echo -e "${YELLOW}🔄 Creating dump...${NC}"
echo "  File: $DUMP_FILE"
echo ""

# Create dump with pg_dump
export PGPASSWORD="$DB_PASS"

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip > "$DUMP_FILE"

unset PGPASSWORD

# Get file size
FILE_SIZE=$(du -h "$DUMP_FILE" | cut -f1)

echo -e "${GREEN}✅ Dump created successfully!${NC}"
echo ""
echo -e "${BLUE}Details:${NC}"
echo "  File: $DUMP_FILE"
echo "  Size: $FILE_SIZE"
echo ""
echo -e "${YELLOW}💡 To restore:${NC}"
echo "  telamonjs db restore"
echo ""
