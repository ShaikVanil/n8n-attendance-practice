#!/bin/bash

# Production Database Migration Script
set -e

ENV=${1:-production}
ACTION=${2:-migrate}

echo "🚀 Database Migration Tool"
echo "Environment: $ENV"
echo "Action: $ACTION"

# Load environment variables safely
if [ -f ".env.$ENV" ]; then
    set -a
    source <(grep -E '^[A-Z_]+=.*' .env.$ENV)
    set +a
fi

case $ACTION in
    "migrate")
        echo "📦 Running database migrations..."
        npm run db:migrate
        ;;
    "rollback")
        echo "⏪ Rolling back last migration..."
        npm run db:rollback
        ;;
    "backup")
        echo "💾 Creating database backup..."
        npm run db:backup
        ;;
    "restore")
        BACKUP_FILE=$3
        if [ -z "$BACKUP_FILE" ]; then
            echo "❌ Please provide backup file path"
            exit 1
        fi
        echo "🔄 Restoring database from $BACKUP_FILE..."
        npm run db:restore "$BACKUP_FILE"
        ;;
    "health")
        echo "🏥 Checking database health..."
        npm run db:health
        ;;
    *)
        echo "❌ Unknown action: $ACTION"
        echo "Available actions: migrate, rollback, backup, restore, health"
        exit 1
        ;;
esac

echo "✅ Database operation completed successfully"