import { SpriteFrame } from './SpriteFrame';

export type DogClipId =
  | 'idle'
  | 'walk'
  | 'walk-start'
  | 'walk-stop'
  | 'turn-left'
  | 'turn-right'
  | 'sit'
  | 'sit-idle'
  | 'stand-up'
  | 'lie-down'
  | 'sleep'
  | 'wake-up'
  | 'stretch'
  | 'yawn'
  | 'sniff'
  | 'scratch-ear'
  | 'shake-body'
  | 'happy'
  | 'tail-chase'
  | 'roll-over'
  | 'play-bow'
  | 'jump'
  | 'small-jump'
  | 'paw-wave'
  | 'paw-screen'
  | 'look-around'
  | 'surprised'
  | 'confused'
  | 'curious'
  | 'bored'
  | 'dragged'
  | 'landing';

export interface AnimationClip {
  id: DogClipId;
  name: string;
  frames: SpriteFrame[];
  loop: boolean;
  defaultFps: number;
  priority: number;
  interruptible: boolean;
  transitionTo?: DogClipId;
  stridePxPerFrame?: number;
}