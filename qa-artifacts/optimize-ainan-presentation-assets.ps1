Add-Type -AssemblyName System.Drawing

$assetDir = Join-Path $PSScriptRoot '..\fishing-game\assets\approved-mock'

function Resize-Png([string]$sourceName, [string]$targetName, [int]$width, [int]$height) {
  $source = [Drawing.Bitmap]::FromFile((Join-Path $assetDir $sourceName))
  $target = [Drawing.Bitmap]::new($width, $height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $graphics = [Drawing.Graphics]::FromImage($target)
    try {
      $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
      $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($source, 0, 0, $width, $height)
    } finally {
      $graphics.Dispose()
    }
    $target.Save((Join-Path $assetDir $targetName), [Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $source.Dispose()
    $target.Dispose()
  }
}

Resize-Png 'harbor-clean-water-generated.png' 'harbor-clean-water-390x844.png' 390 844
Resize-Png 'madai-approved-live.png' 'madai-approved-live-768x512.png' 768 512

Get-Item (Join-Path $assetDir 'harbor-clean-water-390x844.png'), (Join-Path $assetDir 'madai-approved-live-768x512.png') |
  Select-Object Name, Length
