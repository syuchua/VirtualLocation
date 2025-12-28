#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.dev.yml"
SERVICE="app"

cmd="${1:-shell}"
shift || true

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

case "${cmd}" in
  build)
    compose build "${SERVICE}"
    ;;
  shell)
    cid="$(compose ps -q "${SERVICE}")"
    if [[ -n "${cid}" ]]; then
      compose exec "${SERVICE}" bash
    else
      compose up -d "${SERVICE}"
      compose exec "${SERVICE}" bash
    fi
    ;;
  start)
    compose run --rm --service-ports "${SERVICE}" bash -lc "npm install && npm run start"
    ;;
  run-android)
    compose run --rm --service-ports "${SERVICE}" bash -lc "npm install && npm run run:android"
    ;;
  install)
    compose run --rm "${SERVICE}" bash -lc "npm install"
    ;;
  *)
    echo "用法: scripts/dev.sh [build|shell|install|start|run-android]"
    exit 1
    ;;
esac
