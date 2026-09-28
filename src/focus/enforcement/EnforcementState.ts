// Enforcement State Models for FocusDog

export type EnforcementStatus =
  | 'IDLE'
  | 'COUNTDOWN'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'CANCELLED';

export type EnforcementAction = 'close' | 'complain';

export type EnforcementCancelReason =
  | 'TAB_CHANGED'
  | 'SITE_CHANGED'
  | 'BROWSER_UNFOCUSED'
  | 'SNOOZED'
  | 'RULE_DISABLED'
  | 'ALLOWANCE_RESET'
  | 'TAB_CLOSED_BY_USER'
  | 'PRE_FLIGHT_FAILED'
  | 'PATROL_DISABLED';

export interface EnforcementSession {
  id: string;
  status: EnforcementStatus;
  action: EnforcementAction;
  browser: 'chrome' | 'edge';
  tabId: number;
  url: string;
  ruleId: string;
  startedAt: number;
  countdownDurationSeconds: number;
  remainingCountdownSeconds: number;
  cancelReason?: EnforcementCancelReason;
}

export interface PatrolPolicy {
  enabled: boolean;
  catchAction: EnforcementAction;
  countdownSeconds: number;
  snoozeMinutes: number;
}
