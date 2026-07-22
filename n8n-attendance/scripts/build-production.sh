#!/bin/bash
set -e

echo "🚀 Starting production build..."

# Build backend
echo "📦 Building backend..."
cd backend
npm ci
npm run validate
npm run build:clean
echo "✅ Backend build complete"

# Build frontend
echo "📦 Building frontend..."
cd ../frontend
npm ci
npm run validate
npm run build:clean
echo "✅ Frontend build complete"

echo "🎉 Production build completed successfully!"