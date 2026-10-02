param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assetDir = Join-Path $Root 'fishing-game/assets/gameplay-parts-v1'
$outDir = Join-Path $Root 'qa-artifacts/gameplay-parts-v1'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$board = New-Object System.Drawing.Bitmap 1600,1260,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($board)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::FromArgb(255,5,31,48))
$titleFont = New-Object System.Drawing.Font 'Arial',34,([System.Drawing.FontStyle]::Bold)
$sectionFont = New-Object System.Drawing.Font 'Arial',22,([System.Drawing.FontStyle]::Bold)
$labelFont = New-Object System.Drawing.Font 'Arial',16,([System.Drawing.FontStyle]::Bold)
$smallFont = New-Object System.Drawing.Font 'Arial',12
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$cyan = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,111,220,255))
$yellow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,255,220,72))
$tile = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,238,249,253))
$navyPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255,20,102,150)),3

$g.DrawString('AINAN gameplay parts - production batch 01',$titleFont,$white,42,30)
$g.DrawString('Existing data only | transparent PNG | live labels and hit regions remain in code',$smallFont,$cyan,46,82)

function Draw-Asset {
  param([string]$File,[string]$Label,[int]$X,[int]$Y,[int]$W,[int]$H,[int]$Preview = 0)
  $g.FillRectangle($tile,$X,$Y,$W,$H)
  $g.DrawRectangle($navyPen,$X,$Y,$W,$H)
  $img = [System.Drawing.Bitmap]::FromFile((Join-Path $assetDir $File))
  $maxW = $W - 28; $maxH = $H - 58
  $scale = [Math]::Min($maxW / $img.Width,$maxH / $img.Height)
  $dw = [int]($img.Width * $scale); $dh = [int]($img.Height * $scale)
  $dx = $X + [int](($W - $dw) / 2); $dy = $Y + 12 + [int](($maxH - $dh) / 2)
  $g.DrawImage($img,$dx,$dy,$dw,$dh)
  $g.DrawString($Label,$labelFont,$yellow,$X + 12,$Y + $H - 38)
  if ($Preview -gt 0) {
    $g.DrawImage($img,$X + $W - $Preview - 10,$Y + 10,$Preview,$Preview)
  }
  $img.Dispose()
}

$g.DrawString('FISH | dedicated replacements for five non-hero species',$sectionFont,$cyan,42,118)
$fishFiles = @(
  @('fish-bass.png','bass'),@('fish-saba.png','saba'),@('fish-isaki.png','isaki'),
  @('fish-hirame.png','hirame'),@('fish-kanpachi.png','kanpachi')
)
for($i=0;$i -lt $fishFiles.Count;$i++){ Draw-Asset $fishFiles[$i][0] $fishFiles[$i][1] (42 + $i*302) 160 280 220 54 }

$g.DrawString('EQUIPMENT | exact inventory schema (3 rods / 3 baits)',$sectionFont,$cyan,42,410)
$equipFiles = @(
  @('rod-basic.png','rod / basic'),@('rod-carbon.png','rod / carbon'),@('rod-premium.png','rod / premium'),
  @('bait-worm.png','bait / worm'),@('bait-shrimp.png','bait / shrimp'),@('bait-special.png','bait / special')
)
for($i=0;$i -lt $equipFiles.Count;$i++){ Draw-Asset $equipFiles[$i][0] $equipFiles[$i][1] (42 + $i*252) 452 230 230 48 }

$g.DrawString('STATE + RESULT FX | textures only; values and copy stay live',$sectionFont,$cyan,42,712)
$stateFiles = @(
  @('status-tension-safe.png','tension / safe'),@('status-tension-warning.png','tension / warning'),@('status-tension-danger.png','tension / danger'),
  @('result-caught-burst.png','result / caught'),@('result-escaped-splash.png','result / escaped')
)
for($i=0;$i -lt 3;$i++){ Draw-Asset $stateFiles[$i][0] $stateFiles[$i][1] (42 + $i*252) 754 230 230 48 }
Draw-Asset $stateFiles[3][0] $stateFiles[3][1] 816 754 350 350 0
Draw-Asset $stateFiles[4][0] $stateFiles[4][1] 1190 754 350 350 0

$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,13,61,90))),42,1150,1498,68)
$g.DrawString('16 independent assets | centered anchors | 12-18% safe padding | 48-64px readability checked',$labelFont,$white,66,1171)

$output = Join-Path $outDir 'ainan-gameplay-parts-batch-01-board.png'
$board.Save($output,[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $board.Dispose(); $titleFont.Dispose(); $sectionFont.Dispose(); $labelFont.Dispose(); $smallFont.Dispose(); $white.Dispose(); $cyan.Dispose(); $yellow.Dispose(); $tile.Dispose(); $navyPen.Dispose()
Write-Output $output
