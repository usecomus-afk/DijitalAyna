Add-Type -AssemblyName System.IO.Compression.FileSystem

$sourceDir = (Resolve-Path "_ipa_pack").Path
$zipPath = Join-Path (Get-Location).Path "DutyDijitalAyna_temp.zip"
$desktopIpa = "C:\Users\90532\OneDrive\Desktop\DutyDijitalAyna.ipa"
$localIpa = Join-Path (Get-Location).Path "DutyDijitalAyna.ipa"

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

Write-Host "Creating IPA archive from $sourceDir..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($sourceDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Write-Host "Copying to target locations..."
Copy-Item -Force $zipPath $localIpa
Copy-Item -Force $zipPath $desktopIpa

Remove-Item -Force $zipPath
Remove-Item -Recurse -Force $sourceDir

Write-Host "Verifying packaged IPA files:"
Get-Item $desktopIpa, $localIpa | Select-Object Name, Length, LastWriteTime
