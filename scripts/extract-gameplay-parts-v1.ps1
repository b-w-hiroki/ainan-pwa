param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
public static class AlphaTools {
  public static void KeepLargest(string path, byte threshold) {
    Bitmap source = new Bitmap(path);
    Bitmap bitmap = new Bitmap(source);
    source.Dispose();
    int w = bitmap.Width, h = bitmap.Height;
    var visible = new bool[w * h];
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) visible[y*w+x] = bitmap.GetPixel(x,y).A >= threshold;
    var seen = new bool[w * h];
    List<int> largest = new List<int>();
    int[] dx = {1,-1,0,0}, dy = {0,0,1,-1};
    for (int start = 0; start < visible.Length; start++) {
      if (!visible[start] || seen[start]) continue;
      var component = new List<int>();
      var queue = new Queue<int>(); queue.Enqueue(start); seen[start] = true;
      while (queue.Count > 0) {
        int p = queue.Dequeue(); component.Add(p); int px = p % w, py = p / w;
        for (int d = 0; d < 4; d++) { int nx=px+dx[d], ny=py+dy[d]; if(nx<0||ny<0||nx>=w||ny>=h) continue; int n=ny*w+nx; if(visible[n]&&!seen[n]){seen[n]=true;queue.Enqueue(n);} }
      }
      if (component.Count > largest.Count) largest = component;
    }
    var keep = new bool[w*h]; foreach (int p in largest) keep[p] = true;
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) if (!keep[y*w+x]) bitmap.SetPixel(x,y,Color.Transparent);
    bitmap.Save(path,System.Drawing.Imaging.ImageFormat.Png); bitmap.Dispose();
  }
}
'@

$assetDir = Join-Path $Root 'fishing-game/assets/gameplay-parts-v1'
$sourceDir = Join-Path $Root 'qa-artifacts/gameplay-parts-v1/source'
$fish = [System.Drawing.Bitmap]::FromFile((Join-Path $sourceDir 'fish-source.png'))
$equipment = [System.Drawing.Bitmap]::FromFile((Join-Path $sourceDir 'equipment-source.png'))
$state = [System.Drawing.Bitmap]::FromFile((Join-Path $sourceDir 'state-result-source.png'))

function Export-Cell {
  param(
    [System.Drawing.Bitmap]$Source,
    [string]$Name,
    [int]$X,[int]$Y,[int]$Width,[int]$Height,
    [int]$TargetWidth,[int]$TargetHeight,[int]$Padding = 18
  )

  $left = $Width; $top = $Height; $right = -1; $bottom = -1
  for ($py = 0; $py -lt $Height; $py += 2) {
    for ($px = 0; $px -lt $Width; $px += 2) {
      if ($Source.GetPixel($X + $px, $Y + $py).A -ge 24) {
        if ($px -lt $left) { $left = $px }
        if ($py -lt $top) { $top = $py }
        if ($px -gt $right) { $right = $px }
        if ($py -gt $bottom) { $bottom = $py }
      }
    }
  }
  if ($right -lt 0) { throw "No visible pixels found for $Name" }

  $left = [Math]::Max(0, $left - 8); $top = [Math]::Max(0, $top - 8)
  $right = [Math]::Min($Width - 1, $right + 8); $bottom = [Math]::Min($Height - 1, $bottom + 8)
  $cropWidth = $right - $left + 1; $cropHeight = $bottom - $top + 1
  $scale = [Math]::Min(($TargetWidth - 2 * $Padding) / $cropWidth, ($TargetHeight - 2 * $Padding) / $cropHeight)
  $drawWidth = [int][Math]::Round($cropWidth * $scale)
  $drawHeight = [int][Math]::Round($cropHeight * $scale)
  $drawX = [int][Math]::Round(($TargetWidth - $drawWidth) / 2)
  $drawY = [int][Math]::Round(($TargetHeight - $drawHeight) / 2)

  $output = New-Object System.Drawing.Bitmap $TargetWidth,$TargetHeight,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($output)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($Source,
    (New-Object System.Drawing.Rectangle $drawX,$drawY,$drawWidth,$drawHeight),
    (New-Object System.Drawing.Rectangle ($X + $left),($Y + $top),$cropWidth,$cropHeight),
    [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $output.Save((Join-Path $assetDir $Name),[System.Drawing.Imaging.ImageFormat]::Png)
  $output.Dispose()
}

# Five fish that do not already have dedicated hero art.
Export-Cell $fish 'fish-bass.png' 0 0 512 512 384 256 16
Export-Cell $fish 'fish-saba.png' 512 0 512 512 384 256 16
Export-Cell $fish 'fish-isaki.png' 1024 0 512 512 384 256 16
Export-Cell $fish 'fish-hirame.png' 0 512 512 512 384 256 16
Export-Cell $fish 'fish-kanpachi.png' 512 512 512 512 384 256 16

# Existing inventory schema: three rods and three baits.
Export-Cell $equipment 'rod-basic.png' 0 0 418 627 256 256 15
Export-Cell $equipment 'rod-carbon.png' 418 0 418 627 256 256 15
Export-Cell $equipment 'rod-premium.png' 836 0 418 627 256 256 15
Export-Cell $equipment 'bait-worm.png' 0 627 418 627 256 256 18
Export-Cell $equipment 'bait-shrimp.png' 418 627 418 627 256 256 18
Export-Cell $equipment 'bait-special.png' 836 627 418 627 256 256 18

@('fish-bass.png','fish-saba.png','fish-isaki.png','fish-hirame.png','fish-kanpachi.png',
  'rod-basic.png','rod-carbon.png','rod-premium.png','bait-worm.png','bait-shrimp.png','bait-special.png') |
  ForEach-Object { [AlphaTools]::KeepLargest((Join-Path $assetDir $_),48) }

# Remove a neighboring-cell tip that touches the premium source crop boundary.
$premiumPath = Join-Path $assetDir 'rod-premium.png'
$premium = [System.Drawing.Bitmap]::FromFile($premiumPath)
$clean = New-Object System.Drawing.Bitmap $premium.Width,$premium.Height,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cleanGraphics = [System.Drawing.Graphics]::FromImage($clean)
$cleanGraphics.DrawImageUnscaled($premium,0,0)
$cleanGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$cleanGraphics.FillRectangle([System.Drawing.Brushes]::Transparent,0,0,36,54)
$cleanGraphics.Dispose(); $premium.Dispose()
$clean.Save($premiumPath,[System.Drawing.Imaging.ImageFormat]::Png); $clean.Dispose()

# Real battle/result states; labels and hit regions remain live in code.
Export-Cell $state 'status-tension-safe.png' 0 0 512 512 192 192 14
Export-Cell $state 'status-tension-warning.png' 512 0 512 512 192 192 14
Export-Cell $state 'status-tension-danger.png' 1024 0 512 512 192 192 14
Export-Cell $state 'result-caught-burst.png' 0 512 512 512 512 512 20
Export-Cell $state 'result-escaped-splash.png' 512 512 512 512 512 512 20

function Clear-Region([string]$Name,[int]$X,[int]$Y,[int]$Width,[int]$Height) {
  $path = Join-Path $assetDir $Name
  $input = [System.Drawing.Bitmap]::FromFile($path)
  $output = New-Object System.Drawing.Bitmap $input.Width,$input.Height,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($output)
  $graphics.DrawImageUnscaled($input,0,0)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.FillRectangle([System.Drawing.Brushes]::Transparent,$X,$Y,$Width,$Height)
  $graphics.Dispose(); $input.Dispose()
  $output.Save($path,[System.Drawing.Imaging.ImageFormat]::Png); $output.Dispose()
}
Clear-Region 'status-tension-safe.png' 0 170 192 22
Clear-Region 'status-tension-warning.png' 0 170 192 22
Clear-Region 'result-escaped-splash.png' 0 0 18 512

$fish.Dispose(); $equipment.Dispose(); $state.Dispose()
Get-ChildItem $assetDir -Filter '*.png' | Sort-Object Name | Select-Object Name,Length
