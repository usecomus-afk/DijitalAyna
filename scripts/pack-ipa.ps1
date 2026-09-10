Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = (Get-Location).Path
$sourceIpa = Join-Path $root "DutyDijitalAyna.ipa"
$desktopIpa = "C:\Users\90532\OneDrive\Desktop\DutyDijitalAyna.ipa"
$packDir = Join-Path $root "_ipa_pack"
$tempZip = Join-Path $root "DutyDijitalAyna_temp.zip"
$publicSource = Join-Path $root "ios\App\App\public"
$capConfig = Join-Path $root "ios\App\App\capacitor.config.json"

Write-Host "Starting IPA update process..."

# Step 1: Clean previous temp files
if (Test-Path $packDir) {
    Remove-Item -Recurse -Force $packDir
}
if (Test-Path $tempZip) {
    Remove-Item -Force $tempZip
}

# Step 2: Extract current IPA
Write-Host "Extracting $sourceIpa to $packDir..."
[System.IO.Compression.ZipFile]::ExtractToDirectory($sourceIpa, $packDir)

# Step 3: Target public folder
$targetPublic = Join-Path $packDir "Payload\App.app\public"
Write-Host "Updating web assets from $publicSource to $targetPublic..."

if (Test-Path $targetPublic) {
    Remove-Item -Recurse -Force $targetPublic
}
New-Item -ItemType Directory -Path $targetPublic -Force | Out-Null
Copy-Item -Recurse -Force "$publicSource\*" $targetPublic

# Copy capacitor config if exists
if (Test-Path $capConfig) {
    Copy-Item -Force $capConfig (Join-Path $packDir "Payload\App.app\capacitor.config.json")
}

# Step 4: Repackage into zip/ipa
Write-Host "Creating updated IPA archive..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($packDir, $tempZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Step 5: Copy to local and Desktop
Write-Host "Deploying updated IPA to local repo and Desktop..."
Copy-Item -Force $tempZip $sourceIpa
Copy-Item -Force $tempZip $desktopIpa

# Step 6: Cleanup
Remove-Item -Force $tempZip
Remove-Item -Recurse -Force $packDir

Write-Host "IPA successfully created and deployed!"
Get-Item $desktopIpa, $sourceIpa | Select-Object FullName, Length, LastWriteTime
