import { SiteRule } from './SiteRule';

export type FocusEventType =
  | 'SITE_FOCUS_STARTED'
  | 'SITE_FOCUS_PAUSED'
  | 'SITE_ALLOWANCE_WARNING'
  | 'SITE_ALLOWANCE_EXPIRED'
  | 'SNOOZE_STARTED'
  | 'SNOOZE_ENDED'
  | 'SITE_BUDGET_RESET';

export interface SiteFocusStartedPayload {
  site: string;
  rule: SiteRule;
  remainingSeconds: number;
  timestamp: number;
}

export interface SiteFocusPausedPayload {
  site: string;
  rule: SiteRule;
  remainingSeconds: number;
  timestamp: number;
}

export interface SiteAllowanceWarningPayload {
  site: string;
  rule: SiteRule;
  remainingSeconds: number;
  timestamp: number;
}

export interface SiteAllowanceExpiredPayload {
  site: string;
  rule: SiteRule;
  timestamp: number;
}

export interface SnoozeStartedPayload {
  durationMinutes: number;
  timestamp: number;
}

export interface SnoozeEndedPayload {
  timestamp: number;
}

export interface SiteBudgetResetPayload {
  ruleId: string;
  allowanceMinutes: number;
  timestamp: number;
}

export interface FocusEventMap {
  SITE_FOCUS_STARTED: SiteFocusStartedPayload;
  SITE_FOCUS_PAUSED: SiteFocusPausedPayload;
  SITE_ALLOWANCE_WARNING: SiteAllowanceWarningPayload;
  SITE_ALLOWANCE_EXPIRED: SiteAllowanceExpiredPayload;
  SNOOZE_STARTED: SnoozeStartedPayload;
  SNOOZE_ENDED: SnoozeEndedPayload;
  SITE_BUDGET_RESET: SiteBudgetResetPayload;
}
