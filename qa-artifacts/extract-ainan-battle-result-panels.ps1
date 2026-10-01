Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\kojac\Downloads\ChatGPT 画像 2026年10月1日 16_53_30.png'
$assetDir = Join-Path $PSScriptRoot '..\fishing-game\assets\approved-mock'
$approvedSourceDir = Join-Path $PSScriptRoot 'approved-source'
New-Item -ItemType Directory -Force -Path $approvedSourceDir | Out-Null

$source = [Drawing.Bitmap]::FromFile($sourcePath)
try {
  foreach ($panel in @(
    @{ Name = 'battle-approved-panel.png'; X = 845 },
    @{ Name = 'result-approved-panel.png'; X = 1254 }
  )) {
    $target = [Drawing.Bitmap]::new(391, 783, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [Drawing.Graphics]::FromImage($target)
      try {
        $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.DrawImage(
          $source,
          [Drawing.Rectangle]::new(0, 0, 391, 783),
          [Drawing.Rectangle]::new($panel.X, 110, 391, 783),
          [Drawing.GraphicsUnit]::Pixel
        )
      } finally {
        $graphics.Dispose()
      }
      $target.Save((Join-Path $approvedSourceDir $panel.Name), [Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $target.Dispose()
    }
  }
} finally {
  $source.Dispose()
}

$baseSpecs = @(
    @{ Source = 'battle-approved-panel.png'; Name = 'battle-approved-base.png'; FieldBottom = 580 },
    @{ Source = 'result-approved-panel.png'; Name = 'result-approved-base.png'; FieldBottom = 575 }
  )
foreach ($base in $baseSpecs) {
    $panel = [Drawing.Bitmap]::FromFile((Join-Path $approvedSourceDir $base.Source))
    $target = [Drawing.Bitmap]::new(391, 783, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [Drawing.Graphics]::FromImage($target)
      try {
        $graphics.DrawImageUnscaled($panel, 0, 0)
        $fieldHeight = $base.FieldBottom - 65
        $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
        $brush = [Drawing.SolidBrush]::new([Drawing.Color]::Transparent)
        try { $graphics.FillRectangle($brush, 0, 65, 391, $fieldHeight) } finally { $brush.Dispose() }
      } finally {
        $graphics.Dispose()
      }
      $target.Save((Join-Path $assetDir $base.Name), [Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $panel.Dispose()
      $target.Dispose()
    }
}

[pscustomobject]@{
  Battle = Join-Path $approvedSourceDir 'battle-approved-panel.png'
  BattleBase = Join-Path $assetDir 'battle-approved-base.png'
  Result = Join-Path $approvedSourceDir 'result-approved-panel.png'
  ResultBase = Join-Path $assetDir 'result-approved-base.png'
}
