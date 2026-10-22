#!/usr/bin/env bash
# One-time setup for GitHub Codespaces (or any Ubuntu machine): installs MySQL, creates the
# database and a dedicated user with a RANDOM password, and writes backend/.env. The password is never printed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend/backend/backend"
ENV_FILE="$BACKEND/.env"
DB_NAME="careerpilot_db"
DB_USER="careerpilot"

echo "==> Checking Java and Node"
java -version 2>&1 | head -1 || { echo "Java 17+ is required"; exit 1; }
node -v >/dev/null 2>&1 || { echo "Node.js is required"; exit 1; }

if ! command -v mysqld >/dev/null 2>&1; then
  echo "==> Installing MySQL server (takes a minute)"
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server
fi

echo "==> Starting MySQL"
sudo service mysql start || true
for i in $(seq 1 20); do
  if sudo mysqladmin ping --silent >/dev/null 2>&1; then break; fi
  sleep 1
done

if [ -f "$ENV_FILE" ] && grep -q '^DB_PASSWORD=' "$ENV_FILE"; then
  echo "==> Keeping the existing $ENV_FILE"
  DB_PASS="$(grep '^DB_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
else
  DB_PASS="$(openssl rand -hex 16)"
  JWT="$(openssl rand -base64 48 | tr -d '\n')"
  echo "==> Writing $ENV_FILE (git-ignored)"
  {
    echo "DB_URL=jdbc:mysql://localhost:3306/${DB_NAME}?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
    echo "DB_USERNAME=${DB_USER}"
    echo "DB_PASSWORD=${DB_PASS}"
    echo "JWT_SECRET=${JWT}"
    echo "MAIL_ENABLED=false"
  } > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

echo "==> Creating database and user"
sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

chmod +x "$BACKEND/mvnw" || true

echo "==> Installing frontend packages"
( cd "$ROOT/frontend/vite-project" && npm install )

echo
echo "Setup finished. Next:"
echo "  1) bash scripts/run-backend.sh      (leave it running; open a second terminal)"
echo "  2) bash scripts/run-frontend.sh"
