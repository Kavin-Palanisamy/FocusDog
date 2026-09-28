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
            
            if ($brightness -gt 242 -and $colorDiff -lt 12) {
                $clean.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            } elseif ($brightness -gt 224 -and $colorDiff -lt 16) {
                $alpha = [int]([Math]::Max(0, [Math]::Min(255, (242 - $brightness) / 18.0 * 255)))
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

function CreateFramedSprite(
    [System.Drawing.Bitmap]$cleanBmp,
    [System.Drawing.Rectangle]$bbox,
    [int]$targetW = 220,
    [int]$targetH = 220,
    [int]$groundY = 190,
    [double]$scaleH = 125.0,
    [double]$extraX = 0,
    [double]$extraY = 0,
    [double]$scaleXMult = 1.0,
    [double]$scaleYMult = 1.0,
    [double]$rotationDeg = 0,
    [bool]$addBlink = $false
) {
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

    if ([Math]::Abs($rotationDeg) -gt 0.01) {
        $cx = $destX + $scaledW / 2.0
        $cy = $destY + $scaledH / 2.0
        $g.TranslateTransform($cx, $cy)
        $g.RotateTransform($rotationDeg)
        $g.TranslateTransform(-$cx, -$cy)
    }

    $destRect = [System.Drawing.Rectangle]::new($destX, $destY, $scaledW, $scaledH)
    $g.DrawImage($cleanBmp, $destRect, $bbox, [System.Drawing.GraphicsUnit]::Pixel)

    if ($addBlink) {
        # Draw soft curved eyelid over eye area
        $eyePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(230, 42, 29, 23), 2.5)
        $g.DrawArc($eyePen, [int]($destX + $scaledW * 0.42), [int]($destY + $scaledH * 0.23), 14, 10, 200, 140)
        $eyePen.Dispose()
    }

    $g.Dispose()
    return $finalBmp
}

# 1. Master Sheet Processing
Write-Output "Step 1: Extracting master poses..."

$charImg = [System.Drawing.Bitmap]::FromFile($charSheetPath)
$csw = $charImg.Width; $csh = $charImg.Height

$cropStand = $charImg.Clone([System.Drawing.Rectangle]::new([int]($csw*0.04), [int]($csh*0.11), [int]($csw*0.44), [int]($csh*0.38)), $charImg.PixelFormat)
$cleanStand = RemoveWhiteBackground $cropStand
$bboxStand = GetBoundingBox $cleanStand

$cropWalkPose = $charImg.Clone([System.Drawing.Rectangle]::new([int]($csw*0.51), [int]($csh*0.11), [int]($csw*0.45), [int]($csh*0.38)), $charImg.PixelFormat)
$cleanWalkPose = RemoveWhiteBackground $cropWalkPose
$bboxWalkPose = GetBoundingBox $cleanWalkPose

$cropSit = $charImg.Clone([System.Drawing.Rectangle]::new([int]($csw*0.06), [int]($csh*0.53), [int]($csw*0.42), [int]($csh*0.42)), $charImg.PixelFormat)
$cleanSit = RemoveWhiteBackground $cropSit
$bboxSit = GetBoundingBox $cleanSit

$cropSleep = $charImg.Clone([System.Drawing.Rectangle]::new([int]($csw*0.48), [int]($csh*0.70), [int]($csw*0.48), [int]($csh*0.25)), $charImg.PixelFormat)
$cleanSleep = RemoveWhiteBackground $cropSleep
$bboxSleep = GetBoundingBox $cleanSleep

$charImg.Dispose()

# 2. Walk Cycle 8 Frames
Write-Output "Step 2: Extracting 8 walk cycle frames..."
$walkImg = [System.Drawing.Bitmap]::FromFile($walkSheetPath)
$wsw = $walkImg.Width; $wsh = $walkImg.Height
$cellW = $wsw / 2.0; $cellH = $wsh / 4.0

$walkBmps = @()
for ($i = 0; $i -lt 8; $i++) {
    $row = [Math]::Floor($i / 2.0)
    $col = $i % 2
    $rx = [int]($col * $cellW + $cellW * 0.04)
    $ry = [int]($row * $cellH + $cellH * 0.04)
    $rw = [int]($cellW * 0.92)
    $rh = [int]($cellH * 0.92)

    $crop = $walkImg.Clone([System.Drawing.Rectangle]::new($rx, $ry, $rw, $rh), $walkImg.PixelFormat)
    $clean = RemoveWhiteBackground $crop
    $bbox = GetBoundingBox $clean
    $walkBmps += @{ Clean = $clean; BBox = $bbox }
    $crop.Dispose()
}
$walkImg.Dispose()

# 3. Action Sheet 8 Poses
Write-Output "Step 3: Extracting 8 action poses..."
$actImg = [System.Drawing.Bitmap]::FromFile($actionSheetPath)
$asw = $actImg.Width; $ash = $actImg.Height
$acellW = $asw / 4.0; $acellH = $ash / 2.0
$actNames = @("stretch", "sniff", "scratch", "yawn", "jump", "roll", "dragged", "landing")

$actDict = @{}
for ($i = 0; $i -lt 8; $i++) {
    $row = [Math]::Floor($i / 4.0)
    $col = $i % 4
    $name = $actNames[$i]
    $rx = [int]($col * $acellW + $acellW * 0.03)
    $ry = [int]($row * $acellH + $acellH * 0.12)
    $rw = [int]($acellW * 0.94)
    $rh = [int]($acellH * 0.78)

    $crop = $actImg.Clone([System.Drawing.Rectangle]::new($rx, $ry, $rw, $rh), $actImg.PixelFormat)
    $clean = RemoveWhiteBackground $crop
    $bbox = GetBoundingBox $clean
    $actDict[$name] = @{ Clean = $clean; BBox = $bbox }
    $crop.Dispose()
}
$actImg.Dispose()

Write-Output "Master assets ready. Slicing animation sequences for Cream coat..."

$creamDir = Join-Path $baseDir "cream"

# Helper save function
function SaveFrame([System.Drawing.Bitmap]$bmp, [string]$folder, [string]$filename) {
    $p = Join-Path $creamDir (Join-Path $folder $filename)
    $dir = [System.IO.Path]::GetDirectoryName($p)
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# --- 1. WALK (8 frames) ---
for ($i = 0; $i -lt 8; $i++) {
    $f = CreateFramedSprite $walkBmps[$i].Clean $walkBmps[$i].BBox 220 220 190 125.0
    SaveFrame $f "walk" "walk_$i.png"
}

# --- 2. WALK-START (3 frames) ---
$ws0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.0 1.0 2.0
SaveFrame $ws0 "walk-start" "walk_start_0.png"
$ws1 = CreateFramedSprite $cleanWalkPose $bboxWalkPose 220 220 190 125.0 0 0 0.98 1.01
SaveFrame $ws1 "walk-start" "walk_start_1.png"
$ws2 = CreateFramedSprite $walkBmps[0].Clean $walkBmps[0].BBox 220 220 190 125.0
SaveFrame $ws2 "walk-start" "walk_start_2.png"

# --- 3. WALK-STOP (3 frames) ---
$wstop0 = CreateFramedSprite $walkBmps[7].Clean $walkBmps[7].BBox 220 220 190 125.0
SaveFrame $wstop0 "walk-stop" "walk_stop_0.png"
$wstop1 = CreateFramedSprite $cleanWalkPose $bboxWalkPose 220 220 190 125.0 0 0 1.02 0.98
SaveFrame $wstop1 "walk-stop" "walk_stop_1.png"
$wstop2 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $wstop2 "walk-stop" "walk_stop_2.png"

# --- 4. IDLE (6 frames: subtle breathing + blink) ---
# Frame 0: Neutral stand
$id0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $id0 "idle" "idle_0.png"
# Frame 1: Inhale start (chest slight rise)
$id1 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.01 1.015
SaveFrame $id1 "idle" "idle_1.png"
# Frame 2: Inhale peak (chest full expansion)
$id2 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.02 1.03
SaveFrame $id2 "idle" "idle_2.png"
# Frame 3: Exhale (relaxing)
$id3 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.01 1.015
SaveFrame $id3 "idle" "idle_3.png"
# Frame 4: Blink (happy closed eyelid)
$id4 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.0 1.0 0.0 $true
SaveFrame $id4 "idle" "idle_4.png"
# Frame 5: Return to neutral
$id5 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.005 1.005
SaveFrame $id5 "idle" "idle_5.png"

# --- 5. SIT (5 frames: stand -> sit transition) ---
$s0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $s0 "sit" "sit_0.png"
# Crouch anticipation: rear lowers
$s1 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 -2 0 1.04 0.94 -3.0
SaveFrame $s1 "sit" "sit_1.png"
# Mid-sit transition
$s2 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0 -2 0 1.02 0.96 -5.0
SaveFrame $s2 "sit" "sit_2.png"
# Pre-sit contact
$s3 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0 -1 0 1.01 0.98 -2.0
SaveFrame $s3 "sit" "sit_3.png"
# Fully seated
$s4 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0
SaveFrame $s4 "sit" "sit_4.png"

# --- 6. SIT-IDLE (4 frames: sitting breathing) ---
$si0 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0
SaveFrame $si0 "sit_idle" "sit_idle_0.png"
$si1 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0 0 0 1.01 1.02
SaveFrame $si1 "sit_idle" "sit_idle_1.png"
$si2 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0 0 0 1.0 1.0 0.0 $true
SaveFrame $si2 "sit_idle" "sit_idle_2.png"
$si3 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0 0 0 1.005 1.01
SaveFrame $si3 "sit_idle" "sit_idle_3.png"

# --- 7. STAND-UP (4 frames: sit -> stand transition) ---
$su0 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0
SaveFrame $su0 "stand_up" "stand_up_0.png"
$su1 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0 2 0 0.98 1.04 4.0
SaveFrame $su1 "stand_up" "stand_up_1.png"
$su2 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 1 0 1.02 0.96
SaveFrame $su2 "stand_up" "stand_up_2.png"
$su3 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $su3 "stand_up" "stand_up_3.png"

# --- 8. SLEEP (6 frames: gentle breathing slumber) ---
$sl0 = CreateFramedSprite $cleanSleep $bboxSleep 220 220 190 100.0
SaveFrame $sl0 "sleep" "sleep_0.png"
$sl1 = CreateFramedSprite $cleanSleep $bboxSleep 220 220 190 100.0 0 0 1.01 1.025
SaveFrame $sl1 "sleep" "sleep_1.png"
$sl2 = CreateFramedSprite $cleanSleep $bboxSleep 220 220 190 100.0 0 0 1.02 1.05
SaveFrame $sl2 "sleep" "sleep_2.png"
$sl3 = CreateFramedSprite $cleanSleep $bboxSleep 220 220 190 100.0 0 0 1.015 1.03
SaveFrame $sl3 "sleep" "sleep_3.png"
$sl4 = CreateFramedSprite $cleanSleep $bboxSleep 220 220 190 100.0 0 0 1.005 1.01
SaveFrame $sl4 "sleep" "sleep_4.png"
$sl5 = CreateFramedSprite $cleanSleep $bboxSleep 220 220 190 100.0 0 0 1.0 1.0
SaveFrame $sl5 "sleep" "sleep_5.png"

# --- 9. WAKE (6 frames: sleep -> wake -> stand) ---
$wk0 = CreateFramedSprite $cleanSleep $bboxSleep 220 220 190 100.0
SaveFrame $wk0 "wake" "wake_0.png"
$wk1 = CreateFramedSprite $cleanSleep $bboxSleep 220 220 190 100.0 0 0 1.02 1.04 2.0
SaveFrame $wk1 "wake" "wake_1.png"
$wk2 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0 0 0 1.04 0.92 -6.0
SaveFrame $wk2 "wake" "wake_2.png"
$wk3 = CreateFramedSprite $actDict["yawn"].Clean $actDict["yawn"].BBox 220 220 190 125.0
SaveFrame $wk3 "wake" "wake_3.png"
$wk4 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.02 0.98
SaveFrame $wk4 "wake" "wake_4.png"
$wk5 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $wk5 "wake" "wake_5.png"

# --- 10. STRETCH (6 frames: downward stretch sequence) ---
$st0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $st0 "stretch" "stretch_0.png"
$st1 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 3 0 1.06 0.92 6.0
SaveFrame $st1 "stretch" "stretch_1.png"
$st2 = CreateFramedSprite $actDict["stretch"].Clean $actDict["stretch"].BBox 220 220 190 115.0
SaveFrame $st2 "stretch" "stretch_2.png"
$st3 = CreateFramedSprite $actDict["stretch"].Clean $actDict["stretch"].BBox 220 220 190 115.0 2 0 1.02 1.02
SaveFrame $st3 "stretch" "stretch_3.png"
$st4 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 2 0 1.04 0.95 4.0
SaveFrame $st4 "stretch" "stretch_4.png"
$st5 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $st5 "stretch" "stretch_5.png"

# --- 11. JUMP (8 frames: anticipation -> crouch -> push-off -> peak -> landing squash -> recover) ---
$jp0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $jp0 "jump" "jump_0.png"
# Spring crouch (squashed down -12px)
$jp1 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.15 0.82
SaveFrame $jp1 "jump" "jump_1.png"
# Push-off
$jp2 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 0.92 1.14 -4.0
SaveFrame $jp2 "jump" "jump_2.png"
# Airborne ascending (elevated +16px)
$jp3 = CreateFramedSprite $actDict["jump"].Clean $actDict["jump"].BBox 220 220 174 125.0 0 0 0.96 1.08
SaveFrame $jp3 "jump" "jump_3.png"
# Peak apex leap (elevated +28px)
$jp4 = CreateFramedSprite $actDict["jump"].Clean $actDict["jump"].BBox 220 220 162 125.0 0 0 1.0 1.0
SaveFrame $jp4 "jump" "jump_4.png"
# Descent (elevated +12px)
$jp5 = CreateFramedSprite $actDict["jump"].Clean $actDict["jump"].BBox 220 220 178 125.0 0 0 0.98 1.04
SaveFrame $jp5 "jump" "jump_5.png"
# Landing impact squash
$jp6 = CreateFramedSprite $actDict["landing"].Clean $actDict["landing"].BBox 220 220 190 90.0
SaveFrame $jp6 "jump" "jump_6.png"
# Recovery
$jp7 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.05 0.95
SaveFrame $jp7 "jump" "jump_7.png"

# --- 12. ROLL (8 frames: belly-up roll sequence) ---
$ro0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.08 0.92
SaveFrame $ro0 "roll" "roll_0.png"
$ro1 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 -4 0 1.12 0.86 -12.0
SaveFrame $ro1 "roll" "roll_1.png"
$ro2 = CreateFramedSprite $actDict["roll"].Clean $actDict["roll"].BBox 220 220 190 110.0 -6 0 1.02 0.98 -18.0
SaveFrame $ro2 "roll" "roll_2.png"
# Full belly-up roll
$ro3 = CreateFramedSprite $actDict["roll"].Clean $actDict["roll"].BBox 220 220 190 110.0
SaveFrame $ro3 "roll" "roll_3.png"
# Playful belly wiggle
$ro4 = CreateFramedSprite $actDict["roll"].Clean $actDict["roll"].BBox 220 220 190 110.0 4 0 0.98 1.02 8.0
SaveFrame $ro4 "roll" "roll_4.png"
# Rolling over
$ro5 = CreateFramedSprite $actDict["roll"].Clean $actDict["roll"].BBox 220 220 190 110.0 6 0 1.02 0.96 18.0
SaveFrame $ro5 "roll" "roll_5.png"
# Pushing up
$ro6 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 3 0 1.10 0.90 10.0
SaveFrame $ro6 "roll" "roll_6.png"
$ro7 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $ro7 "roll" "roll_7.png"

# --- 13. SNIFF (6 frames: sniffing ground line) ---
$sn0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $sn0 "sniff" "sniff_0.png"
$sn1 = CreateFramedSprite $actDict["sniff"].Clean $actDict["sniff"].BBox 220 220 190 120.0
SaveFrame $sn1 "sniff" "sniff_1.png"
$sn2 = CreateFramedSprite $actDict["sniff"].Clean $actDict["sniff"].BBox 220 220 190 120.0 -5 0 1.01 0.99
SaveFrame $sn2 "sniff" "sniff_2.png"
$sn3 = CreateFramedSprite $actDict["sniff"].Clean $actDict["sniff"].BBox 220 220 190 120.0 5 0 1.01 0.99
SaveFrame $sn3 "sniff" "sniff_3.png"
$sn4 = CreateFramedSprite $actDict["sniff"].Clean $actDict["sniff"].BBox 220 220 190 120.0 0 0 1.02 1.01
SaveFrame $sn4 "sniff" "sniff_4.png"
$sn5 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $sn5 "sniff" "sniff_5.png"

# --- 14. SCRATCH (6 frames: ear scratching) ---
$sc0 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0
SaveFrame $sc0 "scratch" "scratch_0.png"
$sc1 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0 2 0 1.02 0.98 4.0
SaveFrame $sc1 "scratch" "scratch_1.png"
$sc2 = CreateFramedSprite $actDict["scratch"].Clean $actDict["scratch"].BBox 220 220 190 125.0
SaveFrame $sc2 "scratch" "scratch_2.png"
$sc3 = CreateFramedSprite $actDict["scratch"].Clean $actDict["scratch"].BBox 220 220 190 125.0 -2 0 0.98 1.02 -4.0
SaveFrame $sc3 "scratch" "scratch_3.png"
$sc4 = CreateFramedSprite $actDict["scratch"].Clean $actDict["scratch"].BBox 220 220 190 125.0 2 0 1.02 0.98 3.0
SaveFrame $sc4 "scratch" "scratch_4.png"
$sc5 = CreateFramedSprite $cleanSit $bboxSit 220 220 190 125.0
SaveFrame $sc5 "scratch" "scratch_5.png"

# --- 15. SHAKE (6 frames: full-body shake) ---
$sh0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $sh0 "shake" "shake_0.png"
$sh1 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 -4 0 0.96 1.04 -7.0
SaveFrame $sh1 "shake" "shake_1.png"
$sh2 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 5 0 0.95 1.05 9.0
SaveFrame $sh2 "shake" "shake_2.png"
$sh3 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 -4 0 0.97 1.03 -7.0
SaveFrame $sh3 "shake" "shake_3.png"
$sh4 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 3 0 0.98 1.02 4.0
SaveFrame $sh4 "shake" "shake_4.png"
$sh5 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $sh5 "shake" "shake_5.png"

# --- 16. TURN (6 frames: stepping turn) ---
$tn0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $tn0 "turn" "turn_0.png"
$tn1 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 -2 0 0.92 1.02 -4.0
SaveFrame $tn1 "turn" "turn_1.png"
$tn2 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 0.78 1.04
SaveFrame $tn2 "turn" "turn_2.png"
$tn3 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 0.78 1.04
SaveFrame $tn3 "turn" "turn_3.png"
$tn4 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 2 0 0.92 1.02 4.0
SaveFrame $tn4 "turn" "turn_4.png"
$tn5 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $tn5 "turn" "turn_5.png"

# --- 17. LANDING (4 frames: squash impact) ---
$ld0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.08 0.92
SaveFrame $ld0 "landing" "landing_0.png"
$ld1 = CreateFramedSprite $actDict["landing"].Clean $actDict["landing"].BBox 220 220 190 90.0
SaveFrame $ld1 "landing" "landing_1.png"
$ld2 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 0.94 1.08
SaveFrame $ld2 "landing" "landing_2.png"
$ld3 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $ld3 "landing" "landing_3.png"

# --- 18. DRAGGED (4 frames: hanging by scruff) ---
$dg0 = CreateFramedSprite $actDict["dragged"].Clean $actDict["dragged"].BBox 220 220 165 130.0 -4 0 1.0 1.0 -4.0
SaveFrame $dg0 "dragged" "dragged_0.png"
$dg1 = CreateFramedSprite $actDict["dragged"].Clean $actDict["dragged"].BBox 220 220 165 130.0 0 0 1.0 1.0
SaveFrame $dg1 "dragged" "dragged_1.png"
$dg2 = CreateFramedSprite $actDict["dragged"].Clean $actDict["dragged"].BBox 220 220 165 130.0 4 0 1.0 1.0 4.0
SaveFrame $dg2 "dragged" "dragged_2.png"
$dg3 = CreateFramedSprite $actDict["dragged"].Clean $actDict["dragged"].BBox 220 220 165 130.0 0 0 1.02 0.98
SaveFrame $dg3 "dragged" "dragged_3.png"

# --- 19. HAPPY (6 frames: joyful hop) ---
$hp0 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $hp0 "happy" "happy_0.png"
$hp1 = CreateFramedSprite $actDict["jump"].Clean $actDict["jump"].BBox 220 220 184 125.0
SaveFrame $hp1 "happy" "happy_1.png"
$hp2 = CreateFramedSprite $actDict["jump"].Clean $actDict["jump"].BBox 220 220 178 125.0 0 0 1.02 1.02
SaveFrame $hp2 "happy" "happy_2.png"
$hp3 = CreateFramedSprite $actDict["jump"].Clean $actDict["jump"].BBox 220 220 182 125.0 0 0 1.0 1.0
SaveFrame $hp3 "happy" "happy_3.png"
$hp4 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0 0 0 1.04 0.96
SaveFrame $hp4 "happy" "happy_4.png"
$hp5 = CreateFramedSprite $cleanStand $bboxStand 220 220 190 125.0
SaveFrame $hp5 "happy" "happy_5.png"

Write-Output "All Cream animation sequences generated successfully!"