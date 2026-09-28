import { DogCoat } from '../../models/settings';
import { DogClipId } from '../animation/AnimationClip';

export interface DogPalette {
  bodyPrimary: string;
  bodyShadow: string;
  belly: string;
  earPrimary: string;
  earInner: string;
  snout: string;
  nose: string;
  eye: string;
  eyeHighlight: string;
  pawPad: string;
  collar: string;
  collarBell: string;
  tanMarkings?: string;
}

export const COAT_PALETTES: Record<DogCoat, DogPalette> = {
  cream: {
    bodyPrimary: '#E8C999',
    bodyShadow: '#D2AC75',
    belly: '#FFF8EB',
    earPrimary: '#C28E53',
    earInner: '#D9A773',
    snout: '#FFF8EB',
    nose: '#2A1D17',
    eye: '#1C1410',
    eyeHighlight: '#FFFFFF',
    pawPad: '#D99182',
    collar: '#E24A3F',
    collarBell: '#FBBF24',
  },
  white: {
    bodyPrimary: '#F8F9FB',
    bodyShadow: '#E1E5EA',
    belly: '#FFFFFF',
    earPrimary: '#EBE5DF',
    earInner: '#F7D6D8',
    snout: '#FFFFFF',
    nose: '#2D3139',
    eye: '#16191E',
    eyeHighlight: '#FFFFFF',
    pawPad: '#F0AAB6',
    collar: '#3B82F6',
    collarBell: '#FBBF24',
  },
  black: {
    bodyPrimary: '#2B2D38',
    bodyShadow: '#1D1E26',
    belly: '#3A3C4B',
    earPrimary: '#1E2028',
    earInner: '#323440',
    snout: '#C49767',
    nose: '#121318',
    eye: '#0D0E12',
    eyeHighlight: '#FFFFFF',
    pawPad: '#544E52',
    collar: '#10B981',
    collarBell: '#FBBF24',
    tanMarkings: '#C49767',
  },
};

export interface ClipAssetMapping {
  folder: string;
  prefix: string;
  frameCount: number;
}

export const CLIP_ASSET_MAP: Record<string, ClipAssetMapping> = {
  walk: { folder: 'walk', prefix: 'walk', frameCount: 8 },
  'walk-start': { folder: 'walk-start', prefix: 'walk_start', frameCount: 3 },
  'walk-stop': { folder: 'walk-stop', prefix: 'walk_stop', frameCount: 3 },
  idle: { folder: 'idle', prefix: 'idle', frameCount: 6 },
  sit: { folder: 'sit', prefix: 'sit', frameCount: 5 },
  'sit-idle': { folder: 'sit_idle', prefix: 'sit_idle', frameCount: 4 },
  'stand-up': { folder: 'stand_up', prefix: 'stand_up', frameCount: 4 },
  sleep: { folder: 'sleep', prefix: 'sleep', frameCount: 6 },
  'lie-down': { folder: 'sit', prefix: 'sit', frameCount: 5 },
  'wake-up': { folder: 'wake', prefix: 'wake', frameCount: 6 },
  stretch: { folder: 'stretch', prefix: 'stretch', frameCount: 6 },
  'play-bow': { folder: 'stretch', prefix: 'stretch', frameCount: 6 },
  jump: { folder: 'jump', prefix: 'jump', frameCount: 8 },
  'small-jump': { folder: 'jump', prefix: 'jump', frameCount: 8 },
  landing: { folder: 'landing', prefix: 'landing', frameCount: 4 },
  roll: { folder: 'roll', prefix: 'roll', frameCount: 8 },
  'roll-over': { folder: 'roll', prefix: 'roll', frameCount: 8 },
  sniff: { folder: 'sniff', prefix: 'sniff', frameCount: 6 },
  curious: { folder: 'sniff', prefix: 'sniff', frameCount: 6 },
  scratch: { folder: 'scratch', prefix: 'scratch', frameCount: 6 },
  'scratch-ear': { folder: 'scratch', prefix: 'scratch', frameCount: 6 },
  shake: { folder: 'shake', prefix: 'shake', frameCount: 6 },
  'shake-body': { folder: 'shake', prefix: 'shake', frameCount: 6 },
  'turn-left': { folder: 'turn', prefix: 'turn', frameCount: 6 },
  'turn-right': { folder: 'turn', prefix: 'turn', frameCount: 6 },
  dragged: { folder: 'dragged', prefix: 'dragged', frameCount: 4 },
  happy: { folder: 'happy', prefix: 'happy', frameCount: 6 },
  'paw-wave': { folder: 'happy', prefix: 'happy', frameCount: 6 },
  'paw-screen': { folder: 'happy', prefix: 'happy', frameCount: 6 },
  'tail-chase': { folder: 'walk', prefix: 'walk', frameCount: 8 },
  'look-around': { folder: 'idle', prefix: 'idle', frameCount: 6 },
  surprised: { folder: 'happy', prefix: 'happy', frameCount: 6 },
  confused: { folder: 'idle', prefix: 'idle', frameCount: 6 },
  bored: { folder: 'sit_idle', prefix: 'sit_idle', frameCount: 4 },
  yawn: { folder: 'wake', prefix: 'wake', frameCount: 6 },
};

export class SpriteAtlas {
  private static imageCache = new Map<string, HTMLImageElement>();
  private static loadingPromises = new Map<string, Promise<HTMLImageElement | null>>();
  private static preloadedCoats = new Set<DogCoat>();

  /**
   * Preload all multi-frame raster sequences for a coat into memory
   */
  public static preloadCoat(coat: DogCoat): void {
    if (this.preloadedCoats.has(coat)) return;
    this.preloadedCoats.add(coat);

    const uniqueFolders = new Set<string>();
    for (const mapping of Object.values(CLIP_ASSET_MAP)) {
      if (uniqueFolders.has(mapping.folder)) continue;
      uniqueFolders.add(mapping.folder);

      for (let i = 0; i < mapping.frameCount; i++) {
        const srcPath = `/dog/${coat}/${mapping.folder}/${mapping.prefix}_${i}.png`;
        this.loadImageByUrl(srcPath);
      }
    }
  }

  /**
   * Get an already loaded image immediately, or null if still loading
   */
  public static getImage(coat: DogCoat, clipId: DogClipId, frameIndex: number = 0): HTMLImageElement | null {
    const mapping = CLIP_ASSET_MAP[clipId] || CLIP_ASSET_MAP.idle;
    const safeIndex = Math.max(0, frameIndex) % mapping.frameCount;
    const fullPath = `/dog/${coat}/${mapping.folder}/${mapping.prefix}_${safeIndex}.png`;
    
    if (this.imageCache.has(fullPath)) {
      return this.imageCache.get(fullPath)!;
    }

    this.loadImageByUrl(fullPath);
    return null;
  }

  private static loadImageByUrl(url: string): Promise<HTMLImageElement | null> {
    if (this.imageCache.has(url)) {
      return Promise.resolve(this.imageCache.get(url)!);
    }
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const promise = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(url, img);
        this.loadingPromises.delete(url);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(url);
        resolve(null);
      };
      img.src = url;
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }
}