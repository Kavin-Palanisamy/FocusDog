import { SpriteFrame, EmoteType } from '../animation/SpriteFrame';
import { DogClipId } from '../animation/AnimationClip';
import { DogCoat } from '../../models/settings';
import { SpriteAtlas } from './SpriteAtlas';

export class DogSpriteRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private groundY: number = 192;

  constructor(ctx: CanvasRenderingContext2D, width: number = 220, height: number = 220) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  public render(
    frame: SpriteFrame,
    clipId: DogClipId,
    coat: DogCoat = 'cream',
    facingDirection: 'left' | 'right' = 'right',
    _pupilOffset: { x: number; y: number } = { x: 0, y: 0 },
    activeEmote?: { type: EmoteType; opacity: number; offsetY: number; scale: number } | null
  ): void {
    const ctx = this.ctx;
    const gOff = frame.groundOffset || 0;

    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Ground Contact Shadow (anchored to desktop taskbar ground line)
    this.drawContactShadow(frame);

    // Directional orientation (flips horizontally around center)
    if (facingDirection === 'left') {
      ctx.translate(this.width, 0);
      ctx.scale(-1, 1);
    }

    // 2. Render true 2D raster frame
    const rasterImg = SpriteAtlas.getImage(coat, clipId, frame.frameIndex);
    if (rasterImg && rasterImg.complete && rasterImg.naturalWidth > 0) {
      ctx.drawImage(rasterImg, 0, -gOff, this.width, this.height);
    } else {
      // Fallback: draw idle frame 0 if current frame is loading
      const fallbackImg = SpriteAtlas.getImage(coat, 'idle', 0);
      if (fallbackImg && fallbackImg.complete && fallbackImg.naturalWidth > 0) {
        ctx.drawImage(fallbackImg, 0, -gOff, this.width, this.height);
      }
    }

    // 3. Render Visual Emotes (hearts, sparkles, zzz, surprise)
    const emoteToDraw = activeEmote || (frame.emote ? { type: frame.emote, opacity: 1, offsetY: 0, scale: 1 } : null);
    if (emoteToDraw && emoteToDraw.opacity > 0.05) {
      this.drawEmote(emoteToDraw);
    }

    ctx.restore();
  }

  private drawContactShadow(frame: SpriteFrame): void {
    const ctx = this.ctx;
    const s = frame.shadow;
    const cx = 110 + s.offsetX;
    const cy = this.groundY + 4;
    const rx = Math.max(6, s.width);
    const ry = Math.max(2, s.width * 0.22);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    grad.addColorStop(0, `rgba(15, 20, 30, ${(s.opacity * 0.45).toFixed(3)})`);
    grad.addColorStop(0.7, `rgba(15, 20, 30, ${(s.opacity * 0.18).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(15, 20, 30, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  private drawEmote(emote: { type: EmoteType; opacity: number; offsetY: number; scale: number }): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(142, 65 + emote.offsetY);
    ctx.scale(emote.scale, emote.scale);
    ctx.globalAlpha = emote.opacity;

    if (emote.type === 'hearts') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-5, -7, -12, -4, -12, 3);
      ctx.bezierCurveTo(-12, 10, -5, 15, 0, 20);
      ctx.bezierCurveTo(5, 15, 12, 10, 12, 3);
      ctx.bezierCurveTo(12, -4, 5, -7, 0, 0);
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fill();
    } else if (emote.type === 'sleepZ') {
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillStyle = '#818CF8';
      ctx.shadowColor = 'rgba(129, 140, 248, 0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText('Z', 0, 0);
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText('z', 12, -15);
    } else if (emote.type === 'surprise') {
      ctx.beginPath();
      ctx.arc(0, 10, 3, 0, Math.PI * 2);
      ctx.roundRect(-2.5, -12, 5, 16, 2.5);
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
      ctx.shadowBlur = 6;
      ctx.fill();
    } else if (emote.type === 'question') {
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillStyle = '#06B6D4';
      ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
      ctx.shadowBlur = 6;
      ctx.fillText('?', -5, 8);
    } else if (emote.type === 'sparkles') {
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(0, 0, 12, 0);
      ctx.quadraticCurveTo(0, 0, 0, 12);
      ctx.quadraticCurveTo(0, 0, -12, 0);
      ctx.quadraticCurveTo(0, 0, 0, -12);
      ctx.fillStyle = '#FBBF24';
      ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fill();
    } else if (emote.type === 'musical_note') {
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillStyle = '#EC4899';
      ctx.shadowColor = 'rgba(236, 72, 153, 0.5)';
      ctx.shadowBlur = 6;
      ctx.fillText('♪', -4, 6);
    }

    ctx.restore();
  }
}