#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Script de Backup Automático do PostgreSQL para S3 (DR - Disaster Recovery)
# ──────────────────────────────────────────────────────────────────────────────
# Requisitos no servidor: pg_dump, gzip, aws-cli (ou s3cmd)
#
# Agendamento sugerido no Cron (diário às 03:00):
#   0 3 * * * /absolute/path/to/scripts/backup-postgres.sh >> /var/log/pg_backup.log 2>&1
# ──────────────────────────────────────────────────────────────────────────────

set -e

# Tenta carregar variáveis do .env na raiz do projeto
SCRIPTPATH="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPTPATH")"

if [ -f "${PROJECT_ROOT}/.env" ]; then
  # exporta variáveis ignorando linhas com comentários
  export $(grep -v '^#' "${PROJECT_ROOT}/.env" | xargs)
fi

DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD}
DB_NAME=${POSTGRES_DB:-aplicativo_prod}
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
S3_BUCKET=${BACKUP_S3_BUCKET}
S3_ENDPOINT=${BACKUP_S3_ENDPOINT} # Opcional: para usar Cloudflare R2 ou MinIO

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Erro: POSTGRES_PASSWORD não está definida nas variáveis de ambiente."
  exit 1
fi

if [ -z "$S3_BUCKET" ]; then
  echo "⚠️ Aviso: BACKUP_S3_BUCKET não está definida. Backup local apenas."
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/tmp/postgres_backups"
FILE_NAME="db_backup_${DB_NAME}_${TIMESTAMP}.sql.gz"
LOCAL_PATH="${BACKUP_DIR}/${FILE_NAME}"

echo "📅 [$(date)] Iniciando backup do banco de dados '${DB_NAME}'..."
mkdir -p "${BACKUP_DIR}"

# Realizar o dump com gzip
PGPASSWORD="${DB_PASSWORD}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -F c | gzip > "${LOCAL_PATH}"

echo "✅ Backup local gerado com sucesso em: ${LOCAL_PATH} ($(du -sh "${LOCAL_PATH}" | cut -f1))"

# Fazer upload para o S3 se o bucket estiver configurado
if [ -n "$S3_BUCKET" ]; then
  S3_URI="s3://${S3_BUCKET}/backups/${FILE_NAME}"
  echo "📤 Enviando para o S3..."
  
  if [ -n "$S3_ENDPOINT" ]; then
    aws s3 cp "${LOCAL_PATH}" "${S3_URI}" --endpoint-url "${S3_ENDPOINT}"
  else
    aws s3 cp "${LOCAL_PATH}" "${S3_URI}"
  fi
  
  echo "✅ Upload concluído para: ${S3_URI}"
  
  # Remover cópia local temporária para economizar disco
  rm -f "${LOCAL_PATH}"
  echo "🧹 Arquivo temporário local excluído."
else
  # Mantém backup local mas avisa que deve ser limpo manualmente
  echo "⚠️ Backup mantido localmente em ${LOCAL_PATH} devido à falta de S3_BUCKET."
fi

echo "🎉 Processo de backup concluído com sucesso às $(date)."
