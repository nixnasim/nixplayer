# Adds what electron-builder's appx target cannot: a name and an icon (with the MP4 / MKV / SRT ... label) for every
# file type, so Explorer shows NixPlayer's file icons in the Store edition just like the installer edition.
# It unpacks the .appx, edits AppxManifest.xml, packs it again. If anything goes wrong the original .appx is kept.
param([Parameter(Mandatory=$true)][string]$Appx, [string]$Package = 'package.json')
$ErrorActionPreference = 'Stop'
try {
  $kits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
  $makeappx = Get-ChildItem $kits -Recurse -Filter makeappx.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\x64\\' } | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
  if (-not $makeappx) { throw 'makeappx.exe (Windows SDK) was not found on this machine' }
  Write-Host "Using $makeappx"
  $tmp = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { $env:TEMP }
  $work = Join-Path $tmp 'nix-appx-work'
  $out  = Join-Path $tmp 'nix-appx-patched.appx'
  Remove-Item $work, $out -Recurse -Force -ErrorAction SilentlyContinue

  & $makeappx unpack /p $Appx /d $work /o | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'makeappx unpack failed' }

  $desc = @{}
  foreach ($fa in (Get-Content $Package -Raw | ConvertFrom-Json).build.fileAssociations) { $desc[[string]$fa.ext] = [string]$fa.description }

  $manifest = Join-Path $work 'AppxManifest.xml'
  [xml]$xml = Get-Content $manifest -Raw
  $uapNs = 'http://schemas.microsoft.com/appx/manifest/uap/windows10'
  $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $ns.AddNamespace('uap', $uapNs)
  $count = 0
  foreach ($fta in $xml.SelectNodes('//uap:FileTypeAssociation', $ns)) {
    $ext = $fta.GetAttribute('Name')
    if (-not (Test-Path (Join-Path $work "assets\file-$ext.png"))) { Write-Host "no icon for .$ext, skipped"; continue }
    if ($fta.SelectSingleNode('uap:Logo', $ns)) { continue }
    if ($desc.ContainsKey($ext) -and $desc[$ext] -and -not $fta.SelectSingleNode('uap:DisplayName', $ns)) {
      $dn = $xml.CreateElement('uap', 'DisplayName', $uapNs); $dn.InnerText = $desc[$ext]; [void]$fta.AppendChild($dn)
    }
    $logo = $xml.CreateElement('uap', 'Logo', $uapNs); $logo.InnerText = "assets\file-$ext.png"; [void]$fta.AppendChild($logo)
    $count++
  }
  $xml.Save($manifest)

  foreach ($n in 'AppxBlockMap.xml', '[Content_Types].xml', 'AppxSignature.p7x') { Remove-Item -LiteralPath (Join-Path $work $n) -Force -ErrorAction SilentlyContinue }
  Remove-Item (Join-Path $work 'AppxMetadata') -Recurse -Force -ErrorAction SilentlyContinue

  & $makeappx pack /d $work /p $out /o | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'makeappx pack failed' }
  Move-Item -LiteralPath $out -Destination $Appx -Force
  Write-Host "Patched: $count file types now have their own icon and name."
} catch {
  Write-Host "::warning::Could not add the file-type icons ($($_.Exception.Message)). The package was left as built; file icons will be the plain app icon."
  exit 0
}
