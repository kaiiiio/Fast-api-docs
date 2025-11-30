# Backups & Restore: Protecting Your Data

Database backups are essential for disaster recovery, data protection, and compliance. This guide covers backup and restore strategies.

## What are Database Backups?

**Database backups** are copies of database data and schema stored separately for recovery purposes. They protect against data loss from hardware failures, human errors, or disasters.

### Backup Types

```
- Full backup: Complete database copy
- Incremental backup: Only changes since last backup
- Differential backup: Changes since last full backup
- Continuous backup: Real-time replication
```

## PostgreSQL Backups

### pg_dump (Logical Backup)

```bash
# Full database backup
pg_dump -U username -d database_name > backup.sql

# Backup with compression
pg_dump -U username -d database_name | gzip > backup.sql.gz

# Backup specific schema
pg_dump -U username -d database_name -n schema_name > backup.sql

# Backup only schema (no data)
pg_dump -U username -d database_name --schema-only > schema.sql

# Backup only data (no schema)
pg_dump -U username -d database_name --data-only > data.sql
```

### pg_dumpall (All Databases)

```bash
# Backup all databases
pg_dumpall -U username > all_databases.sql

# Backup with roles
pg_dumpall -U username --roles-only > roles.sql
```

### Physical Backup (File System)

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Copy data directory
sudo cp -r /var/lib/postgresql/data /backup/postgresql_data

# Start PostgreSQL
sudo systemctl start postgresql
```

## MySQL Backups

### mysqldump (Logical Backup)

```bash
# Full database backup
mysqldump -u username -p database_name > backup.sql

# Backup with compression
mysqldump -u username -p database_name | gzip > backup.sql.gz

# Backup all databases
mysqldump -u username -p --all-databases > all_databases.sql

# Backup only schema
mysqldump -u username -p --no-data database_name > schema.sql

# Backup only data
mysqldump -u username -p --no-create-info database_name > data.sql
```

### Physical Backup

```bash
# Stop MySQL
sudo systemctl stop mysql

# Copy data directory
sudo cp -r /var/lib/mysql /backup/mysql_data

# Start MySQL
sudo systemctl start mysql
```

## Restore Operations

### PostgreSQL Restore

```bash
# Restore from backup
psql -U username -d database_name < backup.sql

# Restore with compression
gunzip < backup.sql.gz | psql -U username -d database_name

# Restore to new database
createdb -U username new_database
psql -U username -d new_database < backup.sql
```

### MySQL Restore

```bash
# Restore from backup
mysql -u username -p database_name < backup.sql

# Restore with compression
gunzip < backup.sql.gz | mysql -u username -p database_name

# Restore to new database
mysql -u username -p -e "CREATE DATABASE new_database"
mysql -u username -p new_database < backup.sql
```

## Automated Backups

### Cron Job (Linux)

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backup/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U username -d database_name | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

# Add to crontab (daily at 2 AM)
# 0 2 * * * /path/to/backup_script.sh
```

### Python Script

```python
# Python backup script
import subprocess
import datetime
import os

def backup_database():
    backup_dir = "/backup/postgresql"
    date = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"{backup_dir}/backup_{date}.sql.gz"
    
    # Create backup
    with open(backup_file, 'wb') as f:
        subprocess.run(
            ['pg_dump', '-U', 'username', '-d', 'database_name'],
            stdout=f
        )
    
    # Compress
    subprocess.run(['gzip', backup_file])
    
    # Clean old backups (keep 7 days)
    # ...

if __name__ == '__main__':
    backup_database()
```

## Backup Best Practices

### 1. Regular Backups

```bash
# Daily backups
# Weekly full backups
# Monthly archives
```

### 2. Test Restores

```bash
# Regularly test restore process
# Verify backup integrity
# Document restore procedures
```

### 3. Off-Site Storage

```bash
# Store backups off-site
# Use cloud storage (S3, GCS)
# Encrypt backups
```

### 4. Backup Retention

```bash
# Keep multiple backup versions
# Daily: 7 days
# Weekly: 4 weeks
# Monthly: 12 months
```

## Real-World Examples

### Example 1: Automated Daily Backup

```bash
#!/bin/bash
# Daily backup script

DB_NAME="mydb"
DB_USER="postgres"
BACKUP_DIR="/backup/postgresql"
DATE=$(date +%Y%m%d)
RETENTION_DAYS=7

# Create backup
pg_dump -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Remove old backups
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" s3://backup-bucket/
```

### Example 2: Point-in-Time Recovery

```sql
-- PostgreSQL: Enable WAL archiving
-- In postgresql.conf:
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'

-- Restore to specific point in time
-- 1. Restore base backup
-- 2. Restore WAL files up to target time
```

## Backup Strategies

### Strategy 1: Full Daily

```bash
# Full backup every day
# Simple but storage-intensive
# Fast restore
```

### Strategy 2: Incremental

```bash
# Full weekly + incremental daily
# Less storage
# Slower restore (need to apply incrementals)
```

### Strategy 3: Continuous

```bash
# Real-time replication
# Fastest recovery
# Most complex setup
```

## Summary

**Backups & Restore:**

1. **Types**: Full, incremental, differential, continuous
2. **Tools**: pg_dump (PostgreSQL), mysqldump (MySQL)
3. **Automation**: Cron jobs, scripts
4. **Best Practices**: Regular backups, test restores, off-site storage
5. **Retention**: Keep multiple versions, archive old backups

**Key Takeaway:**
Database backups are essential for data protection. Use pg_dump (PostgreSQL) or mysqldump (MySQL) for logical backups. Automate backups with cron jobs or scripts. Test restore procedures regularly. Store backups off-site and encrypt sensitive data. Keep multiple backup versions with appropriate retention policies.

**Backup Strategy:**
- Regular automated backups
- Test restore procedures
- Off-site storage
- Encrypt backups
- Document procedures

**Next Steps:**
- Learn [High Availability](high_availability.md) for redundancy
- Study [Read Replicas](read_replicas.md) for scaling
- Master [Monitoring](monitoring.md) for backup verification

