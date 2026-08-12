# Agent Install and Update Release Flow

## Employee Install Flow

1. Admin creates the employee account.
2. Backend generates `agent_token`.
3. Admin sends the employee download link:
   - `/api/agent/download-agent/:token`
4. The employee opens the link and downloads the Windows or macOS installer:
   - Windows: `/api/agent/download-agent/:token?platform=windows`
   - macOS: `/api/agent/download-agent/:token?platform=macos`
5. The installer writes agent config from:
   - `/api/agent/install-config/:token`
6. The installed agent starts in the background and reports `Online`, `Idle`, or `Offline`.

The install config response is:

```json
{
  "success": true,
  "agent_token": "employee-token",
  "api_base_url": "https://your-api-host"
}
```

## Windows Installer Requirements

- Install `IWF-Agent.exe` under a stable application directory.
- Write `config.json` next to the executable:

```json
{
  "agent_token": "employee-token",
  "api_base_url": "https://your-api-host"
}
```

- Start the agent after install.
- The agent registers itself under the current user's Windows startup registry key.
- For a future MSI/EXE installer, pass the employee token from the download flow or call `/api/agent/install-config/:token` during install.

Current repo packaging support:

```powershell
powershell -ExecutionPolicy Bypass -File packaging/windows/build-windows-package.ps1 -Version 1.1.0 -AgentToken "employee-token" -ApiBaseUrl "http://localhost:5001"
```

The current Windows package format is a `.zip`. The running Windows agent can apply `.zip` updates by launching a separate PowerShell updater, exiting, copying staged files over the installed files, and restarting the agent.

## macOS Installer Requirements

- Install the macOS agent under a stable application directory.
- Write `config.json` with the employee `agent_token` and `api_base_url`.
- Install a LaunchAgent plist under `~/Library/LaunchAgents/`.
- Load the LaunchAgent after install.
- Prompt the employee to grant Accessibility and Screen Recording permissions when needed.

Use `packaging/macos/com.iwf.agent.plist` as the LaunchAgent template.

Current repo packaging support:

```bash
packaging/macos/build-macos-package.sh 1.1.0 "employee-token" "http://localhost:5001"
```

For local non-PKG install testing:

```bash
IWF_AGENT_TOKEN="employee-token" IWF_API_BASE_URL="http://localhost:5001" packaging/macos/install.sh
```

The macOS agent can apply:

- `.pkg` by running `installer` for the current user domain, then exiting so LaunchAgent restarts it.
- `.dmg` when the mounted image contains a `.pkg`.
- `.zip` by copying staged files into the installed agent directory, skipping `config.json`.

## Update Release Flow

1. Build new agent features.
2. Bump agent version, for example `1.0.0` to `1.1.0`.
3. Build the Windows installer package.
4. Build the macOS installer package.
5. Calculate SHA256 checksums.
6. Upload packages into backend update storage:
   - `backend/agent-updates/windows/1.1.0/IWF-Agent-Setup-1.1.0.zip`
   - `backend/agent-updates/macos/1.1.0/IWF-Agent-1.1.0.pkg`
7. Update `backend/agent-updates/manifest.json`.

You can update the manifest and checksum with:

```bash
node scripts/update-agent-manifest.mjs windows 1.1.0 backend/agent-updates/windows/1.1.0/IWF-Agent-Setup-1.1.0.zip "Windows agent 1.1.0"
node scripts/update-agent-manifest.mjs macos 1.1.0 backend/agent-updates/macos/1.1.0/IWF-Agent-1.1.0.pkg "macOS agent 1.1.0"
```

Agents call:

```text
GET /api/agent/updates?platform=windows&version=1.0.0&agent_token=...
GET /api/agent/updates?platform=macos&version=1.0.0&agent_token=...
```

If a newer package exists, the agent downloads it, verifies SHA256, and stages it locally:

- Windows: `%LOCALAPPDATA%/IWF-Agent/updates/<version>/`
- macOS: `~/Library/Application Support/IWF-Agent/updates/<version>/`

If the running agent cannot safely replace itself, the staged update applies on the next safe restart.

## Demo Commands

Build packages:

```bash
packaging/macos/build-macos-package.sh 1.1.0 "employee-token" "http://localhost:5001"
```

```powershell
powershell -ExecutionPolicy Bypass -File packaging/windows/build-windows-package.ps1 -Version 1.1.0 -AgentToken "employee-token" -ApiBaseUrl "http://localhost:5001"
```

Update manifest:

```bash
node scripts/update-agent-manifest.mjs macos 1.1.0 backend/agent-updates/macos/1.1.0/IWF-Agent-1.1.0.pkg "macOS agent 1.1.0"
node scripts/update-agent-manifest.mjs windows 1.1.0 backend/agent-updates/windows/1.1.0/IWF-Agent-Setup-1.1.0.zip "Windows agent 1.1.0"
```

Employee links:

```text
http://localhost:5001/api/agent/download-agent/<token>
http://localhost:5001/api/agent/download-agent/<token>?platform=windows
http://localhost:5001/api/agent/download-agent/<token>?platform=macos
```
