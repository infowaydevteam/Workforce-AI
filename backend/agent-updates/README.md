# Agent Update Storage

This directory is the backend update channel for the monitoring agent.

Release flow:

1. Build a Windows installer package, for example `IWF-Agent-Setup-1.1.0.msi`.
2. Build a macOS installer package, for example `IWF-Agent-1.1.0.pkg`.
3. Put packages under:
   - `backend/agent-updates/windows/1.1.0/IWF-Agent-Setup-1.1.0.msi`
   - `backend/agent-updates/macos/1.1.0/IWF-Agent-1.1.0.pkg`
4. Calculate SHA256 for each package.
5. Update `manifest.json` with the new version, package name, checksum, and release notes.

Agents check `/api/agent/updates` with their current version and platform. If the manifest lists a newer package and the file exists, the agent downloads it, verifies the checksum, and stages it for apply.
