import { SiteRule } from '../models/SiteRule';
import { SiteTimerState } from '../models/TimerState';
import { SiteTimer, SiteTimerCallbacks } from './SiteTimer';
import { ITimeProvider, SystemTimeProvider } from './TimeProvider';

export class SiteTimerManager {
  private timers: Map<string, SiteTimer> = new Map();
  private timeProvider: ITimeProvider;
  private activeRuleId: string | null = null;
  private warningThresholdSeconds: number = 60;
  private callbacks: SiteTimerCallbacks;

  // Snooze state
  private isSnoozeActive: boolean = false;
  private snoozeEndTimestamp: number = 0;
  private snoozeDurationMinutes: number = 15;

  constructor(
    rules: SiteRule[] = [],
    options: {
      timeProvider?: ITimeProvider;
      warningThresholdSeconds?: number;
      callbacks?: SiteTimerCallbacks;
    } = {}
  ) {
    this.timeProvider = options.timeProvider || new SystemTimeProvider();
    this.warningThresholdSeconds = options.warningThresholdSeconds !== undefined ? options.warningThresholdSeconds : 60;
    this.callbacks = options.callbacks || {};

    this.syncRules(rules);
  }

  public syncRules(rules: SiteRule[]): void {
    const incomingIds = new Set<string>();

    for (const rule of rules) {
      incomingIds.add(rule.id);
      const existing = this.timers.get(rule.id);
      if (existing) {
        existing.updateRule(rule);
      } else {
        const timer = new SiteTimer(rule, {
          timeProvider: this.timeProvider,
          warningThresholdSeconds: this.warningThresholdSeconds,
          callbacks: this.callbacks,
        });
        this.timers.set(rule.id, timer);
      }
    }

    // Clean up deleted rules
    for (const [id, timer] of this.timers.entries()) {
      if (!incomingIds.has(id)) {
        timer.pause();
        this.timers.delete(id);
        if (this.activeRuleId === id) {
          this.activeRuleId = null;
        }
      }
    }
  }

  public setActiveRule(rule: SiteRule | null, currentUrl?: string): void {
    const newId = rule ? rule.id : null;

    if (this.activeRuleId === newId) {
      return;
    }

    // Pause previously active timer
    if (this.activeRuleId) {
      const prev = this.timers.get(this.activeRuleId);
      if (prev) prev.pause();
    }

    this.activeRuleId = newId;

    // Activate new timer if not snoozed
    if (this.activeRuleId && !this.isSnoozed()) {
      const next = this.timers.get(this.activeRuleId);
      if (next) next.activate(currentUrl);
    }
  }

  public getActiveTimer(): SiteTimer | null {
    return this.activeRuleId ? this.timers.get(this.activeRuleId) || null : null;
  }

  public getTimer(ruleId: string): SiteTimer | null {
    return this.timers.get(ruleId) || null;
  }

  public getAllTimerStates(): SiteTimerState[] {
    return Array.from(this.timers.values()).map(t => t.getState());
  }

  public resetBudgetForRule(ruleId: string): void {
    const timer = this.timers.get(ruleId);
    if (timer) {
      timer.resetBudget();
    }
  }

  public resetAllBudgets(): void {
    for (const timer of this.timers.values()) {
      timer.resetBudget();
    }
  }

  // --- Snooze Engine ---

  public snooze(minutes: number): void {
    this.isSnoozeActive = true;
    this.snoozeDurationMinutes = Math.max(1, minutes);
    this.snoozeEndTimestamp = this.timeProvider.now() + this.snoozeDurationMinutes * 60 * 1000;

    // Pause active timer during snooze
    if (this.activeRuleId) {
      const t = this.timers.get(this.activeRuleId);
      if (t) t.pause();
    }
  }

  public cancelSnooze(): void {
    this.isSnoozeActive = false;
    this.snoozeEndTimestamp = 0;

    // Resume active rule if present
    if (this.activeRuleId) {
      const t = this.timers.get(this.activeRuleId);
      if (t) t.activate();
    }
  }

  public isSnoozed(): boolean {
    if (!this.isSnoozeActive) return false;
    if (this.timeProvider.now() >= this.snoozeEndTimestamp) {
      // Auto-expired snooze
      this.cancelSnooze();
      return false;
    }
    return true;
  }

  public getSnoozeRemainingSeconds(): number {
    if (!this.isSnoozeActive) return 0;
    const remainingMs = this.snoozeEndTimestamp - this.timeProvider.now();
    if (remainingMs <= 0) {
      this.cancelSnooze();
      return 0;
    }
    return Math.max(0, Math.round(remainingMs / 1000));
  }

  /**
   * Periodic tick called by the engine loop
   */
  public tick(currentSiteDisplay: string): { justWarned: boolean; justExpired: boolean; snoozeEnded: boolean } {
    let snoozeEnded = false;

    // Check if snooze expired
    if (this.isSnoozeActive && this.timeProvider.now() >= this.snoozeEndTimestamp) {
      this.cancelSnooze();
      snoozeEnded = true;
    }

    // If still snoozed, enforcement is suppressed
    if (this.isSnoozed()) {
      return { justWarned: false, justExpired: false, snoozeEnded };
    }

    const activeTimer = this.getActiveTimer();
    if (!activeTimer) {
      return { justWarned: false, justExpired: false, snoozeEnded };
    }

    // Advance active timer
    const res = activeTimer.tick(currentSiteDisplay);
    return { ...res, snoozeEnded };
  }
}
