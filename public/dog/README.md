# FocusDog Asset Pipeline
This directory supports custom drop-in sprite sheet or frame images for FocusDog:
- public/dog/cream/
- public/dog/white/
- public/dog/black/

Supported clips:
- walk.png (or walk_0.png .. walk_7.png)
- idle.png
- sit.png
- sleep.png
- wake.png
- stretch.png
- sniff.png
- scratch.png
- roll.png
- shake.png
- dragged.png
- happy.png
- surprised.png

When external PNG frame files are present, the DogSpriteRenderer will load and render them.
When not present, the built-in procedural frame rasterizer automatically generates all high-DPI character frames with full quadruped anatomy and animations.