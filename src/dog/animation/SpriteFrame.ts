export type EmoteType =
  | 'hearts'
  | 'sleepZ'
  | 'sparkles'
  | 'surprise'
  | 'sweat'
  | 'question'
  | 'musical_note';

export interface SpriteFrame {
  frameIndex: number;
  durationMs: number;
  
  // Image / Canvas source (if using external or pre-rendered sprite atlas)
  sourceCanvas?: HTMLCanvasElement | ImageBitmap;
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;

  // Ground and pivot
  anchorX: number;
  anchorY: number; // Ground line (paws touch here)

  // Grounding & Shadow
  groundOffset: number; // 0 when on ground, positive when lifted/dragged/jumping
  shadow: {
    width: number;
    opacity: number;
    offsetX: number;
  };

  // Kinematic / Physical stride events
  isFootstep?: boolean; // Paws contacting ground (syncs translation & sound)
  strideDisplacementPx?: number; // Physical px advanced during this frame

  // Sound event trigger (optional)
  soundEvent?: 'bark' | 'chirp' | 'yawn' | 'snooze' | 'step';

  // Visual emote
  emote?: EmoteType;
}
