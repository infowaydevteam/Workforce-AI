#!/bin/bash
set -euo pipefail

TOKEN="${IWF_AGENT_TOKEN:-}"
API_BASE_URL="${IWF_API_BASE_URL:-http://localhost:5001}"
INSTALL_DIR="${IWF_AGENT_INSTALL_DIR:-$HOME/Applications/IWF-Agent}"
CONFIG_DIR="$HOME/Library/Application Support/IWF-Agent"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENT_DIR/com.iwf.agent.plist"

if [[ -z "$TOKEN" ]]; then
  echo "IWF_AGENT_TOKEN is required."
  exit 1
fi

mkdir -p "$INSTALL_DIR" "$CONFIG_DIR" "$LAUNCH_AGENT_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/../../scripts/mac-agent.mjs" "$INSTALL_DIR/mac-agent.mjs"

cat > "$CONFIG_DIR/config.json" <<JSON
{
  "agent_token": "$TOKEN",
  "api_base_url": "$API_BASE_URL"
}
JSON

sed \
  -e "s#__NODE_PATH__#/usr/local/bin/node#g" \
  -e "s#__AGENT_SCRIPT__#$INSTALL_DIR/mac-agent.mjs#g" \
  "$SCRIPT_DIR/com.iwf.agent.plist.template" > "$PLIST_PATH"

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl load "$PLIST_PATH"

echo "IWF Agent installed and started."
echo "Grant Accessibility and Screen Recording permissions if prompted."
