#!/usr/bin/env bash
# n8n-cli installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/lawrencewzen/n8n-cli/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/lawrencewzen/n8n-cli/main/install.sh | bash -s -- --skills-dir /opt/alice/data/skills

set -euo pipefail

REPO="lawrencewzen/n8n-cli"
BRANCH="main"
RAW="https://raw.githubusercontent.com/${REPO}/${BRANCH}"

INSTALL_DIR="${N8N_CLI_INSTALL_DIR:-/opt/n8n-cli}"
BIN_LINK="${N8N_CLI_BIN:-/usr/local/bin/n8n-cli}"
SKILLS_DIR=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skills-dir) SKILLS_DIR="$2"; shift 2 ;;
    --install-dir) INSTALL_DIR="$2"; shift 2 ;;
    --bin) BIN_LINK="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "→ Installing n8n-cli to ${INSTALL_DIR}"
mkdir -p "${INSTALL_DIR}"

# Download CLI
curl -fsSL "${RAW}/bin/n8n-cli.mjs" -o "${INSTALL_DIR}/n8n-cli.mjs"
chmod +x "${INSTALL_DIR}/n8n-cli.mjs"

# Symlink CLI to bin
ln -sf "${INSTALL_DIR}/n8n-cli.mjs" "${BIN_LINK}"
echo "✓ n8n-cli → ${BIN_LINK}"

# Download skill
curl -fsSL "${RAW}/skills/n8n.md" -o "${INSTALL_DIR}/n8n.md"
echo "✓ skill downloaded to ${INSTALL_DIR}/n8n.md"

# Symlink skill to Alice skills dir (if specified or auto-detected)
if [[ -z "${SKILLS_DIR}" ]]; then
  # Auto-detect Alice skills dir
  for candidate in /opt/alice/data/skills "${HOME}/.alice/skills"; do
    if [[ -d "$candidate" ]]; then
      SKILLS_DIR="$candidate"
      break
    fi
  done
fi

if [[ -n "${SKILLS_DIR}" ]]; then
  mkdir -p "${SKILLS_DIR}"
  ln -sf "${INSTALL_DIR}/n8n.md" "${SKILLS_DIR}/n8n.md"
  echo "✓ skill symlinked → ${SKILLS_DIR}/n8n.md"
else
  echo "  (no skills dir found, skipping skill symlink)"
  echo "  To install skill later: ln -sf ${INSTALL_DIR}/n8n.md <skills-dir>/n8n.md"
fi

echo ""
echo "Done. Test with: n8n-cli health"
