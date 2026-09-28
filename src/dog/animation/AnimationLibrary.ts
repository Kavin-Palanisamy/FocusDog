import { AnimationClip, DogClipId } from './AnimationClip';
import { SpriteFrame } from './SpriteFrame';

function makeFrame(
  frameIndex: number,
  durationMs: number,
  options: {
    groundOffset?: number;
    shadowWidth?: number;
    shadowOpacity?: number;
    shadowOffsetX?: number;
    isFootstep?: boolean;
    strideDisplacementPx?: number;
    soundEvent?: SpriteFrame['soundEvent'];
    emote?: SpriteFrame['emote'];
  } = {}
): SpriteFrame {
  return {
    frameIndex,
    durationMs,
    anchorX: 110,
    anchorY: 192,
    groundOffset: options.groundOffset || 0,
    shadow: {
      width: options.shadowWidth !== undefined ? options.shadowWidth : 42,
      opacity: options.shadowOpacity !== undefined ? options.shadowOpacity : 0.8,
      offsetX: options.shadowOffsetX || 0,
    },
    isFootstep: options.isFootstep || false,
    strideDisplacementPx: options.strideDisplacementPx || 0,
    soundEvent: options.soundEvent,
    emote: options.emote,
  };
}

export const ANIMATION_CLIPS: Record<DogClipId, AnimationClip> = {
  // 1. Idle Breathing (6 discrete frames, ~6.25 FPS, gentle breathing & sweet blink)
  idle: {
    id: 'idle',
    name: 'Idle Breathing (6f)',
    loop: true,
    defaultFps: 6.25,
    priority: 10,
    interruptible: true,
    frames: [
      makeFrame(0, 160, { shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 160, { shadowWidth: 42.5, shadowOpacity: 0.84 }),
      makeFrame(2, 160, { shadowWidth: 43, shadowOpacity: 0.85 }),
      makeFrame(3, 160, { shadowWidth: 42.5, shadowOpacity: 0.84 }),
      makeFrame(4, 160, { shadowWidth: 42, shadowOpacity: 0.82 }), // Blink
      makeFrame(5, 160, { shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  // 2. Real Quadruped Walk Cycle (8 discrete frames, 11 FPS, stride-synchronized)
  walk: {
    id: 'walk',
    name: 'Walk Cycle (8f)',
    loop: true,
    defaultFps: 11,
    priority: 30,
    interruptible: true,
    stridePxPerFrame: 8,
    frames: [
      // F0: Contact - FL & BR strike ground (window stationary on touch)
      makeFrame(0, 90, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.85, isFootstep: true, strideDisplacementPx: 0, soundEvent: 'step' }),
      // F1: Stance/Push-off - FL & BR drive body forward (main stride push!)
      makeFrame(1, 90, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.82, strideDisplacementPx: 8 }),
      // F2: Passing/Extension - FR & BL swinging forward
      makeFrame(2, 90, { groundOffset: 0, shadowWidth: 39, shadowOpacity: 0.80, strideDisplacementPx: 4 }),
      // F3: Touchdown prep - stride deceleration
      makeFrame(3, 90, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.82, strideDisplacementPx: 1 }),
      // F4: Contact - FR & BL strike ground
      makeFrame(4, 90, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.85, isFootstep: true, strideDisplacementPx: 0, soundEvent: 'step' }),
      // F5: Stance/Push-off - FR & BL drive body forward (main stride push!)
      makeFrame(5, 90, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.82, strideDisplacementPx: 8 }),
      // F6: Passing/Extension - FL & BR swinging forward
      makeFrame(6, 90, { groundOffset: 0, shadowWidth: 39, shadowOpacity: 0.80, strideDisplacementPx: 4 }),
      // F7: Touchdown prep - completing full stride
      makeFrame(7, 90, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.82, strideDisplacementPx: 1 }),
    ],
  },

  // 3. Walk Start (3 frames transition from stand into walk)
  'walk-start': {
    id: 'walk-start',
    name: 'Walk Start (3f)',
    loop: false,
    defaultFps: 10,
    priority: 30,
    interruptible: true,
    transitionTo: 'walk',
    stridePxPerFrame: 4,
    frames: [
      makeFrame(0, 100, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82, strideDisplacementPx: 2 }),
      makeFrame(1, 100, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.84, strideDisplacementPx: 5 }),
      makeFrame(2, 100, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.85, strideDisplacementPx: 8, isFootstep: true }),
    ],
  },

  // 4. Walk Stop (3 frames deceleration into standing)
  'walk-stop': {
    id: 'walk-stop',
    name: 'Walk Stop (3f)',
    loop: false,
    defaultFps: 9,
    priority: 30,
    interruptible: true,
    transitionTo: 'idle',
    stridePxPerFrame: 3,
    frames: [
      makeFrame(0, 110, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.84, strideDisplacementPx: 6, isFootstep: true }),
      makeFrame(1, 110, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82, strideDisplacementPx: 2 }),
      makeFrame(2, 120, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.80, strideDisplacementPx: 0 }),
    ],
  },

  // 5. Stepping Turn Left (6 frames: stepping pivot)
  'turn-left': {
    id: 'turn-left',
    name: 'Turn Left (6f)',
    loop: false,
    defaultFps: 10,
    priority: 40,
    interruptible: false,
    transitionTo: 'walk',
    frames: [
      makeFrame(0, 100, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.82 }),
      makeFrame(1, 95, { groundOffset: 0, shadowWidth: 38, shadowOpacity: 0.78, isFootstep: true }),
      makeFrame(2, 95, { groundOffset: 0, shadowWidth: 34, shadowOpacity: 0.76 }),
      makeFrame(3, 95, { groundOffset: 0, shadowWidth: 34, shadowOpacity: 0.76 }),
      makeFrame(4, 95, { groundOffset: 0, shadowWidth: 38, shadowOpacity: 0.78, isFootstep: true }),
      makeFrame(5, 100, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.82 }),
    ],
  },

  // 6. Stepping Turn Right (6 frames: stepping pivot)
  'turn-right': {
    id: 'turn-right',
    name: 'Turn Right (6f)',
    loop: false,
    defaultFps: 10,
    priority: 40,
    interruptible: false,
    transitionTo: 'walk',
    frames: [
      makeFrame(0, 100, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.82 }),
      makeFrame(1, 95, { groundOffset: 0, shadowWidth: 38, shadowOpacity: 0.78, isFootstep: true }),
      makeFrame(2, 95, { groundOffset: 0, shadowWidth: 34, shadowOpacity: 0.76 }),
      makeFrame(3, 95, { groundOffset: 0, shadowWidth: 34, shadowOpacity: 0.76 }),
      makeFrame(4, 95, { groundOffset: 0, shadowWidth: 38, shadowOpacity: 0.78, isFootstep: true }),
      makeFrame(5, 100, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.82 }),
    ],
  },

  // 7. Sit Down (5 frames transition from stand into sit)
  sit: {
    id: 'sit',
    name: 'Sit Down (5f)',
    loop: false,
    defaultFps: 9,
    priority: 20,
    interruptible: true,
    transitionTo: 'sit-idle',
    frames: [
      makeFrame(0, 110, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 110, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.84 }),
      makeFrame(2, 110, { groundOffset: 0, shadowWidth: 46, shadowOpacity: 0.86 }),
      makeFrame(3, 110, { groundOffset: 0, shadowWidth: 47, shadowOpacity: 0.87 }),
      makeFrame(4, 130, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88 }),
    ],
  },

  // 8. Sitting Idle (4 frames sitting breathing)
  'sit-idle': {
    id: 'sit-idle',
    name: 'Sitting Idle (4f)',
    loop: true,
    defaultFps: 6.25,
    priority: 15,
    interruptible: true,
    frames: [
      makeFrame(0, 160, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88 }),
      makeFrame(1, 160, { groundOffset: 0, shadowWidth: 48.5, shadowOpacity: 0.89 }),
      makeFrame(2, 160, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88 }),
      makeFrame(3, 160, { groundOffset: 0, shadowWidth: 47.5, shadowOpacity: 0.87 }),
    ],
  },

  // 9. Stand Up (4 frames transition from sit into stand)
  'stand-up': {
    id: 'stand-up',
    name: 'Stand Up (4f)',
    loop: false,
    defaultFps: 10,
    priority: 25,
    interruptible: false,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 95, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88 }),
      makeFrame(1, 95, { groundOffset: 0, shadowWidth: 46, shadowOpacity: 0.85 }),
      makeFrame(2, 95, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.83 }),
      makeFrame(3, 110, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  // 10. Lie Down (5 frames transition into sleep)
  'lie-down': {
    id: 'lie-down',
    name: 'Lie Down (5f)',
    loop: false,
    defaultFps: 8,
    priority: 20,
    interruptible: true,
    transitionTo: 'sleep',
    frames: [
      makeFrame(0, 120, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.84 }),
      makeFrame(1, 120, { groundOffset: 0, shadowWidth: 46, shadowOpacity: 0.86 }),
      makeFrame(2, 120, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.87 }),
      makeFrame(3, 120, { groundOffset: 0, shadowWidth: 49, shadowOpacity: 0.88 }),
      makeFrame(4, 150, { groundOffset: 0, shadowWidth: 50, shadowOpacity: 0.89 }),
    ],
  },

  // 11. Sleep (6 frames calm breathing slumber, ~3.5 FPS)
  sleep: {
    id: 'sleep',
    name: 'Sleep Breathing (6f)',
    loop: true,
    defaultFps: 3.5,
    priority: 15,
    interruptible: true,
    frames: [
      makeFrame(0, 280, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.75, soundEvent: 'snooze', emote: 'sleepZ' }),
      makeFrame(1, 280, { groundOffset: 0, shadowWidth: 48.5, shadowOpacity: 0.77 }),
      makeFrame(2, 280, { groundOffset: 0, shadowWidth: 49, shadowOpacity: 0.78 }),
      makeFrame(3, 280, { groundOffset: 0, shadowWidth: 48.5, shadowOpacity: 0.77 }),
      makeFrame(4, 280, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.75 }),
      makeFrame(5, 280, { groundOffset: 0, shadowWidth: 47.5, shadowOpacity: 0.74 }),
    ],
  },

  // 12. Wake Up (6 frames: wake -> stretch)
  'wake-up': {
    id: 'wake-up',
    name: 'Wake Up (6f)',
    loop: false,
    defaultFps: 8.5,
    priority: 25,
    interruptible: false,
    transitionTo: 'stretch',
    frames: [
      makeFrame(0, 120, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.75 }),
      makeFrame(1, 120, { groundOffset: 0, shadowWidth: 47, shadowOpacity: 0.78 }),
      makeFrame(2, 120, { groundOffset: 0, shadowWidth: 46, shadowOpacity: 0.82 }),
      makeFrame(3, 130, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.84, soundEvent: 'yawn' }),
      makeFrame(4, 110, { groundOffset: 0, shadowWidth: 43, shadowOpacity: 0.83 }),
      makeFrame(5, 120, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  // 13. Downward Dog Stretch (6 frames)
  stretch: {
    id: 'stretch',
    name: 'Downward Stretch (6f)',
    loop: false,
    defaultFps: 8,
    priority: 25,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 125, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 125, { groundOffset: 0, shadowWidth: 45, shadowOpacity: 0.85 }),
      makeFrame(2, 150, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88 }),
      makeFrame(3, 160, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88 }),
      makeFrame(4, 125, { groundOffset: 0, shadowWidth: 45, shadowOpacity: 0.85 }),
      makeFrame(5, 125, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  // 14. Real Multi-Frame Jump (8 frames, 14 FPS: crouch -> push-off -> airborne -> apex -> landing squash -> recover)
  jump: {
    id: 'jump',
    name: 'Real Quadruped Jump (8f)',
    loop: false,
    defaultFps: 14,
    priority: 70,
    interruptible: false,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 75, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 75, { groundOffset: -2, shadowWidth: 46, shadowOpacity: 0.88 }), // Spring crouch
      makeFrame(2, 65, { groundOffset: 6, shadowWidth: 38, shadowOpacity: 0.70 }),  // Push-off
      makeFrame(3, 70, { groundOffset: 18, shadowWidth: 28, shadowOpacity: 0.45 }), // Airborne ascending
      makeFrame(4, 75, { groundOffset: 28, shadowWidth: 22, shadowOpacity: 0.35, soundEvent: 'chirp', emote: 'sparkles' }), // Peak Apex Leap!
      makeFrame(5, 70, { groundOffset: 14, shadowWidth: 32, shadowOpacity: 0.55 }), // Descending
      makeFrame(6, 85, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.92, isFootstep: true }), // Landing Impact Squash!
      makeFrame(7, 85, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),  // Recovery to stand
    ],
  },

  // 15. Small Jump (alias to jump)
  'small-jump': {
    id: 'small-jump',
    name: 'Small Jump (8f)',
    loop: false,
    defaultFps: 14,
    priority: 60,
    interruptible: false,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 75, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 75, { groundOffset: -2, shadowWidth: 46, shadowOpacity: 0.88 }),
      makeFrame(2, 65, { groundOffset: 6, shadowWidth: 38, shadowOpacity: 0.70 }),
      makeFrame(3, 70, { groundOffset: 18, shadowWidth: 28, shadowOpacity: 0.45 }),
      makeFrame(4, 75, { groundOffset: 28, shadowWidth: 22, shadowOpacity: 0.35, soundEvent: 'chirp' }),
      makeFrame(5, 70, { groundOffset: 14, shadowWidth: 32, shadowOpacity: 0.55 }),
      makeFrame(6, 85, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.92, isFootstep: true }),
      makeFrame(7, 85, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  // 16. Landing Squash (4 frames)
  landing: {
    id: 'landing',
    name: 'Landing Squash (4f)',
    loop: false,
    defaultFps: 12,
    priority: 65,
    interruptible: false,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 80, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.85 }),
      makeFrame(1, 90, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.92 }),
      makeFrame(2, 80, { groundOffset: 0, shadowWidth: 43, shadowOpacity: 0.84 }),
      makeFrame(3, 90, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  // 17. Belly-Up Roll (8 frames: crouch -> roll -> belly-up -> recover)
  'roll-over': {
    id: 'roll-over',
    name: 'Belly-Up Roll (8f)',
    loop: false,
    defaultFps: 10.5,
    priority: 60,
    interruptible: false,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 95, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 95, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.84 }),
      makeFrame(2, 95, { groundOffset: 0, shadowWidth: 46, shadowOpacity: 0.86 }),
      makeFrame(3, 110, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88, emote: 'hearts' }), // Belly-Up Paws in air!
      makeFrame(4, 110, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88 }),
      makeFrame(5, 95, { groundOffset: 0, shadowWidth: 46, shadowOpacity: 0.86 }),
      makeFrame(6, 95, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.84 }),
      makeFrame(7, 100, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  // 18. Ground Sniffing (6 frames)
  sniff: {
    id: 'sniff',
    name: 'Ground Sniff (6f)',
    loop: false,
    defaultFps: 7.7,
    priority: 25,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 130, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 130, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.85 }),
      makeFrame(2, 130, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.85, shadowOffsetX: -3 }),
      makeFrame(3, 130, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.85, shadowOffsetX: 3 }),
      makeFrame(4, 130, { groundOffset: 0, shadowWidth: 43, shadowOpacity: 0.84 }),
      makeFrame(5, 130, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  // 19. Ear Scratching (6 frames, 13.3 FPS rapid scratch)
  'scratch-ear': {
    id: 'scratch-ear',
    name: 'Ear Scratch (6f)',
    loop: true,
    defaultFps: 13.3,
    priority: 35,
    interruptible: true,
    frames: [
      makeFrame(0, 75, { groundOffset: 0, shadowWidth: 46, shadowOpacity: 0.86 }),
      makeFrame(1, 75, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.84 }),
      makeFrame(2, 75, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }), // Stroke 1
      makeFrame(3, 75, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.84 }),
      makeFrame(4, 75, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }), // Stroke 2
      makeFrame(5, 75, { groundOffset: 0, shadowWidth: 46, shadowOpacity: 0.86 }),
    ],
  },

  // 20. Full Body Shake (6 frames, 15 FPS rapid shake)
  'shake-body': {
    id: 'shake-body',
    name: 'Body Shake (6f)',
    loop: false,
    defaultFps: 15.3,
    priority: 45,
    interruptible: false,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 65, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 65, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.80, shadowOffsetX: -3 }),
      makeFrame(2, 65, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.80, shadowOffsetX: 4 }),
      makeFrame(3, 65, { groundOffset: 0, shadowWidth: 41, shadowOpacity: 0.80, shadowOffsetX: -3 }),
      makeFrame(4, 65, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.81 }),
      makeFrame(5, 70, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  // 21. Joyful Celebration (6 frames)
  happy: {
    id: 'happy',
    name: 'Happy Celebration (6f)',
    loop: false,
    defaultFps: 11,
    priority: 50,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 90, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 90, { groundOffset: 2, shadowWidth: 40, shadowOpacity: 0.78 }),
      makeFrame(2, 90, { groundOffset: 6, shadowWidth: 36, shadowOpacity: 0.70, soundEvent: 'chirp', emote: 'sparkles' }),
      makeFrame(3, 90, { groundOffset: 8, shadowWidth: 34, shadowOpacity: 0.65 }),
      makeFrame(4, 90, { groundOffset: 3, shadowWidth: 40, shadowOpacity: 0.78 }),
      makeFrame(5, 90, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  // 22. Dragged / Picked Up by Cursor (4 frames)
  dragged: {
    id: 'dragged',
    name: 'Picked Up (4f)',
    loop: true,
    defaultFps: 8.3,
    priority: 100,
    interruptible: false,
    frames: [
      makeFrame(0, 120, { groundOffset: 25, shadowWidth: 26, shadowOpacity: 0.40, shadowOffsetX: -3, emote: 'surprise' }),
      makeFrame(1, 120, { groundOffset: 25, shadowWidth: 26, shadowOpacity: 0.40 }),
      makeFrame(2, 120, { groundOffset: 25, shadowWidth: 26, shadowOpacity: 0.40, shadowOffsetX: 3 }),
      makeFrame(3, 120, { groundOffset: 25, shadowWidth: 26, shadowOpacity: 0.40 }),
    ],
  },

  // Aliases for personality behaviors
  'play-bow': {
    id: 'play-bow',
    name: 'Play Bow (6f)',
    loop: false,
    defaultFps: 8,
    priority: 50,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 125, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 125, { groundOffset: 0, shadowWidth: 45, shadowOpacity: 0.85 }),
      makeFrame(2, 150, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88, soundEvent: 'chirp' }),
      makeFrame(3, 160, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88 }),
      makeFrame(4, 125, { groundOffset: 0, shadowWidth: 45, shadowOpacity: 0.85 }),
      makeFrame(5, 125, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  'paw-wave': {
    id: 'paw-wave',
    name: 'Paw Wave (6f)',
    loop: false,
    defaultFps: 10,
    priority: 50,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 100, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 100, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.80 }),
      makeFrame(2, 100, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.80, soundEvent: 'chirp', emote: 'musical_note' }),
      makeFrame(3, 100, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.80 }),
      makeFrame(4, 100, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.80 }),
      makeFrame(5, 100, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  'paw-screen': {
    id: 'paw-screen',
    name: 'Paw Screen (6f)',
    loop: false,
    defaultFps: 10,
    priority: 50,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 100, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 100, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.80 }),
      makeFrame(2, 100, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.80, emote: 'hearts' }),
      makeFrame(3, 100, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.80 }),
      makeFrame(4, 100, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.80 }),
      makeFrame(5, 100, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  'tail-chase': {
    id: 'tail-chase',
    name: 'Tail Chase (8f)',
    loop: true,
    defaultFps: 13,
    priority: 60,
    interruptible: true,
    stridePxPerFrame: 4,
    frames: [
      makeFrame(0, 75, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.82, isFootstep: true }),
      makeFrame(1, 75, { groundOffset: 0, shadowWidth: 38, shadowOpacity: 0.80 }),
      makeFrame(2, 75, { groundOffset: 0, shadowWidth: 36, shadowOpacity: 0.78 }),
      makeFrame(3, 75, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.82, isFootstep: true }),
      makeFrame(4, 75, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.82, isFootstep: true }),
      makeFrame(5, 75, { groundOffset: 0, shadowWidth: 38, shadowOpacity: 0.80 }),
      makeFrame(6, 75, { groundOffset: 0, shadowWidth: 36, shadowOpacity: 0.78 }),
      makeFrame(7, 75, { groundOffset: 0, shadowWidth: 40, shadowOpacity: 0.82, isFootstep: true }),
    ],
  },

  'look-around': {
    id: 'look-around',
    name: 'Look Around (6f)',
    loop: false,
    defaultFps: 7,
    priority: 20,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(2, 140, { shadowWidth: 42, shadowOpacity: 0.82, emote: 'question' }),
      makeFrame(3, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(4, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(5, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  surprised: {
    id: 'surprised',
    name: 'Surprised (6f)',
    loop: false,
    defaultFps: 10,
    priority: 75,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 100, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 100, { groundOffset: 4, shadowWidth: 38, shadowOpacity: 0.75, soundEvent: 'chirp', emote: 'surprise' }),
      makeFrame(2, 100, { groundOffset: 6, shadowWidth: 36, shadowOpacity: 0.70 }),
      makeFrame(3, 100, { groundOffset: 6, shadowWidth: 36, shadowOpacity: 0.70 }),
      makeFrame(4, 100, { groundOffset: 2, shadowWidth: 40, shadowOpacity: 0.78 }),
      makeFrame(5, 100, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  confused: {
    id: 'confused',
    name: 'Confused (6f)',
    loop: false,
    defaultFps: 7,
    priority: 40,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 140, { shadowWidth: 42, shadowOpacity: 0.82, emote: 'question' }),
      makeFrame(2, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(3, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(4, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(5, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  curious: {
    id: 'curious',
    name: 'Curious Sniff (6f)',
    loop: false,
    defaultFps: 8,
    priority: 40,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 125, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 125, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.85 }),
      makeFrame(2, 125, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.85, emote: 'sparkles' }),
      makeFrame(3, 125, { groundOffset: 0, shadowWidth: 44, shadowOpacity: 0.85 }),
      makeFrame(4, 125, { groundOffset: 0, shadowWidth: 43, shadowOpacity: 0.84 }),
      makeFrame(5, 125, { groundOffset: 0, shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },

  bored: {
    id: 'bored',
    name: 'Bored Sigh (4f)',
    loop: true,
    defaultFps: 5,
    priority: 15,
    interruptible: true,
    frames: [
      makeFrame(0, 200, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88, soundEvent: 'yawn' }),
      makeFrame(1, 200, { groundOffset: 0, shadowWidth: 48.5, shadowOpacity: 0.89 }),
      makeFrame(2, 200, { groundOffset: 0, shadowWidth: 48, shadowOpacity: 0.88 }),
      makeFrame(3, 200, { groundOffset: 0, shadowWidth: 47.5, shadowOpacity: 0.87 }),
    ],
  },

  yawn: {
    id: 'yawn',
    name: 'Sleepy Yawn (6f)',
    loop: false,
    defaultFps: 7,
    priority: 25,
    interruptible: true,
    transitionTo: 'idle',
    frames: [
      makeFrame(0, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
      makeFrame(1, 140, { shadowWidth: 43, shadowOpacity: 0.83 }),
      makeFrame(2, 160, { shadowWidth: 44, shadowOpacity: 0.84, soundEvent: 'yawn' }),
      makeFrame(3, 160, { shadowWidth: 44, shadowOpacity: 0.84 }),
      makeFrame(4, 140, { shadowWidth: 43, shadowOpacity: 0.83 }),
      makeFrame(5, 140, { shadowWidth: 42, shadowOpacity: 0.82 }),
    ],
  },
};