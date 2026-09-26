Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$SourcePath,
        [string]$DestinationPath,
        [int]$Width,
        [int]$Height
    )

    $srcImg = [System.Drawing.Image]::FromFile($SourcePath)
    $destBmp = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)

    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.DrawImage($srcImg, 0, 0, $Width, $Height)

    $destDir = [System.IO.Path]::GetDirectoryName($DestinationPath)
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    if (Test-Path $DestinationPath) {
        Remove-Item -Force $DestinationPath
    }

    $destBmp.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $destBmp.Dispose()
    $srcImg.Dispose()

    Write-Host "Generated: $DestinationPath ($Width x $Height)"
}

$source = "C:\Users\90532\.gemini\antigravity\brain\431d42c1-39aa-4883-bac6-6fe7a0083455\.user_uploaded\media_1789929300168.png"
$root = (Get-Location).Path

Write-Host "=== Generating Root, Src and Public Icons ==="
Resize-Image -SourcePath $source -DestinationPath (Join-Path $root "comusdutylogo.png") -Width 1024 -Height 1024
Resize-Image -SourcePath $source -DestinationPath (Join-Path $root "src\assets\logo.png") -Width 512 -Height 512
Resize-Image -SourcePath $source -DestinationPath (Join-Path $root "public\logo.png") -Width 512 -Height 512
Resize-Image -SourcePath $source -DestinationPath (Join-Path $root "public\pwa-512x512.png") -Width 512 -Height 512
Resize-Image -SourcePath $source -DestinationPath (Join-Path $root "public\pwa-192x192.png") -Width 192 -Height 192
Resize-Image -SourcePath $source -DestinationPath (Join-Path $root "public\apple-touch-icon.png") -Width 180 -Height 180
Resize-Image -SourcePath $source -DestinationPath (Join-Path $root "public\favicon.png") -Width 64 -Height 64

Write-Host "=== Generating iOS Xcode Asset AppIcons ==="
$iosIcons = Join-Path $root "ios\App\App\Assets.xcassets\AppIcon.appiconset"
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-512@2x.png") -Width 1024 -Height 1024
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-60@3x.png") -Width 180 -Height 180
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-60@2x.png") -Width 120 -Height 120
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-40@3x.png") -Width 120 -Height 120
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-40@2x.png") -Width 80 -Height 80
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-29@3x.png") -Width 87 -Height 87
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-29@2x.png") -Width 58 -Height 58
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-20@3x.png") -Width 60 -Height 60
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-20@2x.png") -Width 40 -Height 40
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-76@1x.png") -Width 76 -Height 76
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-76@2x.png") -Width 152 -Height 152
Resize-Image -SourcePath $source -DestinationPath (Join-Path $iosIcons "AppIcon-83.5@2x.png") -Width 167 -Height 167

Write-Host "All icons generated successfully!"
