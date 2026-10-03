param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..'))
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assetDir = Join-Path $Root 'fishing-game/assets/ui-art-v1'
$navSource = Join-Path $assetDir 'nav-kit-source.png'
$buttonSource = Join-Path $assetDir 'button-kit-source.png'

function Export-Crop {
  param(
    [System.Drawing.Bitmap]$Source,
    [string]$Name,
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height,
    [int]$TargetWidth,
    [int]$TargetHeight
  )

  $output = New-Object System.Drawing.Bitmap $TargetWidth, $TargetHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($output)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $dest = New-Object System.Drawing.Rectangle 0, 0, $TargetWidth, $TargetHeight
  $src = New-Object System.Drawing.Rectangle $X, $Y, $Width, $Height
  $graphics.DrawImage($Source, $dest, $src, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  $output.Save((Join-Path $assetDir $Name), [System.Drawing.Imaging.ImageFormat]::Png)
  $output.Dispose()
}

$nav = [System.Drawing.Bitmap]::FromFile($navSource)
Export-Crop $nav 'footer-shell.png' 0 590 1774 270 768 117
Export-Crop $nav 'tab-selected.png' 1535 90 239 500 96 200
Export-Crop $nav 'icon-home.png' 20 110 350 445 94 120
Export-Crop $nav 'icon-equip.png' 375 90 280 470 80 134
Export-Crop $nav 'icon-town.png' 680 100 370 460 104 129
Export-Crop $nav 'icon-exchange.png' 1060 120 250 420 82 138
Export-Crop $nav 'icon-menu.png' 1320 245 210 270 80 103
$nav.Dispose()

$buttons = [System.Drawing.Bitmap]::FromFile($buttonSource)
Export-Crop $buttons 'button-primary.png' 55 70 860 300 688 240
Export-Crop $buttons 'button-secondary.png' 965 70 860 300 688 240
Export-Crop $buttons 'button-primary-pressed.png' 55 485 860 285 688 228
Export-Crop $buttons 'button-disabled.png' 965 485 860 285 688 228
$buttons.Dispose()

Get-ChildItem $assetDir -Filter '*.png' | Sort-Object Name | Select-Object Name, Length
