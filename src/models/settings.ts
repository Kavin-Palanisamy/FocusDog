export type DogCoat = "cream" | "white" | "black";
export type CatchAction = "close" | "complain";
export type DogState =
  | "idle"
  | "walking"
  | "sitting"
  | "sleeping"
  | "focusing"
  | "warning"
  | "finished"
  | "complaining";

export interface SiteRule {
  id?: string;
  url: string;
  minutes: number;
  enabled?: boolean;
}

export interface PatrolSettings {
  enabled: boolean;
  catchAction: CatchAction;
  countdownSeconds: number;
  snoozeMinutes: number;
}

export interface FocusSettings {
  sites: SiteRule[];
}

export interface DogSettings {
  name: string;
  coat: DogCoat;
  size: number;
  animationSpeed: number;
  wanderEnabled: boolean;
  dozeBetweenWanders: boolean;
}

export interface FocusDogSettings {
  onboardingCompleted: boolean;
  patrol: PatrolSettings;
  focus: FocusSettings;
  dog: DogSettings;
}

export const DEFAULT_SETTINGS: FocusDogSettings = {
  onboardingCompleted: false,
  patrol: {
    enabled: true,
    catchAction: "close",
    countdownSeconds: 5,
    snoozeMinutes: 15,
  },
  focus: {
    sites: [
      { url: "youtube.com", minutes: 20 },
      { url: "instagram.com", minutes: 15 },
      { url: "reddit.com", minutes: 10 },
    ],
  },
  dog: {
    name: "",
    coat: "cream",
    size: 0.9,
    animationSpeed: 1.9,
    wanderEnabled: true,
    dozeBetweenWanders: true,
  },
};