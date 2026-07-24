#!/usr/bin/env bash
set -euo pipefail

# Keep the newest N release archives plus one explicitly tagged rollback image.
# This script only operates inside the release directory and never touches data,
# uploads, backups, or the active container tag.
RELEASE_DIR=${RELEASE_DIR:-/opt/personal-website/releases}
KEEP=${KEEP:-3}

case "$RELEASE_DIR" in
  /opt/personal-website/releases) ;;
  *) echo "refusing unexpected RELEASE_DIR: $RELEASE_DIR" >&2; exit 2 ;;
esac

mapfile -t archives < <(find "$RELEASE_DIR" -maxdepth 1 -type f -name 'personal-website-*.tar.gz' ! -name 'personal-website-latest*' -printf '%T@ %p\n' | sort -nr | awk '{print $2}')
if (( ${#archives[@]} > KEEP )); then
  for archive in "${archives[@]:KEEP}"; do
    rm -f -- "$archive" "$archive.sha256"
    echo "removed $archive"
  done
fi

echo "retained ${KEEP} newest release archive(s)"
