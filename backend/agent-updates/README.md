# Agent Update Storage

This directory is the update channel the desktop agents poll. `manifest.json`
says which version is current for each platform, and the packages themselves sit
in `<platform>/<version>/`.

Agents call `/api/agent/updates` with their platform and current version. If the
manifest lists something newer and the file exists, the agent downloads it,
checks the SHA-256, and applies it.

## Current releases

| Platform | Version | Package |
|---|---|---|
| macOS | 1.0.2 | `macos/1.0.2/IWF-Agent-1.0.2.pkg` |
| Windows | 1.0.8 | `windows/1.0.8/IWF-Agent-Setup-1.0.8.zip` |

## Publishing a release

Both build scripts write the package straight into this directory and print the
command to update the manifest.

macOS, built with `pkgbuild`:

```bash
bash packaging/macos/build-macos-package.sh 1.0.3
node scripts/update-agent-manifest.mjs macos 1.0.3 \
  "backend/agent-updates/macos/1.0.3/IWF-Agent-1.0.3.pkg" "macOS agent 1.0.3"
```

Windows, a self-contained single-file publish zipped up. It targets
`net10.0-windows`, and the script passes `EnableWindowsTargeting` so the build
also runs from macOS or Linux:

```bash
node scripts/build-windows-agent-package.mjs 1.0.9
node scripts/update-agent-manifest.mjs windows 1.0.9 \
  "backend/agent-updates/windows/1.0.9/IWF-Agent-Setup-1.0.9.zip" "Windows agent 1.0.9"
```

`update-agent-manifest.mjs` computes the checksum from the file itself, so the
manifest cannot drift from what is on disk. It takes a single release note; edit
`manifest.json` afterwards if the release needs several.

Before publishing, bump the version the agent reports, or the update channel
cannot tell the builds apart:

* macOS — `CURRENT_VERSION` in `scripts/mac-agent.mjs`
* Windows — `AgentUpdateService.CurrentVersion`

These have drifted from the manifest before. A manifest advertising 1.0.0 while
the agent reported 1.0.4 meant every agent in the field considered itself up to
date.

The Windows `.zip` is covered by `*.zip` in `.gitignore`, so committing it needs
`git add -f`.

## manifest.json

```json
{
  "schema_version": 1,
  "platforms": {
    "windows": {
      "enabled": true,
      "latest_version": "1.0.8",
      "mandatory": true,
      "package_name": "IWF-Agent-Setup-1.0.8.zip",
      "checksum_sha256": "...",
      "release_notes": ["..."]
    }
  }
}
```

`enabled` turns the channel off for a platform. `mandatory` is served to agents
but neither agent reads it today; both apply any update they are offered, so an
update is effectively mandatory either way.

## When an update does not apply

The agent never leaves a machine unmonitored: if it cannot apply an update it
restarts the build it already has. That means a failure looks like an agent that
simply has not updated, so check the logs rather than assuming the channel is
broken.

* macOS — `~/Library/Application Support/IWF-Agent/updates/<version>/`
* Windows — `apply-update.log` in `%LOCALAPPDATA%\IWF-Agent\updates\<version>\`,
  which records each copy attempt and whether the old build was restarted

Windows cannot overwrite the running executable until the exiting process
releases it, so the updater retries the copy five times, two seconds apart.
After three failed attempts at the same version it stops for that version and
records why. Publishing a newer version starts a fresh set of attempts; to retry
the same one, delete `update-state.json` in `%LOCALAPPDATA%\IWF-Agent\updates\`.

## Keeping old packages

Only the version named in the manifest is served. Superseded packages can be
deleted; the Windows ones are around 44 MB each and the repository carries them.
