#!/bin/bash
# ==========================================
# MySQL Backup Script
# ==========================================
# Features:
# - Automatic daily backups
# - Compression
# - Rotation (keep last N days)
# - Optional S3 upload
# - Error notifications
# ==========================================

set -e

# Configuration
BACKUP_DIR="/backups"
MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD=$(cat /run/secrets/mysql_root_password)
MYSQL_DATABASE="${MYSQL_DATABASE:-apartment_management}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${MYSQL_DATABASE}_${DATE}.sql.gz"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

log_info "Starting MySQL backup for database: ${MYSQL_DATABASE}"
log_info "Backup file: ${BACKUP_FILE}"

# Perform backup
if mysqldump -h "${MYSQL_HOST}" \
    -u "${MYSQL_USER}" \
    -p"${MYSQL_PASSWORD}" \
    --single-transaction \
    --quick \
    --lock-tables=false \
    --routines \
    --triggers \
    --events \
    "${MYSQL_DATABASE}" | gzip > "${BACKUP_FILE}"; then

    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log_info "Backup completed successfully! Size: ${BACKUP_SIZE}"
else
    log_error "Backup failed!"
    exit 1
fi

# Upload to S3 if configured
if [ -n "${S3_BUCKET}" ]; then
    log_info "Uploading backup to S3: ${S3_BUCKET}"

    if command -v aws &> /dev/null; then
        if aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/mysql-backups/" --storage-class STANDARD_IA; then
            log_info "Successfully uploaded to S3"
        else
            log_error "Failed to upload to S3"
        fi
    else
        log_warn "AWS CLI not installed. Skipping S3 upload."
    fi
fi

# Cleanup old backups
log_info "Cleaning up backups older than ${RETAIN_DAYS} days..."
find "${BACKUP_DIR}" -name "*.sql.gz" -type f -mtime +${RETAIN_DAYS} -delete
REMAINING_BACKUPS=$(find "${BACKUP_DIR}" -name "*.sql.gz" -type f | wc -l)
log_info "Cleanup complete. Remaining backups: ${REMAINING_BACKUPS}"

# Backup verification
log_info "Verifying backup integrity..."
if gzip -t "${BACKUP_FILE}"; then
    log_info "Backup integrity verified successfully"
else
    log_error "Backup verification failed!"
    exit 1
fi

log_info "Backup process completed successfully!"
