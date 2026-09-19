#!/bin/bash

# InvestKit Database Setup Script
# Crée la BD et l'utilisateur PostgreSQL

set -e

echo "🗄️  InvestKit Database Setup"
echo "=============================="
echo ""

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running!"
    echo "Start it with: sudo systemctl start postgresql (Linux) or brew services start postgresql (macOS)"
    exit 1
fi
echo "✅ PostgreSQL is running"
echo ""

# Get PostgreSQL user password (default postgres)
POSTGRES_USER="postgres"
POSTGRES_PASSWORD=""

echo "📝 Creating database and user..."
echo ""

# Create user and database
PSQL="psql -U $POSTGRES_USER"

# Create user if not exists
$PSQL -tc "SELECT 1 FROM pg_user WHERE usename = 'investkit'" | grep -q 1 || \
  $PSQL -c "CREATE USER investkit WITH PASSWORD 'password';"

# Create database if not exists
$PSQL -tc "SELECT 1 FROM pg_database WHERE datname = 'investkit'" | grep -q 1 || \
  $PSQL -c "CREATE DATABASE investkit OWNER investkit;"

# Grant privileges
$PSQL -c "GRANT ALL PRIVILEGES ON DATABASE investkit TO investkit;"

echo "✅ Database 'investkit' created"
echo "✅ User 'investkit' created"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "You can now start the backend:"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "The schema will be automatically initialized on first run."
