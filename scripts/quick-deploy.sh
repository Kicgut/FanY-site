#!/usr/bin/env bash
# Compatibility entrypoint for the verified-image ECS deployment workflow.
# Never pull source or build an image on ECS.

set -euo pipefail

exec "$(dirname "$0")/deploy.sh" "$@"
