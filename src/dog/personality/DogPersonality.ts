import { DogClipId } from '../animation/AnimationClip';

export type DogMood = 'cheerful' | 'calm' | 'sleepy' | 'curious' | 'excited' | 'playful';

export interface DogStats {
  mood: DogMood;
  energy: number;     // 0 - 100
  sleepiness: number; // 0 - 100
  happiness: number;  // 0 - 100
  curiosity: number;  // 0 - 100
  playfulness: number;// 0 - 100
  currentAction: DogClipId;
  facingDirection: 'left' | 'right';
  isSleeping: boolean;
  isDragging: boolean;
  isPaused: boolean;
}

export class DogPersonality {
  private stats: DogStats;
  private actionTimer: number = 0;
  private currentActionDuration: number = 3;

  constructor() {
    this.stats = {
      mood: 'cheerful',
      energy: 85,
      sleepiness: 15,
      happiness: 90,
      curiosity: 75,
      playfulness: 80,
      currentAction: 'idle',
      facingDirection: 'right',
      isSleeping: false,
      isDragging: false,
      isPaused: false,
    };
  }

  public getStats(): DogStats {
    return { ...this.stats };
  }

  public setFacingDirection(dir: 'left' | 'right'): void {
    this.stats.facingDirection = dir;
  }

  public setPaused(paused: boolean): void {
    this.stats.isPaused = paused;
    if (paused && this.stats.currentAction === 'walk') {
      this.stats.currentAction = 'idle';
    }
  }

  public setDragging(dragging: boolean): void {
    this.stats.isDragging = dragging;
    if (dragging) {
      this.stats.isSleeping = false;
      this.stats.currentAction = 'dragged';
    }
  }

  public pet(): { happinessGained: number; mood: DogMood; wokeUp: boolean } {
    let wokeUp = false;
    if (this.stats.isSleeping) {
      this.stats.isSleeping = false;
      this.stats.currentAction = 'wake-up';
      wokeUp = true;
    } else {
      this.stats.currentAction = 'happy';
    }

    this.stats.happiness = Math.min(100, this.stats.happiness + 25);
    this.stats.energy = Math.min(100, this.stats.energy + 10);
    this.stats.sleepiness = Math.max(0, this.stats.sleepiness - 15);
    this.updateMood();

    return { happinessGained: 25, mood: this.stats.mood, wokeUp };
  }

  public putToSleep(): void {
    this.stats.isSleeping = true;
    this.stats.currentAction = 'sleep';
    this.stats.mood = 'sleepy';
  }

  public wakeUp(): void {
    if (this.stats.isSleeping) {
      this.stats.isSleeping = false;
      this.stats.currentAction = 'wake-up';
      this.stats.sleepiness = Math.max(10, this.stats.sleepiness - 40);
      this.updateMood();
    }
  }

  public setAction(action: DogClipId, durationSeconds: number = 3): void {
    this.stats.currentAction = action;
    this.actionTimer = 0;
    this.currentActionDuration = durationSeconds;
    if (action === 'sleep' || action === 'lie-down') {
      this.stats.isSleeping = true;
    } else if (this.stats.isSleeping) {
      this.stats.isSleeping = false;
    }
  }

  public tick(deltaTimeSeconds: number): { actionExpired: boolean } {
    if (this.stats.isSleeping) {
      this.stats.energy = Math.min(100, this.stats.energy + deltaTimeSeconds * 1.8);
      this.stats.sleepiness = Math.max(0, this.stats.sleepiness - deltaTimeSeconds * 2.5);
      if (this.stats.sleepiness <= 5 && this.stats.energy >= 95) {
        this.wakeUp();
        return { actionExpired: true };
      }
    } else {
      this.stats.energy = Math.max(0, this.stats.energy - deltaTimeSeconds * 0.4);
      this.stats.sleepiness = Math.min(100, this.stats.sleepiness + deltaTimeSeconds * 0.5);
      this.stats.happiness = Math.max(20, this.stats.happiness - deltaTimeSeconds * 0.1);
    }

    this.updateMood();

    this.actionTimer += deltaTimeSeconds;
    const actionExpired = this.actionTimer >= this.currentActionDuration;
    if (actionExpired) {
      this.actionTimer = 0;
    }

    return { actionExpired };
  }

  private updateMood(): void {
    if (this.stats.isSleeping || this.stats.sleepiness > 75) {
      this.stats.mood = 'sleepy';
    } else if (this.stats.happiness > 80 && this.stats.energy > 60) {
      this.stats.mood = 'excited';
    } else if (this.stats.playfulness > 70) {
      this.stats.mood = 'playful';
    } else if (this.stats.energy > 40) {
      this.stats.mood = 'cheerful';
    } else if (this.stats.happiness > 50) {
      this.stats.mood = 'calm';
    } else {
      this.stats.mood = 'curious';
    }
  }
}
