#!/bin/bash

# Complete Setup and Run Script
# Author: george1806

set -e

echo "🚀 Apartment Management SaaS - Complete Setup"
echo "=============================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

echo "✅ All prerequisites met"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
cd backend && pnpm install && cd ..
echo "✅ Dependencies installed"
echo ""

# Start Docker services
echo "🐳 Starting Docker services..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if MySQL is ready
echo "🔍 Checking MySQL..."
until docker exec apartment-mysql mysqladmin ping -h localhost -u svc_db_usr -pzpNGtZhBEWrPkKUyjMdSaw@21 &> /dev/null; do
  echo "   MySQL is not ready yet..."
  sleep 2
done
echo "✅ MySQL is ready"

# Check if Redis is ready
echo "🔍 Checking Redis..."
until docker exec apartment-redis redis-cli -a v7AQ6bJjGZ3j2PsA ping &> /dev/null; do
  echo "   Redis is not ready yet..."
  sleep 2
done
echo "✅ Redis is ready"

echo ""
echo "✅ All services are ready!"
echo ""

# Copy env file if it doesn't exist
if [ ! -f backend/.env ]; then
  echo "📝 Creating backend/.env file..."
  cp backend/.env.example backend/.env 2>/dev/null || echo "Note: .env.example not found, using existing .env"
fi

# Run migrations
echo "🗄️  Running database migrations..."
cd backend

# Check if migrations directory exists and has migrations
if [ -d "src/database/migrations" ] && [ "$(ls -A src/database/migrations 2>/dev/null)" ]; then
  echo "   Found existing migrations, running them..."
  npx typeorm migration:run -d src/database/data-source.ts
else
  echo "   No migrations found, generating initial schema..."
  npx typeorm migration:generate src/database/migrations/InitialSchema -d src/database/data-source.ts
  echo "   Running migration..."
  npx typeorm migration:run -d src/database/data-source.ts
fi

cd ..

echo "✅ Database migrations complete"
echo ""

echo "=============================================="
echo "✅ Setup Complete!"
echo "=============================================="
echo ""
echo "🎯 Next steps:"
echo ""
echo "1. Start the backend (in a new terminal):"
echo "   cd backend && pnpm dev"
echo ""
echo "2. Start the frontend (in another terminal):"
echo "   cd frontend && pnpm dev --port 3001"
echo ""
echo "3. Access the application:"
echo "   • Frontend: http://localhost:3001"
echo "   • API: http://localhost:3000/api/v1"
echo "   • API Docs: http://localhost:3000/api/docs"
echo "   • Mailpit: http://localhost:8025"
echo "   • phpMyAdmin: http://localhost:8080"
echo "   • Redis Commander: http://localhost:8081"
echo ""
echo "4. Login credentials:"
echo "   • Owner: owner@sunrise-pm.com / Password123!"
echo "   • Super Admin: superadmin@ternantapp.com / SuperAdmin@2025"
echo ""
echo "5. Run tests:"
echo "   chmod +x backend/test-auth.sh"
echo "   ./backend/test-auth.sh"
echo ""
echo "📚 See docs/ directory for detailed documentation"
echo ""
