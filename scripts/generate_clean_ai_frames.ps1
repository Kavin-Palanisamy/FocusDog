Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\kavin\.gemini\antigravity-ide\brain\7e457338-754a-42aa-a546-9be1b1663e33"
$baseDir = "C:\Users\kavin\Documents\FocusDog\public\dog\cream"
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

function FitSprite([System.Drawing.Bitmap]$cleanBmp, [System.Drawing.Rectangle]$bbox, [int]$groundY = 190, [double]$scaleH = 125.0) {
    $targetW = 220; $targetH = 220
    $finalBmp = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($finalBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $baseScale = [Math]::Min(1.1, $scaleH / [Math]::Max(1, $bbox.Height))
    $scaledW = [int]($bbox.Width * $baseScale)
    $scaledH = [int]($bbox.Height * $baseScale)

    $destX = [int](($targetW - $scaledW) / 2.0)
    $destY = [int]($groundY - $scaledH)

    $destRect = [System.Drawing.Rectangle]::new($destX, $destY, $scaledW, $scaledH)
    $g.DrawImage($cleanBmp, $destRect, $bbox, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    return $finalBmp
}

# 1. Master Character Sheet Poses
$charImg = [System.Drawing.Bitmap]::FromFile($charSheetPath)
$csw = $charImg.Width; $csh = $charImg.Height

$cropStand = $charImg.Clone([System.Drawing.Rectangle]::new([int]($csw*0.04), [int]($csh*0.11), [int]($csw*0.44), [int]($csh*0.38)), $charImg.PixelFormat)
$cleanStand = RemoveWhiteBackground $cropStand
$bboxStand = GetBoundingBox $cleanStand
$bmpStand = FitSprite $cleanStand $bboxStand 190 125.0

$cropWalkPose = $charImg.Clone([System.Drawing.Rectangle]::new([int]($csw*0.51), [int]($csh*0.11), [int]($csw*0.45), [int]($csh*0.38)), $charImg.PixelFormat)
$cleanWalkPose = RemoveWhiteBackground $cropWalkPose
$bboxWalkPose = GetBoundingBox $cleanWalkPose
$bmpWalkPose = FitSprite $cleanWalkPose $bboxWalkPose 190 125.0

$cropSit = $charImg.Clone([System.Drawing.Rectangle]::new([int]($csw*0.06), [int]($csh*0.53), [int]($csw*0.42), [int]($csh*0.42)), $charImg.PixelFormat)
$cleanSit = RemoveWhiteBackground $cropSit
$bboxSit = GetBoundingBox $cleanSit
$bmpSit = FitSprite $cleanSit $bboxSit 190 125.0

$cropSleep = $charImg.Clone([System.Drawing.Rectangle]::new([int]($csw*0.48), [int]($csh*0.70), [int]($csw*0.48), [int]($csh*0.25)), $charImg.PixelFormat)
$cleanSleep = RemoveWhiteBackground $cropSleep
$bboxSleep = GetBoundingBox $cleanSleep
$bmpSleep = FitSprite $cleanSleep $bboxSleep 190 100.0

$charImg.Dispose()

# 2. Walk Cycle 8 Frames
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
    $bmp = FitSprite $clean $bbox 190 125.0
    $walkBmps += $bmp
    $crop.Dispose(); $clean.Dispose()
}
$walkImg.Dispose()

# 3. Actions Sheet Poses
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
    $rh = [int]($cellH * 0.78)

    $crop = $actImg.Clone([System.Drawing.Rectangle]::new($rx, $ry, $rw, $rh), $actImg.PixelFormat)
    $clean = RemoveWhiteBackground $crop
    $bbox = GetBoundingBox $clean
    $ground = if ($name -eq "dragged") { 165 } elseif ($name -eq "jump") { 160 } elseif ($name -eq "landing") { 190 } else { 190 }
    $scale = if ($name -eq "landing") { 90.0 } elseif ($name -eq "roll") { 110.0 } elseif ($name -eq "stretch") { 115.0 } else { 125.0 }
    $bmp = FitSprite $clean $bbox $ground $scale
    $actDict[$name] = $bmp
    $crop.Dispose(); $clean.Dispose()
}
$actImg.Dispose()

function SaveOne([System.Drawing.Bitmap]$sourceBmp, [string]$folder, [string]$filename) {
    $outFolder = Join-Path $baseDir $folder
    if (-not (Test-Path $outFolder)) { New-Item -ItemType Directory -Path $outFolder -Force | Out-Null }
    $p = Join-Path $outFolder $filename
    $sourceBmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
}

# --- SAVE GENUINE AI-AUTHORED FRAMES ONLY ---

# WALK: 8 genuine quadruped walk cycle drawings
for ($i = 0; $i -lt 8; $i++) {
    SaveOne $walkBmps[$i] "walk" "walk_$i.png"
}

# WALK-START: Neutral Stand -> Walking Stride -> Walk F0
SaveOne $bmpStand "walk-start" "walk_start_0.png"
SaveOne $bmpWalkPose "walk-start" "walk_start_1.png"
SaveOne $walkBmps[0] "walk-start" "walk_start_2.png"

# WALK-STOP: Walk F7 -> Walking Stride -> Neutral Stand
SaveOne $walkBmps[7] "walk-stop" "walk_stop_0.png"
SaveOne $bmpWalkPose "walk-stop" "walk_stop_1.png"
SaveOne $bmpStand "walk-stop" "walk_stop_2.png"

# IDLE: Neutral Stand
for ($i = 0; $i -lt 6; $i++) {
    SaveOne $bmpStand "idle" "idle_$i.png"
}

# SIT: Neutral Stand -> Sitting Pose
SaveOne $bmpStand "sit" "sit_0.png"
SaveOne $bmpSit "sit" "sit_1.png"
SaveOne $bmpSit "sit" "sit_2.png"
SaveOne $bmpSit "sit" "sit_3.png"
SaveOne $bmpSit "sit" "sit_4.png"

# SIT-IDLE: Sitting Pose
for ($i = 0; $i -lt 4; $i++) {
    SaveOne $bmpSit "sit_idle" "sit_idle_$i.png"
}

# STAND-UP: Sitting Pose -> Neutral Stand
SaveOne $bmpSit "stand_up" "stand_up_0.png"
SaveOne $bmpStand "stand_up" "stand_up_1.png"
SaveOne $bmpStand "stand_up" "stand_up_2.png"
SaveOne $bmpStand "stand_up" "stand_up_3.png"

# SLEEP: Curled Sleeping Pose
for ($i = 0; $i -lt 6; $i++) {
    SaveOne $bmpSleep "sleep" "sleep_$i.png"
}

# WAKE: Curled Sleep -> Yawn -> Downward Stretch -> Neutral Stand
SaveOne $bmpSleep "wake" "wake_0.png"
SaveOne $actDict["yawn"] "wake" "wake_1.png"
SaveOne $actDict["stretch"] "wake" "wake_2.png"
SaveOne $actDict["stretch"] "wake" "wake_3.png"
SaveOne $bmpStand "wake" "wake_4.png"
SaveOne $bmpStand "wake" "wake_5.png"

# STRETCH: Neutral Stand -> Downward Stretch -> Neutral Stand
SaveOne $bmpStand "stretch" "stretch_0.png"
SaveOne $actDict["stretch"] "stretch" "stretch_1.png"
SaveOne $actDict["stretch"] "stretch" "stretch_2.png"
SaveOne $actDict["stretch"] "stretch" "stretch_3.png"
SaveOne $actDict["stretch"] "stretch" "stretch_4.png"
SaveOne $bmpStand "stretch" "stretch_5.png"

# JUMP: Stand -> Jump (airborne leap) -> Landing Squash (squashed on impact) -> Stand
SaveOne $bmpStand "jump" "jump_0.png"
SaveOne $actDict["jump"] "jump" "jump_1.png"
SaveOne $actDict["jump"] "jump" "jump_2.png"
SaveOne $actDict["jump"] "jump" "jump_3.png"
SaveOne $actDict["jump"] "jump" "jump_4.png"
SaveOne $actDict["landing"] "jump" "jump_5.png"
SaveOne $actDict["landing"] "jump" "jump_6.png"
SaveOne $bmpStand "jump" "jump_7.png"

# ROLL: Stand -> Playful Belly-Up Roll -> Stand
SaveOne $bmpStand "roll" "roll_0.png"
SaveOne $actDict["roll"] "roll" "roll_1.png"
SaveOne $actDict["roll"] "roll" "roll_2.png"
SaveOne $actDict["roll"] "roll" "roll_3.png"
SaveOne $actDict["roll"] "roll" "roll_4.png"
SaveOne $actDict["roll"] "roll" "roll_5.png"
SaveOne $actDict["roll"] "roll" "roll_6.png"
SaveOne $bmpStand "roll" "roll_7.png"

# SNIFF: Stand -> Ground Sniffing -> Stand
SaveOne $bmpStand "sniff" "sniff_0.png"
SaveOne $actDict["sniff"] "sniff" "sniff_1.png"
SaveOne $actDict["sniff"] "sniff" "sniff_2.png"
SaveOne $actDict["sniff"] "sniff" "sniff_3.png"
SaveOne $actDict["sniff"] "sniff" "sniff_4.png"
SaveOne $bmpStand "sniff" "sniff_5.png"

# SCRATCH: Sit -> Ear Scratching -> Sit
SaveOne $bmpSit "scratch" "scratch_0.png"
SaveOne $actDict["scratch"] "scratch" "scratch_1.png"
SaveOne $actDict["scratch"] "scratch" "scratch_2.png"
SaveOne $actDict["scratch"] "scratch" "scratch_3.png"
SaveOne $actDict["scratch"] "scratch" "scratch_4.png"
SaveOne $bmpSit "scratch" "scratch_5.png"

# LANDING: Landing Squash -> Stand
SaveOne $actDict["landing"] "landing" "landing_0.png"
SaveOne $actDict["landing"] "landing" "landing_1.png"
SaveOne $actDict["landing"] "landing" "landing_2.png"
SaveOne $bmpStand "landing" "landing_3.png"

# DRAGGED: Picked Up / Hanging
for ($i = 0; $i -lt 4; $i++) {
    SaveOne $actDict["dragged"] "dragged" "dragged_$i.png"
}

# HAPPY: Stand -> Happy Hop -> Stand
SaveOne $bmpStand "happy" "happy_0.png"
SaveOne $actDict["jump"] "happy" "happy_1.png"
SaveOne $actDict["jump"] "happy" "happy_2.png"
SaveOne $actDict["jump"] "happy" "happy_3.png"
SaveOne $bmpStand "happy" "happy_4.png"
SaveOne $bmpStand "happy" "happy_5.png"

Write-Output "Genuine AI-authored frames written for Cream."