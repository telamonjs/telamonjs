#!/bin/bash

# Database Restore Script
# Lists available dumps and restores the selected one (interactive CLI)
# Executed by the telamonjs CLI

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}♻️  Database Restore Tool${NC}\n"

# Check if dumps directory exists and has dumps
DUMPS_DIR="database/dumps"

if [ ! -d "$DUMPS_DIR" ]; then
  echo -e "${RED}❌ Error: database/dumps/ directory not found${NC}"
  exit 1
fi

# List all dumps
DUMPS=($(ls -1 "$DUMPS_DIR"/*.sql.gz 2>/dev/null | sort -r))

if [ ${#DUMPS[@]} -eq 0 ]; then
  echo -e "${RED}❌ No dumps found in database/dumps/${NC}"
  echo ""
  echo -e "${YELLOW}💡 To create a dump:${NC}"
  echo "  telamonjs db dump"
  exit 1
fi

# Show available dumps
echo -e "${BLUE}📋 Available dumps:${NC}\n"

for i in "${!DUMPS[@]}"; do
  DUMP="${DUMPS[$i]}"
  BASENAME=$(basename "$DUMP")
  FILE_SIZE=$(du -h "$DUMP" | cut -f1)
  FILE_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$DUMP" 2>/dev/null || stat -c "%y" "$DUMP" 2>/dev/null | cut -d'.' -f1)

  echo -e "${CYAN}[$((i+1))]${NC} $BASENAME"
  echo "    Size: $FILE_SIZE"
  echo "    Date: $FILE_DATE"
  echo ""
done

# Ask user to select dump
echo -e "${YELLOW}Select the dump to restore [1-${#DUMPS[@]}] or 'q' to cancel:${NC} "
read -r SELECTION

# Handle cancel
if [ "$SELECTION" = "q" ] || [ "$SELECTION" = "Q" ]; then
  echo -e "\n${YELLOW}❌ Operation cancelled${NC}"
  exit 0
fi

# Validate selection
if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt ${#DUMPS[@]} ]; then
  echo -e "\n${RED}❌ Invalid selection${NC}"
  exit 1
fi

# Get selected dump
SELECTED_DUMP="${DUMPS[$((SELECTION-1))]}"
SELECTED_NAME=$(basename "$SELECTED_DUMP")

echo ""
echo -e "${RED}⚠️  WARNING: This operation will:${NC}"
echo "  1. Drop ALL tables in the current database"
echo "  2. Restore the dump: $SELECTED_NAME"
echo ""
echo -e "${YELLOW}All current data will be LOST!${NC}"
echo ""
echo -e "${YELLOW}Continue? [y/N]:${NC} "
read -r CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo -e "\n${YELLOW}❌ Operation cancelled${NC}"
  exit 0
fi

# Read DATABASE_URL from .env
if [ ! -f .env ]; then
  echo -e "\n${RED}❌ Error: .env not found${NC}"
  exit 1
fi

DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ Error: DATABASE_URL not found in .env${NC}"
  exit 1
fi

# Parse DATABASE_URL
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

export PGPASSWORD="$DB_PASS"

# Step 1: Check connection
echo -e "${YELLOW}🔄 Step 1/3: Checking connection...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to connect to the database${NC}"
  unset PGPASSWORD
  exit 1
fi

echo -e "${GREEN}✅ Connection OK${NC}"
echo ""

# Step 2: Restore dump
echo -e "${YELLOW}🔄 Step 2/3: Restoring dump...${NC}"
echo "  File: $SELECTED_NAME"
echo ""

gunzip -c "$SELECTED_DUMP" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to restore dump${NC}"
  unset PGPASSWORD
  exit 1
fi

echo -e "${GREEN}✅ Dump restored${NC}"
echo ""

# Step 3: Run Prisma migrations
echo -e "${YELLOW}🔄 Step 3/3: Applying Prisma migrations...${NC}"
echo ""

unset PGPASSWORD

pnpm prisma migrate deploy > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Warning: Failed to apply migrations${NC}"
  echo "  Run manually: pnpm prisma migrate deploy"
else
  echo -e "${GREEN}✅ Migrations applied${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Restore completed successfully!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Verify data: psql -d $DB_NAME -c 'SELECT COUNT(*) FROM \"User\"'"
echo "  2. Generate Prisma Client: pnpm prisma generate"
echo "  3. Restart the dev server"
echo ""
