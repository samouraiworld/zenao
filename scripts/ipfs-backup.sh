#!/usr/bin/env bash
# ipfs-backup.sh — Incremental backup of the files pinned on the Zenao kubo
# node. Each pinned CID is exported once as a CAR file (the standard IPFS
# archive format) into <backup-dir>/cars, without stopping kubo. Optionally,
# the CAR files are then copied to an S3-compatible bucket with rclone.
#
# Usage (from the zenao checkout on the server):
#   scripts/ipfs-backup.sh <compose-file> <backup-dir> [<rclone-destination> <rclone-env-file>]
#
# Example (prod, nightly cron, Scaleway Object Storage):
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
# Restore: see README "File uploads (IPFS)".
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

ipfs() {
  docker compose -f "$compose_file" exec -T ipfs ipfs "$@"
}

mkdir -p "$backup_dir/cars"

# List the pins first: a failure inside a process substitution would go
# unnoticed and the script would report an empty, successful backup.
if ! pins="$(ipfs pin ls --type=recursive --quiet </dev/null)"; then
  echo "$(date -u +%FT%TZ) ERROR: cannot list pins on the IPFS node" >&2
  exit 1
fi
if [[ -z "$pins" ]]; then
  echo "$(date -u +%FT%TZ) ERROR: the IPFS node has no pins; refusing to continue" >&2
  exit 1
fi

exported=0
total=0
while read -r cid; do
  [[ -n "$cid" ]] || continue
  total=$((total + 1))
  car="$backup_dir/cars/$cid.car"
  if [[ -s "$car" ]]; then
    continue
  fi
  # </dev/null: docker compose exec would otherwise read the CID list.
  ipfs dag export "$cid" </dev/null >"$car.tmp"
  mv "$car.tmp" "$car"
  exported=$((exported + 1))
done <<<"$pins"

echo "$(date -u +%FT%TZ) pinned CIDs: $total, newly exported: $exported, backup dir: $backup_dir/cars"

if [[ -n "$rclone_destination" ]]; then
  docker run --rm \
    --env-file "$rclone_env_file" \
    -v "$(realpath "$backup_dir/cars"):/cars:ro" \
    "$RCLONE_IMAGE" copy /cars "$rclone_destination"
  echo "$(date -u +%FT%TZ) copied to $rclone_destination"
fi
