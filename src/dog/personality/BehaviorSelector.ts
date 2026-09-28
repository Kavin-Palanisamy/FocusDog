import { DogPersonality } from './DogPersonality';
import { DogClipId } from '../animation/AnimationClip';

export class BehaviorSelector {
  public static selectNextAction(
    personality: DogPersonality,
    canRoam: boolean = true
  ): { action: DogClipId; duration: number } {
    const stats = personality.getStats();

    if (stats.isSleeping) {
      return { action: 'sleep', duration: 20 };
    }

    if (stats.sleepiness >= 85) {
      return { action: 'lie-down', duration: 8 };
    }

    // Weighted selection pool prioritizing calm, peaceful companionship
    const pool: { action: DogClipId; weight: number; minDuration: number; maxDuration: number }[] = [];

    // Calm, gentle breathing idle (generous quiet periods: 8 to 18 seconds)
    pool.push({ action: 'idle', weight: 50, minDuration: 8, maxDuration: 18 });

    // Sitting quietly and observing the desktop (8 to 16 seconds)
    pool.push({ action: 'sit', weight: 25, minDuration: 8, maxDuration: 16 });

    // Natural dog behaviors (infrequent, delightful)
    pool.push({ action: 'sniff', weight: 12, minDuration: 3, maxDuration: 5 });
    pool.push({ action: 'stretch', weight: 10, minDuration: 3, maxDuration: 4.5 });
    pool.push({ action: 'scratch-ear', weight: 8, minDuration: 2.5, maxDuration: 4 });
    pool.push({ action: 'shake-body', weight: 8, minDuration: 2, maxDuration: 3 });

    if (stats.sleepiness > 45) {
      pool.push({ action: 'yawn', weight: 12, minDuration: 2.5, maxDuration: 3.5 });
    }

    // Walking / patrol (roaming: 7 to 12 seconds)
    if (canRoam && !stats.isPaused && stats.energy > 20) {
      const walkWeight = stats.mood === 'excited' || stats.mood === 'playful' ? 35 : 24;
      pool.push({ action: 'walk', weight: walkWeight, minDuration: 7, maxDuration: 12 });
    }

    // Occasional playful moments when dog is very happy
    if (stats.happiness > 75 && stats.energy > 50) {
      pool.push({ action: 'roll-over', weight: 6, minDuration: 3, maxDuration: 4.5 });
      pool.push({ action: 'small-jump', weight: 6, minDuration: 2, maxDuration: 3 });
      pool.push({ action: 'happy', weight: 8, minDuration: 2.5, maxDuration: 3.5 });
    }

    // Prevent immediate repetition of the same non-idle action
    const current = stats.currentAction;
    const filtered = pool.filter(p => p.action === 'idle' || p.action !== current);
    const candidateList = filtered.length > 0 ? filtered : pool;

    const totalWeight = candidateList.reduce((acc, item) => acc + item.weight, 0);
    let randomVal = Math.random() * totalWeight;

    for (const item of candidateList) {
      randomVal -= item.weight;
      if (randomVal <= 0) {
        const duration = item.minDuration + Math.random() * (item.maxDuration - item.minDuration);
        return { action: item.action, duration };
      }
    }

    return { action: 'idle', duration: 10 };
  }
}