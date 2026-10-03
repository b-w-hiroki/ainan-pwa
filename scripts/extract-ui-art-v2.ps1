param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetDir = Join-Path $Root 'fishing-game/assets/ui-art-v2'
$source = [System.Drawing.Bitmap]::FromFile((Join-Path $assetDir 'system-kit-source.png'))

function Export-Crop {
  param([string]$Name,[int]$X,[int]$Y,[int]$Width,[int]$Height,[int]$TargetWidth,[int]$TargetHeight)
  $output = New-Object System.Drawing.Bitmap $TargetWidth,$TargetHeight,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($output)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($source,(New-Object System.Drawing.Rectangle 0,0,$TargetWidth,$TargetHeight),(New-Object System.Drawing.Rectangle $X,$Y,$Width,$Height),[System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $output.Save((Join-Path $assetDir $Name),[System.Drawing.Imaging.ImageFormat]::Png)
  $output.Dispose()
}

Export-Crop 'panel-large.png' 62 34 760 485 760 485
Export-Crop 'card-idle.png' 885 34 585 104 702 125
Export-Crop 'card-selected.png' 885 145 585 111 702 133
Export-Crop 'card-pressed.png' 885 265 585 105 702 126
Export-Crop 'card-disabled.png' 885 375 585 108 702 130
Export-Crop 'card-shortage.png' 885 488 585 104 702 125
Export-Crop 'dialog.png' 83 530 455 455 455 455
Export-Crop 'chip.png' 570 585 285 108 342 130
Export-Crop 'gauge-track.png' 570 690 700 98 700 98
Export-Crop 'back-shell.png' 1315 665 165 120 165 120
Export-Crop 'operation-dock.png' 565 802 470 175 658 245
Export-Crop 'result-card.png' 1038 800 440 177 616 248
$source.Dispose()
Get-ChildItem $assetDir -Filter '*.png' | Sort-Object Name | Select-Object Name,Length
