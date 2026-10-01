Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\kojac\Downloads\ChatGPT 画像 2026年10月1日 16_53_30.png'
$outputPath = Join-Path $PSScriptRoot '..\fishing-game\assets\approved-mock\retrieve-approved-panel.png'

$source = [Drawing.Bitmap]::FromFile($sourcePath)
$target = [Drawing.Bitmap]::new(391, 783, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
try {
  $graphics = [Drawing.Graphics]::FromImage($target)
  try {
    $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.DrawImage(
      $source,
      [Drawing.Rectangle]::new(0, 0, 391, 783),
      [Drawing.Rectangle]::new(437, 110, 391, 783),
      [Drawing.GraphicsUnit]::Pixel
    )
  } finally {
    $graphics.Dispose()
  }
  $target.Save($outputPath, [Drawing.Imaging.ImageFormat]::Png)
} finally {
  $source.Dispose()
  $target.Dispose()
}

[pscustomobject]@{ Asset = $outputPath; Width = 391; Height = 783 }
