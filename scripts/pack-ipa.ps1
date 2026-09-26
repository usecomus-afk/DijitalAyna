Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = (Get-Location).Path
$sourceIpa = Join-Path $root "DijitalMentalIkizim.ipa"
$fallbackOldIpa1 = Join-Path $root "DijitalMentalIkizim.ipa"
$fallbackOldIpa2 = Join-Path $root "DijitalMentalIkizim.ipa"
$packDir = Join-Path $root "_ipa_pack"
$tempZip = Join-Path $root "DijitalMentalIkizim_temp.zip"
$publicSource = Join-Path $root "ios\App\App\public"
$capConfig = Join-Path $root "ios\App\App\capacitor.config.json"

Write-Host "Starting Dijital Mental İkizim IPA update process..."

# Step 1: Clean previous temp files
if (Test-Path $packDir) {
    Remove-Item -Recurse -Force $packDir
}
if (Test-Path $tempZip) {
    Remove-Item -Force $tempZip
}

# Step 2: Extract current IPA
$extractIpa = if (Test-Path $sourceIpa) {
    $sourceIpa
} elseif (Test-Path $fallbackOldIpa1) {
    $fallbackOldIpa1
} else {
    $fallbackOldIpa2
}
Write-Host "Extracting $extractIpa to $packDir..."
[System.IO.Compression.ZipFile]::ExtractToDirectory($extractIpa, $packDir)

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

# Update native app icons in Payload if present
$iosIcons = Join-Path $root "ios\App\App\Assets.xcassets\AppIcon.appiconset"
$iconMap = @{
    "AppIcon-60@2x.png" = "AppIcon60x60@2x.png"
    "AppIcon-60@3x.png" = "AppIcon60x60@3x.png"
    "AppIcon-76@2x.png" = "AppIcon76x76@2x~ipad.png"
    "AppIcon-76@1x.png" = "AppIcon76x76~ipad.png"
    "AppIcon-83.5@2x.png" = "AppIcon83.5x83.5@2x~ipad.png"
    "AppIcon-40@2x.png" = "AppIcon40x40@2x.png"
    "AppIcon-40@3x.png" = "AppIcon40x40@3x.png"
    "AppIcon-29@2x.png" = "AppIcon29x29@2x.png"
    "AppIcon-29@3x.png" = "AppIcon29x29@3x.png"
    "AppIcon-20@2x.png" = "AppIcon20x20@2x.png"
    "AppIcon-20@3x.png" = "AppIcon20x20@3x.png"
    "AppIcon-512@2x.png" = "AppIcon.png"
}

foreach ($k in $iconMap.Keys) {
    $src = Join-Path $iosIcons $k
    if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $packDir ("Payload\App.app\" + $iconMap[$k]))
    }
}

# Step 4: Repackage into zip/ipa
Write-Host "Creating updated IPA archive..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($packDir, $tempZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Step 5: Copy to local and all Desktop locations
Write-Host "Deploying updated DijitalMentalIkizim.ipa to local repo and Desktops..."
Copy-Item -Force $tempZip $sourceIpa

# Remove old files
$oldFiles = @(
    (Join-Path $root "DijitalMentalIkizim.ipa"),
    "C:\Users\90532\OneDrive\Desktop\DijitalMentalIkizim.ipa",
    "C:\Users\90532\Desktop\DijitalMentalIkizim.ipa",
    (Join-Path $root "DijitalMentalIkizim.ipa"),
    "C:\Users\90532\OneDrive\Desktop\DijitalMentalIkizim.ipa",
    "C:\Users\90532\Desktop\DijitalMentalIkizim.ipa"
)
foreach ($old in $oldFiles) {
    if (Test-Path $old) {
        Remove-Item -Force $old -ErrorAction SilentlyContinue
        Write-Host "Removed old artifact: $old"
    }
}

$targetPaths = @(
    "C:\Users\90532\OneDrive\Desktop\DijitalMentalIkizim.ipa",
    "C:\Users\90532\Desktop\DijitalMentalIkizim.ipa"
)

foreach ($tp in $targetPaths) {
    $dir = Split-Path -Path $tp -Parent
    if (Test-Path $dir) {
        Copy-Item -Force $tempZip $tp
        Write-Host "Deployed to: $tp"
    }
}

# Step 6: Cleanup
Remove-Item -Force $tempZip
Remove-Item -Recurse -Force $packDir

Write-Host "DijitalMentalIkizim.ipa successfully created and deployed everywhere!"
