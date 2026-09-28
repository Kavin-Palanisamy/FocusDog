import { DogSpriteRenderer } from '../rendering/DogSpriteRenderer';
import { SpriteAtlas } from '../rendering/SpriteAtlas';
import { AnimationController } from '../animation/AnimationController';
import { DogClipId } from '../animation/AnimationClip';
import { EmoteType } from '../animation/SpriteFrame';
import { DogCoat } from '../../models/settings';
import { DogPersonality } from '../personality/DogPersonality';
import { BehaviorSelector } from '../personality/BehaviorSelector';
import { DogMovementController } from '../movement/DogMovementController';
import { DogSoundController } from '../audio/DogSoundController';
import { DragController } from '../movement/DragController';

export interface PetEngineOptions {
  coat: DogCoat;
  speed: number;
  soundEnabled: boolean;
  soundVolume: number;
  patrolEnabled: boolean;
  patrolSpeed: number;
  fixedClip?: DogClipId;
  interactive?: boolean;
  onStateChange?: (clipId: DogClipId) => void;
  onContextMenu?: (x: number, y: number) => void;
}

export class DogPetEngine {
  private ctx: CanvasRenderingContext2D;
  private renderer: DogSpriteRenderer;
  private animController: AnimationController;
  private movementController: DogMovementController;
  private personality: DogPersonality;
  private soundController: DogSoundController;
  private dragController: DragController | null = null;

  private options: PetEngineOptions;
  private isRunning: boolean = false;
  private animFrameId: number = 0;
  private lastTimeMs: number = 0;

  // Active floating emotes
  private activeEmotes: Array<{
    id: number;
    type: EmoteType;
    opacity: number;
    offsetY: number;
    scale: number;
    startTime: number;
    duration: number;
  }> = [];
  private nextEmoteId: number = 1;

  // Cursor glance tracking with smooth dampening
  private targetPupilOffset: { x: number; y: number } = { x: 0, y: 0 };
  private currentPupilOffset: { x: number; y: number } = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, options: PetEngineOptions) {
    this.options = options;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    this.ctx = ctx;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    canvas.width = 220 * dpr;
    canvas.height = 220 * dpr;
    this.ctx.scale(dpr, dpr);

    // Pre-load raster PNG assets for the coat
    SpriteAtlas.preloadCoat(options.coat);

    this.renderer = new DogSpriteRenderer(this.ctx, 220, 220);
    this.animController = new AnimationController(options.fixedClip || 'idle');
    this.animController.setSpeed(options.speed);

    this.soundController = new DogSoundController(options.soundEnabled, options.soundVolume);
    this.personality = new DogPersonality();
    this.movementController = new DogMovementController(
      options.patrolEnabled ? 'free_roam' : 'fixed_spot',
      options.patrolSpeed
    );

    if (options.interactive) {
      this.movementController.initPosition();
      this.dragController = new DragController(
        this.movementController,
        this.personality,
        this.animController
      );
    }

    // Audio & Footstep events
    this.animController.addListener({
      onSoundEvent: (sound) => {
        if (sound === 'chirp') this.soundController.chirpHappy();
        else if (sound === 'yawn') this.soundController.yawn();
        else if (sound === 'snooze') this.soundController.snooze();
        else if (sound === 'bark') this.soundController.bark();
      },
      onFrameChange: (frame) => {
        if (frame.emote) {
          this.spawnEmote(frame.emote);
        }
      },
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimeMs = performance.now();
    this.loop(this.lastTimeMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  public updateOptions(newOptions: Partial<PetEngineOptions>): void {
    this.options = { ...this.options, ...newOptions };
    if (newOptions.coat !== undefined) {
      SpriteAtlas.preloadCoat(newOptions.coat);
    }
    if (newOptions.speed !== undefined) {
      this.animController.setSpeed(newOptions.speed);
    }
    if (newOptions.soundEnabled !== undefined) {
      this.soundController.setEnabled(newOptions.soundEnabled);
    }
    if (newOptions.soundVolume !== undefined) {
      this.soundController.setVolume(newOptions.soundVolume);
    }
    if (newOptions.patrolEnabled !== undefined || newOptions.patrolSpeed !== undefined) {
      this.movementController.setMode(this.options.patrolEnabled ? 'free_roam' : 'fixed_spot');
      this.movementController.setSpeed(this.options.patrolSpeed);
      this.personality.setPaused(!this.options.patrolEnabled);
    }
    if (newOptions.fixedClip !== undefined) {
      this.animController.play(newOptions.fixedClip, { forceRestart: true });
    }
  }

  public spawnEmote(type: EmoteType): void {
    this.activeEmotes.push({
      id: this.nextEmoteId++,
      type,
      opacity: 1,
      offsetY: 0,
      scale: 1,
      startTime: Date.now(),
      duration: type === 'sleepZ' ? 2400 : 1200,
    });
  }

  public setPupilOffset(dx: number, dy: number): void {
    this.targetPupilOffset = { x: dx * 3, y: dy * 2 };
  }

  public getAnimController(): AnimationController {
    return this.animController;
  }

  public getPersonality(): DogPersonality {
    return this.personality;
  }

  public getMovementController(): DogMovementController {
    return this.movementController;
  }

  public getDragController(): DragController | null {
    return this.dragController;
  }

  public getSoundController(): DogSoundController {
    return this.soundController;
  }

  private loop = (currentTimeMs: number) => {
    if (!this.isRunning) return;

    const deltaTimeSeconds = Math.min((currentTimeMs - this.lastTimeMs) / 1000, 0.1);
    this.lastTimeMs = currentTimeMs;

    // Smooth pupil glance dampening
    this.currentPupilOffset.x += (this.targetPupilOffset.x - this.currentPupilOffset.x) * Math.min(1, deltaTimeSeconds * 10);
    this.currentPupilOffset.y += (this.targetPupilOffset.y - this.currentPupilOffset.y) * Math.min(1, deltaTimeSeconds * 10);

    // 0. Smooth gravity fall on drag release
    if (this.movementController.getIsFalling()) {
      this.movementController.stepFall(deltaTimeSeconds).then(({ landed }) => {
        if (landed) {
          this.animController.play('landing', {
            onComplete: () => {
              this.personality.setAction('idle', 8);
              this.animController.play('idle');
            },
          });
        }
      });
    }

    // 1. Behavior Scheduler (autonomous actions with quiet peaceful periods)
    if (
      !this.options.fixedClip &&
      !this.dragController?.getIsDragging() &&
      !this.movementController.getIsFalling()
    ) {
      const { actionExpired } = this.personality.tick(deltaTimeSeconds);
      const currentClipId = this.animController.getCurrentClipId();

      if (actionExpired) {
        const next = BehaviorSelector.selectNextAction(this.personality, this.options.patrolEnabled);
        if (next.action !== currentClipId) {
          this.personality.setAction(next.action, next.duration);

          if (next.action === 'walk') {
            // Natural start stride
            this.animController.play('walk-start');
          } else {
            this.animController.play(next.action, {
              onComplete: () => {
                // Ensure quiet resting period after every autonomous action
                this.personality.setAction('idle', 8 + Math.random() * 6);
                this.animController.play('idle');
              },
            });
          }

          if (this.options.onStateChange) this.options.onStateChange(next.action);
        }
      }
    }

    // 2. Update animation frame
    const frame = this.animController.update(deltaTimeSeconds);

    // 3. Physical translation during walk cycle
    const currentClipId = this.animController.getCurrentClipId();
    const isWalking =
      (currentClipId === 'walk' || currentClipId === 'walk-start' || currentClipId === 'turn-left' || currentClipId === 'turn-right') &&
      !this.dragController?.getIsDragging() &&
      !this.movementController.getIsFalling();

    if (this.options.interactive && isWalking && this.options.patrolEnabled) {
      const stridePx = frame.strideDisplacementPx || 10;
      this.movementController.stepWalk(deltaTimeSeconds, stridePx).then(({ reachedTarget, needsTurn }) => {
        if (needsTurn) {
          const dir = this.movementController.getFacingDirection();
          const turnClip: DogClipId = dir === 'left' ? 'turn-left' : 'turn-right';
          if (this.animController.getCurrentClipId() !== turnClip) {
            this.animController.play(turnClip);
          }
        } else if (reachedTarget) {
          // Reached destination: decelerate smoothly and settle into quiet idle
          this.animController.play('walk-stop', {
            onComplete: () => {
              this.personality.setAction('idle', 9 + Math.random() * 6);
              this.animController.play('idle');
            },
          });
        }
      });
    }

    // 4. Update Emote particles
    const now = Date.now();
    this.activeEmotes = this.activeEmotes.filter((e) => {
      const elapsed = now - e.startTime;
      if (elapsed > e.duration) return false;
      const progress = elapsed / e.duration;
      e.offsetY = -progress * 28;
      e.opacity = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
      e.scale = 0.8 + Math.sin(progress * Math.PI) * 0.4;
      return true;
    });
    const latestEmote = this.activeEmotes[this.activeEmotes.length - 1] || null;

    // 5. Facing direction
    const facing = this.movementController.getFacingDirection();

    // 6. Blit character frame
    this.renderer.render(
      frame,
      currentClipId,
      this.options.coat,
      facing,
      this.currentPupilOffset,
      latestEmote
    );

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}
