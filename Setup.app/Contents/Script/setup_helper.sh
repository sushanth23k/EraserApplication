#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "[setup] Project root: ${PROJECT_ROOT}"
osascript -e 'display dialog "Install frontend and backend dependencies?" buttons {"Cancel","Install"} default button "Install" with title "Eraser Setup"' || exit 1

if [[ ! -f "${PROJECT_ROOT}/frontend/package.json" ]]; then
  echo "[setup] Error: frontend/package.json not found" >&2
  exit 1
fi

if [[ ! -f "${PROJECT_ROOT}/backend/requirements.txt" ]]; then
  echo "[setup] Error: backend/requirements.txt not found" >&2
  exit 1
fi

(
  cd "${PROJECT_ROOT}/frontend"
  if command -v npm >/dev/null 2>&1; then
    osascript -e 'display dialog "Installing frontend dependencies..." buttons {"OK"} giving up after 1 with title "Eraser Setup"' >/dev/null 2>&1 || true
    npm ci || npm install
  else
    echo "[setup] Error: npm not found" >&2
    exit 1
  fi
)

(
  cd "${PROJECT_ROOT}/backend"
  PY="python3"; command -v "$PY" >/dev/null 2>&1 || PY="python"
  if ! command -v "$PY" >/dev/null 2>&1; then
    echo "[setup] Error: Python not found" >&2
    exit 1
  fi
  osascript -e 'display dialog "Creating Python venv and installing backend deps..." buttons {"OK"} giving up after 1 with title "Eraser Setup"' >/dev/null 2>&1 || true
  "$PY" -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
)

osascript -e 'display dialog "Setup completed" buttons {"OK"} default button "OK" with title "Eraser Setup"' >/dev/null 2>&1 || true
echo "[setup] Completed"


