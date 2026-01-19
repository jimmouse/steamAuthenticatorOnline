#!/bin/bash

# Steam Authenticator 备份脚本
# 使用方法: ./backup.sh

# 配置
BACKUP_DIR="/var/backups/steam-auth"
PROJECT_DIR="/var/www/steam-auth"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/backup.log"
}

log "开始备份..."

# 备份数据库
if [ -f "$PROJECT_DIR/backend/data/database.sqlite" ]; then
    cp "$PROJECT_DIR/backend/data/database.sqlite" "$BACKUP_DIR/database_$DATE.sqlite"
    log "数据库备份完成: database_$DATE.sqlite"
else
    log "警告: 数据库文件不存在"
fi

# 备份上传的文件
if [ -d "$PROJECT_DIR/backend/data/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$PROJECT_DIR/backend/data" uploads
    log "上传文件备份完成: uploads_$DATE.tar.gz"
else
    log "警告: 上传目录不存在"
fi

# 备份环境配置文件（不包含敏感信息）
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    # 只备份非敏感配置
    grep -v "JWT_SECRET\|PASSWORD" "$PROJECT_DIR/backend/.env" > "$BACKUP_DIR/env_$DATE.txt" 2>/dev/null || true
    log "环境配置备份完成: env_$DATE.txt"
fi

# 删除旧备份
log "清理 $RETENTION_DAYS 天前的备份..."
find "$BACKUP_DIR" -name "*.sqlite" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.txt" -mtime +$RETENTION_DAYS -delete

# 显示备份大小
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "备份完成! 总大小: $BACKUP_SIZE"

# 列出所有备份文件
log "当前备份文件:"
ls -lh "$BACKUP_DIR" | grep -E "\.sqlite$|\.tar\.gz$|\.txt$" | tail -5

log "备份任务完成"

