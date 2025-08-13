#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

(
  cd "$PROJECT_ROOT/backend"
  PY="python3"; command -v "$PY" >/dev/null 2>&1 || PY="python"
  if [[ -d .venv ]]; then
    source .venv/bin/activate
  fi
  nohup "$PY" app.py >/tmp/eraser_backend.log 2>&1 & disown
)

(
  cd "$PROJECT_ROOT/frontend"
  nohup npm start >/tmp/eraser_frontend.log 2>&1 & disown
)

echo "Started backend and frontend"


