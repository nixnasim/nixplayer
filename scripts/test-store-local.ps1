# Builds the Microsoft Store package on THIS PC and installs it for a test. Nothing is uploaded anywhere.
# Needs: Node.js, "npm install" done once, and Windows Developer Mode on (Settings -> System -> For developers).
# It replaces an installed Store copy of NixPlayer with the test copy (settings of the Store copy stay in its own data folder).
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host '1/4  Building the package (npm run dist:store) ...'
npm run dist:store
if ($LASTEXITCODE -ne 0) { throw 'The build failed (see the messages above).' }
$pkg = Get-ChildItem dist -Filter *.appx | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $pkg) { throw 'No .appx file was built.' }

Write-Host '2/4  Adding the file-type icons ...'
& "$PSScriptRoot\patch-appx.ps1" -Appx $pkg.FullName

Write-Host '3/4  Unpacking ...'
$dir = Join-Path $env:TEMP 'NixPlayerStoreTest'
Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
$found = @()
$kits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
if (Test-Path $kits) { $found += Get-ChildItem $kits -Recurse -Filter makeappx.exe -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\x64\\' } | Sort-Object FullName -Descending }
$eb = Join-Path $env:LOCALAPPDATA 'electron-builder\Cache'
if (Test-Path $eb) { $found += Get-ChildItem $eb -Recurse -Filter makeappx.exe -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'x64' } }
$makeappx = $found | Select-Object -First 1 -ExpandProperty FullName
if ($makeappx) {
  & $makeappx unpack /p $pkg.FullName /d $dir /o | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'makeappx unpack failed' }
} else {
  $zip = "$($pkg.FullName).zip"
  Copy-Item $pkg.FullName $zip -Force
  Expand-Archive $zip -DestinationPath $dir -Force
  Remove-Item $zip -Force
}

Write-Host '4/4  Installing the test copy ...'
Get-AppxPackage NixNasim.NixPlayer | Remove-AppxPackage -ErrorAction SilentlyContinue
try {
  Add-AppxPackage -Register (Join-Path $dir 'AppxManifest.xml')
} catch {
  Write-Host ''
  Write-Host 'Could not install the test copy. Is Developer Mode on? (Settings -> System -> For developers -> Developer Mode)' -ForegroundColor Yellow
  throw
}
Write-Host ''
Write-Host 'Done. NixPlayer (test copy) is in the Start menu.' -ForegroundColor Green
Write-Host 'To see new icons right away: close Explorer windows, run  taskkill /f /im explorer.exe  then delete the iconcache_*.db and thumbcache_*.db files in'
Write-Host "  $env:LOCALAPPDATA\Microsoft\Windows\Explorer   and start explorer.exe again."
Write-Host 'To remove the test copy:  Get-AppxPackage NixNasim.NixPlayer | Remove-AppxPackage'
