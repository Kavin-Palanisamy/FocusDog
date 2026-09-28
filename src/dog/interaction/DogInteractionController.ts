import { DogPersonality } from '../personality/DogPersonality';
import { AnimationController } from '../animation/AnimationController';
import { DogSoundController } from '../audio/DogSoundController';
import { DogClipId } from '../animation/AnimationClip';
import { EmoteType } from '../animation/SpriteFrame';

export interface InteractionCallbacks {
  onContextMenu: (screenX: number, screenY: number) => void;
  onEmoteSpawn: (type: EmoteType) => void;
}

export class DogInteractionController {
  private personality: DogPersonality;
  private anim: AnimationController;
  private sound: DogSoundController;
  private callbacks: InteractionCallbacks;

  private pointerDownTime: number = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private lastClickTime: number = 0;
  private readonly LONG_PRESS_MS = 750;
  private readonly DOUBLE_CLICK_MS = 320;
  private isTransitioningSleepWake: boolean = false;

  constructor(
    personality: DogPersonality,
    anim: AnimationController,
    sound: DogSoundController,
    callbacks: InteractionCallbacks
  ) {
    this.personality = personality;
    this.anim = anim;
    this.sound = sound;
    this.callbacks = callbacks;
  }

  public handlePointerDown(e: React.PointerEvent): void {
    if (e.button === 2) {
      e.preventDefault();
      this.callbacks.onContextMenu(e.clientX, e.clientY);
      return;
    }

    if (e.button !== 0) return;

    this.pointerDownTime = Date.now();

    // Long press timer to put dog to sleep
    this.longPressTimer = setTimeout(() => {
      this.triggerLongPressSleep();
    }, this.LONG_PRESS_MS);
  }

  public handlePointerUp(wasDragging: boolean): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (wasDragging || this.isTransitioningSleepWake) return;

    const duration = Date.now() - this.pointerDownTime;
    if (duration >= this.LONG_PRESS_MS) {
      return; // Handled by long-press
    }

    const now = Date.now();
    if (now - this.lastClickTime < this.DOUBLE_CLICK_MS) {
      this.triggerPetCelebration();
      this.lastClickTime = 0;
    } else {
      this.lastClickTime = now;
      setTimeout(() => {
        if (this.lastClickTime === now) {
          this.triggerSingleClickReaction();
        }
      }, this.DOUBLE_CLICK_MS);
    }
  }

  public triggerWakeSequence(): void {
    if (this.isTransitioningSleepWake) return;
    this.isTransitioningSleepWake = true;

    this.personality.wakeUp();
    this.sound.bark();
    this.callbacks.onEmoteSpawn('surprise');

    // Chained wake transition: wake-up -> stretch -> shake-body -> idle
    this.anim.play('wake-up', {
      onComplete: () => {
        this.anim.play('stretch', {
          onComplete: () => {
            this.anim.play('shake-body', {
              onComplete: () => {
                this.isTransitioningSleepWake = false;
                this.personality.setAction('idle', 8);
                this.anim.play('idle');
              },
            });
          },
        });
      },
    });
  }

  public triggerSingleClickReaction(): void {
    if (this.isTransitioningSleepWake) return;
    const stats = this.personality.getStats();

    if (stats.isSleeping) {
      this.triggerWakeSequence();
    } else {
      const reactions: DogClipId[] = ['look-around', 'paw-wave', 'sniff', 'confused', 'play-bow', 'small-jump'];
      const picked = reactions[Math.floor(Math.random() * reactions.length)];

      this.sound.chirpHappy();
      this.callbacks.onEmoteSpawn(Math.random() > 0.5 ? 'sparkles' : 'musical_note');
      this.personality.setAction(picked, 2.5);
      this.anim.play(picked, {
        onComplete: () => {
          this.personality.setAction('idle', 6);
          this.anim.play('idle');
        },
      });
    }
  }

  public triggerPetCelebration(): void {
    if (this.isTransitioningSleepWake) return;
    const stats = this.personality.getStats();

    if (stats.isSleeping) {
      this.triggerWakeSequence();
    } else {
      this.personality.pet();
      this.sound.chirpHappy();
      this.callbacks.onEmoteSpawn('hearts');
      this.anim.play('happy', {
        onComplete: () => {
          this.personality.setAction('idle', 6);
          this.anim.play('idle');
        },
      });
    }
  }

  public triggerLongPressSleep(): void {
    if (this.isTransitioningSleepWake || this.personality.getStats().isSleeping) return;
    this.isTransitioningSleepWake = true;

    this.sound.yawn();
    this.callbacks.onEmoteSpawn('sleepZ');

    // Chained sleep transition: yawn -> sit -> lie-down -> sleep
    this.anim.play('yawn', {
      onComplete: () => {
        this.anim.play('sit', {
          onComplete: () => {
            this.anim.play('lie-down', {
              onComplete: () => {
                this.isTransitioningSleepWake = false;
                this.personality.putToSleep();
                this.anim.play('sleep');
              },
            });
          },
        });
      },
    });
  }
}
