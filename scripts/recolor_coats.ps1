Add-Type -AssemblyName System.Drawing

function RGBtoHSL($r, $g, $b) {
    $r = $r / 255.0; $g = $g / 255.0; $b = $b / 255.0
    $max = [Math]::Max($r, [Math]::Max($g, $b))
    $min = [Math]::Min($r, [Math]::Min($g, $b))
    $delta = $max - $min
    $l = ($max + $min) / 2.0
    $s = 0.0
    $h = 0.0
    if ($delta -gt 0.0001) {
        $s = if ($l -le 0.5) { $delta / ($max + $min) } else { $delta / (2.0 - $max - $min) }
        if ($r -eq $max) {
            $h = (($g - $b) / $delta)
            if ($g -lt $b) { $h += 6.0 }
        } elseif ($g -eq $max) {
            $h = (($b - $r) / $delta) + 2.0
        } else {
            $h = (($r - $g) / $delta) + 4.0
        }
        $h *= 60.0
    }
    return @{ H = $h; S = $s; L = $l }
}

function HSLtoRGB($h, $s, $l) {
    if ($s -le 0.001) {
        $v = [int]($l * 255)
        return @{ R = $v; G = $v; B = $v }
    }
    $q = if ($l -lt 0.5) { $l * (1.0 + $s) } else { $l + $s - ($l * $s) }
    $p = 2.0 * $l - $q
    $hk = $h / 360.0
    $tr = $hk + 1.0/3.0; $tg = $hk; $tb = $hk - 1.0/3.0
    
    $convert = {
        param($tc)
        if ($tc -lt 0.0) { $tc += 1.0 }
        if ($tc -gt 1.0) { $tc -= 1.0 }
        if ($tc -lt 1.0/6.0) { return $p + (($q - $p) * 6.0 * $tc) }
        if ($tc -lt 1.0/2.0) { return $q }
        if ($tc -lt 2.0/3.0) { return $p + (($q - $p) * 6.0 * (2.0/3.0 - $tc)) }
        return $p
    }
    
    $r = [int]([Math]::Max(0, [Math]::Min(255, (& $convert $tr) * 255)))
    $g = [int]([Math]::Max(0, [Math]::Min(255, (& $convert $tg) * 255)))
    $b = [int]([Math]::Max(0, [Math]::Min(255, (& $convert $tb) * 255)))
    return @{ R = $r; G = $v; B = $b }
}

function RecolorCoat([string]$srcDir, [string]$dstDir, [string]$targetCoat) {
    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
    }

    $files = Get-ChildItem -Path $srcDir -Recurse -Filter "*.png"
    Write-Output "Recoloring $($files.Count) sprites from $srcDir to $dstDir ($targetCoat)..."

    foreach ($file in $files) {
        $relPath = $file.FullName.Substring($srcDir.Length).TrimStart("\/")
        $outPath = Join-Path $dstDir $relPath
        $outSubdir = [System.IO.Path]::GetDirectoryName($outPath)
        if (-not (Test-Path $outSubdir)) {
            New-Item -ItemType Directory -Path $outSubdir -Force | Out-Null
        }

        $srcBmp = [System.Drawing.Bitmap]::FromFile($file.FullName)
        $w = $srcBmp.Width; $h = $srcBmp.Height
        $dstBmp = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

        for ($y = 0; $y -lt $h; $y++) {
            for ($x = 0; $x -lt $w; $x++) {
                $col = $srcBmp.GetPixel($x, $y)
                if ($col.A -le 10) {
                    $dstBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                    continue
                }

                $hsl = RGBtoHSL $col.R $col.G $col.B
                $nH = $hsl.H; $nS = $hsl.S; $nL = $hsl.L

                $isLineartOrDark = $hsl.L -lt 0.22
                $isCollarRed = ($hsl.H -lt 22 -or $hsl.H -gt 338) -and $hsl.S -gt 0.38 -and $hsl.L -gt 0.22 -and $hsl.L -lt 0.72
                $isBellGold = $hsl.H -ge 35 -and $hsl.H -le 58 -and $hsl.S -gt 0.55 -and $hsl.L -gt 0.40 -and $hsl.L -lt 0.85
                $isFur = -not $isLineartOrDark -and -not $isCollarRed -and -not $isBellGold

                if ($targetCoat -eq "white") {
                    if ($isCollarRed) {
                        # Royal blue collar (#2563EB)
                        $nH = 218.0; $nS = [Math]::Min(0.85, $hsl.S * 1.1)
                    } elseif ($isFur) {
                        # Silver-white fur with soft shading
                        $nS = $hsl.S * 0.12
                        $nL = [Math]::Min(0.98, $hsl.L * 0.25 + 0.72)
                    }
                } elseif ($targetCoat -eq "black") {
                    if ($isCollarRed) {
                        # Emerald green collar (#10B981)
                        $nH = 155.0; $nS = 0.85
                    } elseif ($isFur) {
                        # Charcoal black with tan muzzle markings
                        # Check if muzzle/chest area
                        if ($x -gt ($w * 0.55) -and $y -gt ($h * 0.42) -and $y -lt ($h * 0.65) -and $hsl.S -gt 0.25) {
                            # Warm tan muzzle
                            $nH = 32.0; $nS = 0.52; $nL = 0.55
                        } else {
                            # Midnight charcoal
                            $nS = $hsl.S * 0.15
                            $nL = [Math]::Max(0.08, [Math]::Min(0.32, $hsl.L * 0.24 + 0.08))
                        }
                    }
                }

                $rgb = HSLtoRGB $nH $nS $nL
                $dstBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($col.A, $rgb.R, $rgb.G, $rgb.B))
            }
        }

        $srcBmp.Dispose()
        $dstBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $dstBmp.Dispose()
    }
    Write-Output "Recolored $targetCoat successfully."
}

$creamDir = "C:\Users\kavin\Documents\FocusDog\public\dog\cream"
$whiteDir = "C:\Users\kavin\Documents\FocusDog\public\dog\white"
$blackDir = "C:\Users\kavin\Documents\FocusDog\public\dog\black"

RecolorCoat $creamDir $whiteDir "white"
RecolorCoat $creamDir $blackDir "black"
Write-Output "All coats processed."