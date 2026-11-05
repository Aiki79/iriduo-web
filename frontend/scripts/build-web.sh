#!/bin/sh
# Builds the web version of IriDuo into backend/web (served at https://<host>/api/web/).
# Run after every frontend change, before publishing.
set -e
cd "$(dirname "$0")/.."
EXPO_WEB_BASE=/api/web npx expo export --platform web --output-dir ../backend/web --clear
echo "Web build ready in backend/web"
