param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $Root 'qa-artifacts/gameplay-parts-v1'
$beforeDir = Join-Path $Root 'qa-artifacts/ui-art-system-v2/after'
$afterDir = Join-Path $outDir 'after'
$board = New-Object System.Drawing.Bitmap 1500,1960,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($board)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::FromArgb(255,5,31,48))
$titleFont = New-Object System.Drawing.Font 'Arial',32,([System.Drawing.FontStyle]::Bold)
$labelFont = New-Object System.Drawing.Font 'Arial',17,([System.Drawing.FontStyle]::Bold)
$smallFont = New-Object System.Drawing.Font 'Arial',12
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$cyan = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,111,220,255))
$yellow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,255,220,72))
$panel = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,10,49,73))
$border = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255,55,145,190)),3

$g.DrawString('AINAN gameplay parts batch 01 - actual browser screens',$titleFont,$white,38,28)
$g.DrawString('Old vector inventory art to generated parts | battle state | caught and escaped result FX',$smallFont,$cyan,42,78)

function Draw-Screen([string]$Path,[string]$Label,[int]$X,[int]$Y) {
  $g.FillRectangle($panel,$X,$Y,440,850)
  $g.DrawRectangle($border,$X,$Y,440,850)
  $img = [System.Drawing.Bitmap]::FromFile($Path)
  $scale = [Math]::Min(410 / $img.Width,790 / $img.Height)
  $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)
  $dx = $X + [int]((440 - $w) / 2); $dy = $Y + 16 + [int]((790 - $h) / 2)
  $g.DrawImage($img,$dx,$dy,$w,$h)
  $g.DrawString($Label,$labelFont,$yellow,$X + 16,$Y + 810)
  $img.Dispose()
}

Draw-Screen (Join-Path $beforeDir 'upgrade-portrait.png') 'BEFORE EQUIPMENT' 38 112
Draw-Screen (Join-Path $afterDir 'equipment-portrait.png') 'AFTER EQUIPMENT' 530 112
Draw-Screen (Join-Path $afterDir 'battle-danger-portrait.png') 'BATTLE / DANGER' 1022 112
Draw-Screen (Join-Path $beforeDir 'result-caught-portrait.png') 'BEFORE RESULT' 38 1000
Draw-Screen (Join-Path $afterDir 'result-caught-kanpachi-portrait.png') 'AFTER / CAUGHT' 530 1000
Draw-Screen (Join-Path $afterDir 'result-escaped-saba-portrait.png') 'AFTER / ESCAPED' 1022 1000

$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,13,61,90))),38,1880,1424,52)
$g.DrawString('390x844 captures | 375x667 and 844x390 fit checks passed | gameplay and live copy unchanged',$smallFont,$white,58,1897)

$output = Join-Path $outDir 'ainan-gameplay-parts-batch-01-before-after.png'
$board.Save($output,[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $board.Dispose(); $titleFont.Dispose(); $labelFont.Dispose(); $smallFont.Dispose(); $white.Dispose(); $cyan.Dispose(); $yellow.Dispose(); $panel.Dispose(); $border.Dispose()
Write-Output $output
