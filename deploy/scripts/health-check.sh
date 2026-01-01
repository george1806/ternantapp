#!/bin/bash
# Quick health check script for all services

echo "=== Apartment Management System Health Check ==="
echo ""

# Check MySQL
echo -n "MySQL: "
docker ps --filter "name=apartment-mysql" --filter "health=healthy" | grep -q "apartment-mysql" && echo "✅ Healthy" || echo "❌ Unhealthy"

# Check Redis
echo -n "Redis: "
docker ps --filter "name=apartment-redis" --filter "health=healthy" | grep -q "apartment-redis" && echo "✅ Healthy" || echo "❌ Unhealthy"

# Check Backend
echo -n "Backend: "
docker ps --filter "name=apartment-backend" --filter "health=healthy" | grep -q "apartment-backend" && echo "✅ Healthy" || echo "❌ Unhealthy"

# Check Frontend
echo -n "Frontend: "
docker ps --filter "name=apartment-frontend" | grep -q "apartment-frontend" && echo "✅ Running" || echo "❌ Not Running"

echo ""
echo "=== Detailed Status ==="
docker ps --filter "name=apartment-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
