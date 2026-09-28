import { AnimationClip, DogClipId } from './AnimationClip';
import { SpriteFrame } from './SpriteFrame';
import { ANIMATION_CLIPS } from './AnimationLibrary';

export interface AnimationEventListener {
  onFrameChange?: (frame: SpriteFrame, clipId: DogClipId) => void;
  onFootstep?: (clipId: DogClipId, frameIndex: number) => void;
  onSoundEvent?: (sound: string) => void;
  onClipComplete?: (clipId: DogClipId) => void;
}

export class AnimationController {
  private currentClipId: DogClipId = 'idle';
  private currentClip: AnimationClip;
  private currentFrameIndex: number = 0;
  private frameTimerMs: number = 0;
  private speedMultiplier: number = 1.0;
  private facingDirection: 'left' | 'right' = 'right';
  private onCompleteCallback: (() => void) | null = null;
  private listeners: AnimationEventListener[] = [];
  private isFinished: boolean = false;

  constructor(initialClipId: DogClipId = 'idle') {
    this.currentClipId = initialClipId;
    this.currentClip = ANIMATION_CLIPS[initialClipId] || ANIMATION_CLIPS.idle;
  }

  public addListener(listener: AnimationEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getFacingDirection(): 'left' | 'right' {
    return this.facingDirection;
  }

  public setFacingDirection(dir: 'left' | 'right'): void {
    this.facingDirection = dir;
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public setSpeed(speed: number): void {
    this.speedMultiplier = Math.max(0.4, Math.min(speed, 2.5));
  }

  public getCurrentClipId(): DogClipId {
    return this.currentClipId;
  }

  public getCurrentClip(): AnimationClip {
    return this.currentClip;
  }

  public getCurrentFrame(): SpriteFrame {
    return this.currentClip.frames[this.currentFrameIndex] || this.currentClip.frames[0];
  }

  public getFrameIndex(): number {
    return this.currentFrameIndex;
  }

  public play(
    clipId: DogClipId,
    options?: {
      forceRestart?: boolean;
      speed?: number;
      onComplete?: () => void;
    }
  ): boolean {
    const target = ANIMATION_CLIPS[clipId];
    if (!target) {
      console.warn(`[AnimationController] Clip not found: ${clipId}`);
      return false;
    }

    // Priority check: cannot interrupt a higher-priority non-interruptible clip
    if (!options?.forceRestart && !this.isFinished) {
      if (this.currentClip.priority > target.priority && !this.currentClip.interruptible) {
        return false;
      }
    }

    if (!options?.forceRestart && this.currentClipId === clipId && !this.isFinished) {
      if (options?.onComplete) this.onCompleteCallback = options.onComplete;
      return true;
    }

    this.currentClipId = clipId;
    this.currentClip = target;
    this.currentFrameIndex = 0;
    this.frameTimerMs = 0;
    this.isFinished = false;
    this.onCompleteCallback = options?.onComplete || null;
    if (options?.speed !== undefined) {
      this.speedMultiplier = options.speed;
    }

    this.notifyFrameChange();
    return true;
  }

  public update(deltaTimeSeconds: number): SpriteFrame {
    const frame = this.getCurrentFrame();
    const effectiveDurationMs = frame.durationMs / this.speedMultiplier;
    this.frameTimerMs += deltaTimeSeconds * 1000;

    while (this.frameTimerMs >= effectiveDurationMs) {
      this.frameTimerMs -= effectiveDurationMs;

      if (this.currentFrameIndex < this.currentClip.frames.length - 1) {
        this.currentFrameIndex++;
        this.notifyFrameChange();
      } else {
        if (this.currentClip.loop) {
          this.currentFrameIndex = 0;
          this.notifyFrameChange();
        } else {
          this.isFinished = true;
          const completedClip = this.currentClipId;
          const targetTransition = this.currentClip.transitionTo;

          // Notify listeners
          for (const l of this.listeners) {
            if (l.onClipComplete) l.onClipComplete(completedClip);
          }

          if (this.onCompleteCallback) {
            const cb = this.onCompleteCallback;
            this.onCompleteCallback = null;
            cb();
          } else if (targetTransition) {
            this.play(targetTransition);
          }
          break;
        }
      }
    }

    return this.getCurrentFrame();
  }

  private notifyFrameChange(): void {
    const frame = this.getCurrentFrame();
    for (const l of this.listeners) {
      if (l.onFrameChange) l.onFrameChange(frame, this.currentClipId);
      if (frame.isFootstep && l.onFootstep) l.onFootstep(this.currentClipId, this.currentFrameIndex);
      if (frame.soundEvent && l.onSoundEvent) l.onSoundEvent(frame.soundEvent);
    }
  }
}
