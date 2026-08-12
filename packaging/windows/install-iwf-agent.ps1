param(
  [Parameter(Mandatory = $true)]
  [string]$AgentToken,

  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,

  [string]$SourceDir = ".",
  [string]$InstallDir = "$env:LOCALAPPDATA\IWF-Agent"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

Copy-Item -Path (Join-Path $SourceDir "*") -Destination $InstallDir -Recurse -Force

$config = @{
  agent_token = $AgentToken
  api_base_url = $ApiBaseUrl
} | ConvertTo-Json -Depth 3

Set-Content -Path (Join-Path $InstallDir "config.json") -Value $config -Encoding UTF8

$exePath = Join-Path $InstallDir "IWF-Agent.exe"
if (!(Test-Path $exePath)) {
  throw "IWF-Agent.exe not found in $InstallDir"
}

New-ItemProperty `
  -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" `
  -Name "IWFAgent" `
  -Value $exePath `
  -PropertyType String `
  -Force | Out-Null

Start-Process -FilePath $exePath -WindowStyle Hidden

Write-Host "IWF Agent installed and started."
