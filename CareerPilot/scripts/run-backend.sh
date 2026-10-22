#!/usr/bin/env bash
# Starts MySQL (if needed) and the Spring Boot backend on port 8080.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
sudo service mysql start >/dev/null 2>&1 || true
cd "$ROOT/backend/backend/backend"
chmod +x mvnw
./mvnw spring-boot:run
