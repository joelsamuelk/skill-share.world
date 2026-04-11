#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_DUMP_PATH="${HOME}/Downloads/database_export.sql"

usage() {
  cat <<'EOF'
Usage: ./scripts/restore-replit-dump.sh [--dump /path/to/database_export.sql] [--reset --force]

Options:
  --dump PATH   Path to the Replit SQL dump. Defaults to ~/Downloads/database_export.sql
  --reset       Drop the app tables before restoring the dump
  --force       Required together with --reset
  --help        Show this help text

Notes:
  - DATABASE_URL must be set, or present in .env
  - Run this before first deploy against a fresh database
  - The SQL dump restores users, skill_profiles, access_passwords, and sessions
EOF
}

DUMP_PATH="${DEFAULT_DUMP_PATH}"
RESET_DB=0
FORCE_RESET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --dump" >&2
        exit 1
      fi
      DUMP_PATH="$2"
      shift 2
      ;;
    --reset)
      RESET_DB=1
      shift
      ;;
    --force)
      FORCE_RESET=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Add it to the environment or ${ROOT_DIR}/.env." >&2
  exit 1
fi

if [[ ! -f "${DUMP_PATH}" ]]; then
  echo "Dump file not found at ${DUMP_PATH}" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required but was not found in PATH." >&2
  exit 1
fi

existing_tables="$(psql "${DATABASE_URL}" -Atqc "select count(*) from pg_tables where schemaname = 'public' and tablename in ('users', 'skill_profiles', 'access_passwords', 'sessions');")"

if [[ "${RESET_DB}" -eq 0 && "${existing_tables}" != "0" ]]; then
  cat >&2 <<EOF
Target database already contains app tables.

If this is the bootstrap restore you want, re-run with:
  ./scripts/restore-replit-dump.sh --dump "${DUMP_PATH}" --reset --force
EOF
  exit 1
fi

if [[ "${RESET_DB}" -eq 1 && "${FORCE_RESET}" -ne 1 ]]; then
  echo "--reset is destructive and must be paired with --force." >&2
  exit 1
fi

if [[ "${RESET_DB}" -eq 1 ]]; then
  echo "Dropping existing app tables from target database..."
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "DROP TABLE IF EXISTS public.skill_profiles, public.users, public.access_passwords, public.sessions CASCADE;"
fi

echo "Ensuring pgcrypto is available..."
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

echo "Restoring ${DUMP_PATH} into target database..."
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -1 -f "${DUMP_PATH}"

echo "Restore complete."
