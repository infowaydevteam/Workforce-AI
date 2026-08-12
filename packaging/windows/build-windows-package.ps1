param(
  [string]$Configuration = "Release",
  [string]$Version = "1.0.0",
  [string]$AgentToken = "",
  [string]$ApiBaseUrl = "http://localhost:5001"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ProjectPath = Join-Path $RepoRoot "IWF-Agent\IWF-Agent\IWF-Agent.csproj"
$PublishDir = Join-Path $RepoRoot "IWF-Agent\IWF-Agent\bin\$Configuration\net10.0\win-x64\publish"
$PackageRoot = Join-Path $RepoRoot "backend\agent-updates\windows\$Version"
$PackageName = "IWF-Agent-Setup-$Version.zip"
$PackagePath = Join-Path $PackageRoot $PackageName

dotnet publish $ProjectPath -c $Configuration -r win-x64 --self-contained true

New-Item -ItemType Directory -Force -Path $PackageRoot | Out-Null

$TempRoot = Join-Path $env:TEMP "iwf-agent-windows-$Version"
if (Test-Path $TempRoot) {
  Remove-Item $TempRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

Copy-Item -Path (Join-Path $PublishDir "*") -Destination $TempRoot -Recurse -Force
Copy-Item -Path (Join-Path $PSScriptRoot "install-iwf-agent.ps1") -Destination $TempRoot -Force

if ($AgentToken) {
  @{
    agent_token = $AgentToken
    api_base_url = $ApiBaseUrl
  } | ConvertTo-Json -Depth 3 | Set-Content -Path (Join-Path $TempRoot "config.json") -Encoding UTF8
}

if (Test-Path $PackagePath) {
  Remove-Item $PackagePath -Force
}

Compress-Archive -Path (Join-Path $TempRoot "*") -DestinationPath $PackagePath

Write-Host "Built Windows agent package: $PackagePath"
Write-Host "Update manifest with:"
Write-Host "node scripts/update-agent-manifest.mjs windows $Version `"$PackagePath`" `"Windows agent $Version`""
