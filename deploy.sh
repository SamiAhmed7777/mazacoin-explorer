#!/bin/bash
set -e

echo "🚀 Deploying Mazacoin Explorer to maza.samiahmed7777.me"

# Configuration
DOMAIN="maza.samiahmed7777.me"
DASHCADDY_API="http://100.71.97.12:3001"
PROJECT_DIR="/root/Projects/mazacoin-explorer"

# Build images
echo "📦 Building Docker images..."
cd "$PROJECT_DIR"
docker compose build

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down || true

# Start containers
echo "▶️  Starting containers..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if ! docker ps | grep -q mazacoin-frontend; then
    echo "❌ Frontend container failed to start"
    docker compose logs frontend
    exit 1
fi

if ! docker ps | grep -q mazacoin-backend; then
    echo "❌ Backend container failed to start"
    docker compose logs backend
    exit 1
fi

# Configure Caddy reverse proxy via DashCaddy API
echo "🔧 Configuring Caddy reverse proxy..."
curl -X POST "$DASHCADDY_API/api/caddy/routes" \
  -H "Content-Type: application/json" \
  -d "{
    \"domain\": \"$DOMAIN\",
    \"upstream\": \"localhost:8080\",
    \"type\": \"proxy\"
  }" || echo "⚠️  Warning: Failed to configure Caddy (may already be configured)"

echo "✅ Deployment complete!"
echo ""
echo "🌐 Explorer available at: https://$DOMAIN"
echo "📊 API endpoint: https://$DOMAIN/api"
echo ""
echo "📝 To view logs:"
echo "   docker compose logs -f backend"
echo "   docker compose logs -f frontend"
echo ""
echo "🔄 To restart:"
echo "   docker compose restart"
echo ""
echo "🛑 To stop:"
echo "   docker compose down"
