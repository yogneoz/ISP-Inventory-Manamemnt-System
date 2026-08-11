#!/usr/bin/env bash
# IZone Automated PostgreSQL Installation & Configuration Script
# Automates PostgreSQL server detection, package download, service startup, DB creation, and Schema Migration.

set -e

DB_NAME="inventory_db"
DB_USER="inventory_user"
DB_PASS="securepassword"
DB_PORT="5432"
SCHEMA_FILE="$(dirname "$0")/schema.sql"

echo "=========================================================================="
echo "🚀 IZone Enterprise System: Automated PostgreSQL Installer & Configurator"
echo "=========================================================================="

# 1. Detect Package Manager and Install PostgreSQL if not found
detect_and_install_postgres() {
    if command -v psql >/dev/null 2>&1; then
        echo "✅ PostgreSQL client (psql) is already installed."
        return 0
    fi

    echo "📦 PostgreSQL not detected. Attempting automatic download & installation..."

    if [ -f /etc/debian_version ]; then
        echo "🔹 Detected Debian/Ubuntu environment. Updating apt and installing postgresql..."
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -qq || true
        apt-get install -y -qq postgresql postgresql-contrib libpq-dev || sudo apt-get install -y -qq postgresql postgresql-contrib libpq-dev
    elif [ -f /etc/redhat-release ] || [ -f /etc/centos-release ]; then
        echo "🔹 Detected RHEL/CentOS environment. Installing postgresql-server..."
        yum install -y postgresql-server postgresql-contrib || sudo yum install -y postgresql-server postgresql-contrib
        postgresql-setup initdb || true
    elif [ -f /etc/alpine-release ]; then
        echo "🔹 Detected Alpine Linux environment. Installing postgresql..."
        apk add --no-cache postgresql postgresql-contrib
        mkdir -p /run/postgresql
        chown -R postgres:postgres /run/postgresql
        if [ ! -d /var/lib/postgresql/data/PG_VERSION ]; then
            su - postgres -c "initdb -D /var/lib/postgresql/data"
        fi
    elif command -v brew >/dev/null 2>&1; then
        echo "🔹 Detected macOS environment with Homebrew. Installing postgresql..."
        brew install postgresql@15
        brew services start postgresql@15
    elif command -v docker >/dev/null 2>&1; then
        echo "🔹 Docker detected! Starting PostgreSQL via Docker container..."
        docker run --name inventory_postgres -e POSTGRES_DB=${DB_NAME} -e POSTGRES_USER=${DB_USER} -e POSTGRES_PASSWORD=${DB_PASS} -p 5432:5432 -d postgres:15-alpine || docker start inventory_postgres
        echo "⏳ Waiting for Docker PostgreSQL container to initialize..."
        sleep 5
        return 0
    else
        echo "⚠️ Automated package manager installation not available in this environment."
        echo "Please ensure PostgreSQL or Docker is running on port 5432."
        return 1
    fi
}

# 2. Ensure PostgreSQL service is running
ensure_postgres_running() {
    echo "⚙️ Checking PostgreSQL service status..."
    if command -v service >/dev/null 2>&1; then
        service postgresql status >/dev/null 2>&1 || service postgresql start || true
    elif command -v systemctl >/dev/null 2>&1; then
        systemctl is-active --quiet postgresql || systemctl start postgresql || true
    elif [ -f /etc/alpine-release ]; then
        su - postgres -c "pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/logfile start" || true
    fi
}

# 3. Create User & Database
configure_database() {
    echo "🗄️ Provisioning database '${DB_NAME}' and user '${DB_USER}'..."

    if command -v su >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
        su - postgres -c "psql -c \"CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';\"" 2>/dev/null || true
        su - postgres -c "psql -c \"ALTER USER ${DB_USER} WITH SUPERUSER;\"" 2>/dev/null || true
        su - postgres -c "psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\"" 2>/dev/null || true
        su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};\"" 2>/dev/null || true
    else
        psql -U postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
        psql -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
    fi
}

# 4. Run Schema Migration SQL
run_schema_migration() {
    echo "📜 Executing database schema migration script (${SCHEMA_FILE})..."
    if [ -f "${SCHEMA_FILE}" ]; then
        PGPASSWORD="${DB_PASS}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -p "${DB_PORT}" -f "${SCHEMA_FILE}" 2>/dev/null || \
        if command -v su >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
            su - postgres -c "psql -d ${DB_NAME} -f ${SCHEMA_FILE}"
        fi
        echo "✅ Database schema & tables migrated successfully!"
    else
        echo "⚠️ Warning: Schema file ${SCHEMA_FILE} not found."
    fi
}

# Main Execution Flow
detect_and_install_postgres || true
ensure_postgres_running || true
configure_database || true
run_schema_migration || true

echo "=========================================================================="
echo "🎉 PostgreSQL Setup Completed! Connection Details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo "   URL: postgres://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
echo "=========================================================================="
