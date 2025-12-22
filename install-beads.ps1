$ErrorActionPreference = 'Stop'
$url = 'https://github.com/steveyegge/beads/releases/download/v0.34.0/beads_0.34.0_windows_amd64.zip'
$zipPath = "$env:TEMP\beads.zip"
$extractPath = "$env:TEMP\beads_extract"
$targetDir = "$env:LOCALAPPDATA\Programs\beads"

Write-Host 'Downloading Beads binary...'
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Host 'Extracting...'
if (Test-Path $extractPath) { Remove-Item -Recurse -Force $extractPath }
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

Write-Host "Installing to $targetDir"
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
Get-ChildItem -Path $extractPath -Recurse -Filter '*.exe' | ForEach-Object {
    Write-Host "Copying: $($_.Name)"
    Copy-Item -Path $_.FullName -Destination $targetDir -Force
}

Write-Host 'Cleaning up...'
Remove-Item $zipPath -Force
Remove-Item $extractPath -Recurse -Force

Write-Host "Done! Beads installed to: $targetDir"
Get-ChildItem -Path $targetDir -Filter '*.exe'
