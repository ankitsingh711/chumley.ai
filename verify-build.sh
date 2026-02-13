#!/bin/bash
echo "🚧 building backend..."
cd backend && npm install && npm run build
echo "✅ backend build complete"

echo "🚧 building frontend..."
cd .. && npm install && npm run build
echo "✅ frontend build complete"

echo "🚀 Ready for deployment!"
