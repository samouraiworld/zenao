#!/usr/bin/env bash
# ipfs-backup.sh — Incremental backup of the files pinned on the Zenao kubo
# node. Each pinned CID is exported once as a CAR file (the standard IPFS
# archive format), without stopping kubo, then copied to an S3-compatible
# bucket with rclone. Once the copy succeeds, the local CAR files are deleted:
# <backup-dir>/exported.txt lists the CIDs already backed up, so local disk
# use stays small.
#
# Usage (from the zenao checkout on the server):
#   scripts/ipfs-backup.sh <compose-file> <backup-dir> [<rclone-destination> <rclone-env-file>]
#
# Without a destination, the CAR files are kept in <backup-dir>/cars.
#
# Example (prod, hourly cron, Scaleway Object Storage):
#   scripts/ipfs-backup.sh prod.backend.docker-compose.yml /root/ipfs-backup \
#     scw:zenao-ipfs-backup/prod /root/ipfs-backup.env
#
# The rclone env file defines the "scw" remote, for example:
#   RCLONE_CONFIG_SCW_TYPE=s3
#   RCLONE_CONFIG_SCW_PROVIDER=Scaleway
#   RCLONE_CONFIG_SCW_REGION=fr-par
#   RCLONE_CONFIG_SCW_ENDPOINT=s3.fr-par.scw.cloud
#   RCLONE_CONFIG_SCW_ACCESS_KEY_ID=...
#   RCLONE_CONFIG_SCW_SECRET_ACCESS_KEY=...
#
# Restore: see README "File Uploads (IPFS)".
set -euo pipefail

RCLONE_IMAGE="rclone/rclone:1.75.2@sha256:2687085f718d3c628f7fdfb77c52a1d344332aed543110bb88088f2c70d43eb5"

if [[ $# -ne 2 && $# -ne 4 ]]; then
  echo "usage: $0 <compose-file> <backup-dir> [<rclone-destination> <rclone-env-file>]" >&2
  exit 2
fi

compose_file="$1"
backup_dir="$2"
rclone_destination="${3:-}"
rclone_env_file="${4:-}"

log() {
  echo "$(date -u +%FT%TZ) $*"
}

ipfs() {
  docker compose -f "$compose_file" exec -T ipfs ipfs "$@"
}

cars_dir="$backup_dir/cars"
manifest="$backup_dir/exported.txt"
mkdir -p "$cars_dir"
touch "$manifest"

# One run at a time: a slow run must not race with the next cron run.
exec 9>"$backup_dir/.lock"
if ! flock -n 9; then
  log "another backup run is in progress; skipping"
  exit 0
fi

# List the pins first: a failure inside a process substitution would go
# unnoticed and the script would report an empty, successful backup.
if ! pins="$(ipfs pin ls --type=recursive --quiet </dev/null)"; then
  log "ERROR: cannot list pins on the IPFS node" >&2
  exit 1
fi
if [[ -z "$pins" ]]; then
  log "ERROR: the IPFS node has no pins; refusing to continue" >&2
  exit 1
fi

declare -A backed_up=()
while read -r cid; do
  [[ -n "$cid" ]] && backed_up["$cid"]=1
done <"$manifest"

exported=0
total=0
while read -r cid; do
  [[ -n "$cid" ]] || continue
  # The CID becomes a file name: accept CID characters only.
  if [[ ! "$cid" =~ ^[A-Za-z0-9]+$ ]]; then
    log "ERROR: unexpected pin name from the IPFS node: $cid" >&2
    exit 1
  fi
  total=$((total + 1))
  car="$cars_dir/$cid.car"
  if [[ -n "${backed_up[$cid]:-}" || -s "$car" ]]; then
    continue
  fi
  # </dev/null: docker compose exec would otherwise read the CID list.
  ipfs dag export "$cid" </dev/null >"$car.tmp"
  mv "$car.tmp" "$car"
  exported=$((exported + 1))
done <<<"$pins"
log "pinned CIDs: $total, newly exported: $exported"

shopt -s nullglob
pending=("$cars_dir"/*.car)
if [[ ${#pending[@]} -eq 0 ]]; then
  log "nothing to copy"
  exit 0
fi

if [[ -z "$rclone_destination" ]]; then
  for car in "${pending[@]}"; do
    cid="$(basename "$car" .car)"
    [[ -n "${backed_up[$cid]:-}" ]] || echo "$cid" >>"$manifest"
  done
  log "kept ${#pending[@]} CAR file(s) in $cars_dir"
  exit 0
fi

# Copy, then delete the local CAR files only after rclone succeeded
# (set -e stops the script on a failed copy; the next run retries).
docker run --rm \
  --env-file "$rclone_env_file" \
  -v "$(realpath "$cars_dir"):/cars:ro" \
  "$RCLONE_IMAGE" copy /cars "$rclone_destination"
for car in "${pending[@]}"; do
  echo "$(basename "$car" .car)" >>"$manifest"
  rm -f "$car"
done
log "copied ${#pending[@]} CAR file(s) to $rclone_destination"
