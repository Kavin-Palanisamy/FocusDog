
export type TimerStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'UNTRACKED' | 'DISABLED';

export interface SiteTimerState {
  ruleId: string;
  domain: string;
  path?: string;
  allowanceMinutes: number;
  remainingSeconds: number;
  status: TimerStatus;
  isActive: boolean;
  isExpired: boolean;
  isWarningEmitted: boolean;
  lastActivatedAt: number | null;
  totalActiveSeconds: number;
}
