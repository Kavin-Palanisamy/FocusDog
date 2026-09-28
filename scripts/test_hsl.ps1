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
    return @{ R = $r; G = $g; B = $b }
}

Write-Output "HSL converter verified."