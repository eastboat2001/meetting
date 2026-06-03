const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "..", "assets", "app-icon-source.png");
const outputPath = path.join(__dirname, "..", "assets", "app-icon.ico");

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Missing source icon: ${sourcePath}`);
}

function psString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

const script = `
Add-Type -AssemblyName System.Drawing

$sourcePath = ${psString(sourcePath)}
$outputPath = ${psString(outputPath)}
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$originalSource = [System.Drawing.Bitmap]::FromFile($sourcePath)
$source = $null
$entries = New-Object System.Collections.Generic.List[object]

function Test-ForegroundPixel($color) {
  return $color.A -gt 0 -and $color.B -gt 130 -and $color.R -lt 120 -and $color.G -lt 190
}

function Get-RoundedIconRadius($bitmap) {
  $topFirst = $null
  for ($x = 0; $x -lt $bitmap.Width; $x += 1) {
    if (Test-ForegroundPixel $bitmap.GetPixel($x, 0)) {
      $topFirst = $x
      break
    }
  }

  $leftFirst = $null
  for ($y = 0; $y -lt $bitmap.Height; $y += 1) {
    if (Test-ForegroundPixel $bitmap.GetPixel(0, $y)) {
      $leftFirst = $y
      break
    }
  }

  if ($topFirst -eq $null -or $leftFirst -eq $null) {
    return [int]([Math]::Min($bitmap.Width, $bitmap.Height) * 0.19)
  }

  return [int][Math]::Round(($topFirst + $leftFirst) / 2)
}

function New-TransparentRoundedIconSource($bitmap) {
  $radius = Get-RoundedIconRadius $bitmap
  $diameter = [Math]::Max(1, $radius * 2)
  $masked = New-Object System.Drawing.Bitmap($bitmap.Width, $bitmap.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($masked)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $brush = $null

  try {
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $path.AddArc($bitmap.Width - $diameter, 0, $diameter, $diameter, 270, 90)
    $path.AddArc($bitmap.Width - $diameter, $bitmap.Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc(0, $bitmap.Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    $brush = New-Object System.Drawing.TextureBrush($bitmap)
    $graphics.FillPath($brush, $path)
    return $masked
  }
  finally {
    if ($brush -ne $null) {
      $brush.Dispose()
    }
    $path.Dispose()
    $graphics.Dispose()
  }
}

try {
  $source = New-TransparentRoundedIconSource $originalSource

  foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($source, 0, 0, $size, $size)

    $stream = New-Object System.IO.MemoryStream
    $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $entries.Add([pscustomobject]@{
      Size = $size
      Bytes = $stream.ToArray()
    }) | Out-Null

    $stream.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}
finally {
  if ($source -ne $null) {
    $source.Dispose()
  }
  $originalSource.Dispose()
}

$file = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
$writer = New-Object System.IO.BinaryWriter($file)

try {
  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]$entries.Count)

  $offset = 6 + ($entries.Count * 16)
  foreach ($entry in $entries) {
    $dimension = if ($entry.Size -eq 256) { 0 } else { $entry.Size }
    $writer.Write([byte]$dimension)
    $writer.Write([byte]$dimension)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$entry.Bytes.Length)
    $writer.Write([UInt32]$offset)
    $offset += $entry.Bytes.Length
  }

  foreach ($entry in $entries) {
    $writer.Write($entry.Bytes)
  }
}
finally {
  $writer.Dispose()
  $file.Dispose()
}
`;

const result = spawnSync("powershell.exe", [
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  script,
], {
  stdio: "inherit",
});

if (result.status !== 0) {
  throw new Error("Failed to generate Windows icon from PNG source.");
}

console.log(`Generated ${outputPath} from ${sourcePath}`);
