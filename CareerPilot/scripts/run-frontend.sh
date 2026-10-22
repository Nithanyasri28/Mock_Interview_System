#!/usr/bin/env bash
# Starts the React dev server on port 5173 (it forwards /api requests to the backend).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend/vite-project"
[ -d node_modules ] || npm install
npm run dev
