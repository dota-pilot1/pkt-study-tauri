#!/usr/bin/env bash
set -euo pipefail

direction="${1:-}"
if [[ "$direction" != "pull" && "$direction" != "push" ]]; then
  echo "direction must be pull or push" >&2
  exit 2
fi

config_file="${MES_DB_SYNC_CONFIG:-$HOME/.config/pkt-study/db-sync.env}"
if [[ -f "$config_file" ]]; then
  # The file is user-owned and must contain only shell-style KEY=value lines.
  # shellcheck disable=SC1090
  source "$config_file"
fi

: "${LOCAL_DB_HOST:=127.0.0.1}"
: "${LOCAL_DB_PORT:=5436}"
: "${LOCAL_DB_NAME:=sk_pkt_mes}"
: "${LOCAL_DB_USER:=postgres}"
: "${LOCAL_DB_PASSWORD:=postgres}"
: "${LOCAL_DB_CONTAINER:=sk-pkt-mes-postgres}"
: "${DOCKER_BIN:=docker}"
: "${REMOTE_HOST:=}"
: "${REMOTE_USER:=ubuntu}"
: "${REMOTE_SSH_KEY:=}"
: "${REMOTE_DB_CONTAINER:=sk-pkt-mes-postgres}"
: "${REMOTE_DB_NAME:=sk_pkt_mes}"
: "${REMOTE_DB_USER:=postgres}"
: "${REMOTE_APP_DIR:=/home/ubuntu/sk-pkt-mes}"

if [[ ! -r "$REMOTE_SSH_KEY" ]]; then
  echo "SSH key not found: $REMOTE_SSH_KEY" >&2
  exit 1
fi

ssh_args=(-i "$REMOTE_SSH_KEY" -o StrictHostKeyChecking=accept-new)
remote=(ssh "${ssh_args[@]}" "$REMOTE_USER@$REMOTE_HOST")
stamp="$(date +%Y%m%d-%H%M%S)"
work_dir="$(mktemp -d -t mes-db-sync.XXXXXX)"
trap 'rm -rf "$work_dir"' EXIT

local_dump="$work_dir/local.dump"
remote_dump="$work_dir/remote.dump"
local_backup_dir="${MES_DB_SYNC_BACKUP_DIR:-$HOME/.local/share/pkt-study/db-backups}"
use_local_container=false
if "$DOCKER_BIN" inspect "$LOCAL_DB_CONTAINER" >/dev/null 2>&1; then
  use_local_container=true
fi

dump_local() {
  if [[ "$use_local_container" == true ]]; then
    "$DOCKER_BIN" exec "$LOCAL_DB_CONTAINER" pg_dump \
      --format=custom --no-owner --no-acl \
      --username="$LOCAL_DB_USER" --dbname="$LOCAL_DB_NAME" \
      > "$local_dump"
  else
    PGPASSWORD="$LOCAL_DB_PASSWORD" pg_dump \
      --format=custom --no-owner --no-acl \
      --host="$LOCAL_DB_HOST" --port="$LOCAL_DB_PORT" \
      --username="$LOCAL_DB_USER" --dbname="$LOCAL_DB_NAME" \
      > "$local_dump"
  fi
}

restore_local() {
  if [[ "$use_local_container" == true ]]; then
    "$DOCKER_BIN" exec "$LOCAL_DB_CONTAINER" psql -v ON_ERROR_STOP=1 \
      --username="$LOCAL_DB_USER" --dbname="$LOCAL_DB_NAME" \
      -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
    "$DOCKER_BIN" exec -i "$LOCAL_DB_CONTAINER" pg_restore \
      --no-owner --no-acl --exit-on-error \
      --username="$LOCAL_DB_USER" --dbname="$LOCAL_DB_NAME" < "$remote_dump"
  else
    PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
      --host="$LOCAL_DB_HOST" --port="$LOCAL_DB_PORT" \
      --username="$LOCAL_DB_USER" --dbname="$LOCAL_DB_NAME" \
      -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
    PGPASSWORD="$LOCAL_DB_PASSWORD" pg_restore \
      --no-owner --no-acl --exit-on-error \
      --host="$LOCAL_DB_HOST" --port="$LOCAL_DB_PORT" \
      --username="$LOCAL_DB_USER" --dbname="$LOCAL_DB_NAME" "$remote_dump"
  fi
}

if [[ "$direction" == "pull" ]]; then
  echo "Backing up local database..."
  dump_local
  mkdir -p "$local_backup_dir"
  cp "$local_dump" "$local_backup_dir/local-$stamp.dump"
  echo "Local backup saved: $local_backup_dir/local-$stamp.dump"
  echo "Dumping production database..."
  "${remote[@]}" "docker exec $REMOTE_DB_CONTAINER pg_dump --format=custom --no-owner --no-acl -U $REMOTE_DB_USER -d $REMOTE_DB_NAME" > "$remote_dump"
  echo "Restoring production data into local database..."
  restore_local
  echo "DB sync completed: production -> local"
else
  echo "Dumping local database..."
  dump_local
  echo "Backing up production database..."
  "${remote[@]}" "set -e; mkdir -p '$REMOTE_APP_DIR/db-backups'; docker exec $REMOTE_DB_CONTAINER pg_dump --format=custom --no-owner --no-acl -U $REMOTE_DB_USER -d $REMOTE_DB_NAME > '$REMOTE_APP_DIR/db-backups/sk-pkt-mes-$stamp.dump'"
  echo "Resetting production schema..."
  "${remote[@]}" "docker exec $REMOTE_DB_CONTAINER psql -v ON_ERROR_STOP=1 -U $REMOTE_DB_USER -d $REMOTE_DB_NAME -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'"
  echo "Restoring local data into production database..."
  cat "$local_dump" | "${remote[@]}" "docker exec -i $REMOTE_DB_CONTAINER pg_restore --no-owner --no-acl --exit-on-error -U $REMOTE_DB_USER -d $REMOTE_DB_NAME"
  echo "DB sync completed: local -> production"
fi
