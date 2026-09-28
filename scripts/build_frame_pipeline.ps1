Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\kavin\.gemini\antigravity-ide\brain\7e457338-754a-42aa-a546-9be1b1663e33"
$baseDir = "C:\Users\kavin\Documents\FocusDog\public\dog"
$charSheetPath = Join-Path $brainDir "dog_character_sheet_1789895663466.jpg"
$walkSheetPath = Join-Path $brainDir "dog_walk_cycle_spritesheet_1789895764839.jpg"
$actionSheetPath = Join-Path $brainDir "dog_actions_sheet_1789895800697.jpg"

function RemoveWhiteBackground([System.Drawing.Bitmap]$bmp) {
    $w = $bmp.Width; $h = $bmp.Height
    $clean = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $col = $bmp.GetPixel($x, $y)
            $brightness = ($col.R + $col.G + $col.B) / 3.0
            $colorDiff = [Math]::Max([Math]::Abs($col.R - $col.G), [Math]::Max([Math]::Abs($col.R - $col.B), [Math]::Abs($col.G - $col.B)))
            
            if ($brightness -gt 244 -and $colorDiff -lt 10) {
                $clean.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            } elseif ($brightness -gt 228 -and $colorDiff -lt 14) {
                $alpha = [int]([Math]::Max(0, [Math]::Min(255, (244 - $brightness) / 16.0 * 255)))
                $clean.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $col.R, $col.G, $col.B))
            } else {
                $clean.SetPixel($x, $y, $col)
            }
        }
    }
    return $clean
}

function GetBoundingBox([System.Drawing.Bitmap]$cleanBmp) {
    $w = $cleanBmp.Width; $h = $cleanBmp.Height
    $minX = $w; $maxX = 0; $minY = $h; $maxY = 0
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            if ($cleanBmp.GetPixel($x, $y).A -gt 15) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($minX -ge $maxX -or $minY -ge $maxY) {
        return [System.Drawing.Rectangle]::new(0, 0, $w, $h)
    }
    return [System.Drawing.Rectangle]::new($minX, $minY, $maxX - $minX + 1, $maxY - $minY + 1)
}

function FitToCanvas([System.Drawing.Bitmap]$cleanBmp, [System.Drawing.Rectangle]$bbox, [int]$targetW, [int]$targetH, [int]$groundY, [double]$scaleH = 125.0, [double]$extraX = 0, [double]$extraY = 0, [double]$scaleXMult = 1.0, [double]$scaleYMult = 1.0) {
    $finalBmp = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($finalBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $baseScale = [Math]::Min(1.1, $scaleH / [Math]::Max(1, $bbox.Height))
    $scaledW = [int]($bbox.Width * $baseScale * $scaleXMult)
    $scaledH = [int]($bbox.Height * $baseScale * $scaleYMult)

    $destX = [int](($targetW - $scaledW) / 2.0 + $extraX)
    $destY = [int]($groundY - $scaledH + $extraY)

    $destRect = [System.Drawing.Rectangle]::new($destX, $destY, $scaledW, $scaledH)
    $g.DrawImage($cleanBmp, $destRect, $bbox, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    return $finalBmp
}

Write-Output "Core raster utilities loaded."