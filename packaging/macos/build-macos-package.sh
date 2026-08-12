#!/bin/bash
set -euo pipefail

VERSION="${1:-1.0.0}"
TOKEN="${2:-}"
API_BASE_URL="${3:-http://localhost:5001}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PACKAGE_ROOT="$ROOT_DIR/backend/agent-updates/macos/$VERSION"
PACKAGE_PATH="$PACKAGE_ROOT/IWF-Agent-$VERSION.pkg"
BUILD_ROOT="$(mktemp -d)"
PAYLOAD_ROOT="$BUILD_ROOT/payload"
SCRIPTS_ROOT="$BUILD_ROOT/scripts"

mkdir -p "$PACKAGE_ROOT" "$PAYLOAD_ROOT/Applications/IWF-Agent" "$SCRIPTS_ROOT"

cp "$ROOT_DIR/scripts/mac-agent.mjs" "$PAYLOAD_ROOT/Applications/IWF-Agent/mac-agent.mjs"
cp "$ROOT_DIR/packaging/macos/com.iwf.agent.plist.template" "$PAYLOAD_ROOT/Applications/IWF-Agent/com.iwf.agent.plist.template"

cat > "$SCRIPTS_ROOT/postinstall" <<SCRIPT
#!/bin/bash
set -e

TOKEN="$TOKEN"
API_BASE_URL="$API_BASE_URL"
CONSOLE_USER="\$(stat -f %Su /dev/console)"
CONSOLE_HOME="\$(dscl . -read "/Users/\$CONSOLE_USER" NFSHomeDirectory | awk '{print \$2}')"
CONFIG_DIR="\$CONSOLE_HOME/Library/Application Support/IWF-Agent"
LAUNCH_AGENT_DIR="\$CONSOLE_HOME/Library/LaunchAgents"
PLIST_PATH="\$LAUNCH_AGENT_DIR/com.iwf.agent.plist"
INSTALL_DIR="/Applications/IWF-Agent"

mkdir -p "\$CONFIG_DIR" "\$LAUNCH_AGENT_DIR"

if [[ -n "\$TOKEN" ]]; then
cat > "\$CONFIG_DIR/config.json" <<JSON
{
  "agent_token": "\$TOKEN",
  "api_base_url": "\$API_BASE_URL"
}
JSON
fi

NODE_PATH="/usr/local/bin/node"
if [[ ! -x "\$NODE_PATH" && -x "/opt/homebrew/bin/node" ]]; then
  NODE_PATH="/opt/homebrew/bin/node"
fi

sed \
  -e "s#__NODE_PATH__#\$NODE_PATH#g" \
  -e "s#__AGENT_SCRIPT__#\$INSTALL_DIR/mac-agent.mjs#g" \
  "\$INSTALL_DIR/com.iwf.agent.plist.template" > "\$PLIST_PATH"

chown -R "\$CONSOLE_USER" "\$CONFIG_DIR" "\$LAUNCH_AGENT_DIR"

USER_ID="\$(id -u "\$CONSOLE_USER")"
launchctl bootout "gui/\$USER_ID" "\$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/\$USER_ID" "\$PLIST_PATH" >/dev/null 2>&1 || true

exit 0
SCRIPT

chmod +x "$SCRIPTS_ROOT/postinstall"

pkgbuild \
  --root "$PAYLOAD_ROOT" \
  --scripts "$SCRIPTS_ROOT" \
  --identifier "com.iwf.agent" \
  --version "$VERSION" \
  --install-location "/" \
  "$PACKAGE_PATH"

rm -rf "$BUILD_ROOT"

echo "Built macOS agent package: $PACKAGE_PATH"
echo "Update manifest with:"
echo "node scripts/update-agent-manifest.mjs macos $VERSION \"$PACKAGE_PATH\" \"macOS agent $VERSION\""
