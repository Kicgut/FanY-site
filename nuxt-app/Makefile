.PHONY: build up down logs restart clean backup restore shell migrate

# Build Docker image
build:
	docker compose build

# Start services in background
up:
	docker compose up -d

# Stop services
down:
	docker compose down

# View logs (follow mode)
logs:
	docker compose logs -f

# Restart services
restart:
	docker compose restart

# Remove everything (containers + volumes + images)
clean:
	docker compose down -v --rmi local

# Run backup script inside container
backup:
	docker compose exec app sh /app/scripts/backup.sh

# Restore from backup (usage: make restore FILE=backups/backup-xxx.db.gz)
restore:
	docker compose exec app sh /app/scripts/restore.sh $(FILE)

# List available backups
backups:
	@ls -lh backups/backup-*.db.gz 2>/dev/null || echo "No backups found"

# Run Prisma migrations
migrate:
	docker compose exec app npx prisma migrate deploy

# Enter container shell
shell:
	docker compose exec app sh

# Install host-level cron for automated backups
install-cron:
	@echo "Adding daily 3AM backup cron job..."
	@echo "0 3 * * * cd $(PWD) && docker compose exec app sh /app/scripts/backup.sh >> /var/log/backup.log 2>&1" | crontab -
	@crontab -l
	@echo "Cron installed! Backups run daily at 3:00 AM"
