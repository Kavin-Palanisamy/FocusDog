import { SiteRule } from '../models/SiteRule';
import { SiteTimerState, TimerStatus } from '../models/TimerState';
import { ITimeProvider, SystemTimeProvider } from './TimeProvider';

export interface SiteTimerCallbacks {
  onWarning?: (site: string, rule: SiteRule, remainingSeconds: number) => void;
  onExpired?: (site: string, rule: SiteRule) => void;
}

export class SiteTimer {
  private rule: SiteRule;
  private timeProvider: ITimeProvider;
  private remainingSeconds: number;
  private lastActivatedAt: number | null = null;
  private isActive: boolean = false;
  private isExpired: boolean = false;
  private isWarningEmitted: boolean = false;
  private totalActiveSeconds: number = 0;
  private warningThresholdSeconds: number = 60;
  private callbacks: SiteTimerCallbacks;

  constructor(
    rule: SiteRule,
    options: {
      timeProvider?: ITimeProvider;
      warningThresholdSeconds?: number;
      callbacks?: SiteTimerCallbacks;
    } = {}
  ) {
    this.rule = rule;
    this.timeProvider = options.timeProvider || new SystemTimeProvider();
    this.warningThresholdSeconds = options.warningThresholdSeconds !== undefined ? options.warningThresholdSeconds : 60;
    this.callbacks = options.callbacks || {};

    // Initial budget from rule allowance
    this.remainingSeconds = rule.allowanceMinutes * 60;

    // Zero-minute allowance is expired from the moment it is engaged
    if (this.remainingSeconds <= 0) {
      this.isExpired = true;
    }
  }

  public getRule(): SiteRule {
    return this.rule;
  }

  public getRemainingSeconds(): number {
    if (!this.isActive || this.lastActivatedAt === null || this.isExpired) {
      return this.remainingSeconds;
    }
    const elapsed = (this.timeProvider.now() - this.lastActivatedAt) / 1000;
    return Math.max(0, this.remainingSeconds - elapsed);
  }

  public getStatus(): TimerStatus {
    if (!this.rule.enabled) return 'DISABLED';
    if (this.isExpired) return 'EXPIRED';
    if (this.isActive) return 'ACTIVE';
    return 'PAUSED';
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getIsExpired(): boolean {
    return this.isExpired;
  }

  public getIsWarningEmitted(): boolean {
    return this.isWarningEmitted;
  }

  public activate(_currentUrl?: string): void {
    if (!this.rule.enabled) return;

    if (this.isExpired || this.remainingSeconds <= 0) {
      this.isExpired = true;
      this.remainingSeconds = 0;
      this.isActive = true;
      this.lastActivatedAt = this.timeProvider.now();
      // Emit expiry if not emitted yet
      return;
    }

    if (!this.isActive) {
      this.isActive = true;
      this.lastActivatedAt = this.timeProvider.now();
    }
  }

  public pause(): void {
    if (!this.isActive) return;

    if (this.lastActivatedAt !== null) {
      const elapsed = (this.timeProvider.now() - this.lastActivatedAt) / 1000;
      this.remainingSeconds = Math.max(0, this.remainingSeconds - elapsed);
      this.totalActiveSeconds += elapsed;
    }

    this.isActive = false;
    this.lastActivatedAt = null;

    if (this.remainingSeconds <= 0) {
      this.isExpired = true;
    }
  }

  /**
   * Evaluates current countdown progress and triggers warning or expiry exactly once.
   */
  public tick(currentSiteDisplay: string): { justWarned: boolean; justExpired: boolean } {
    let justWarned = false;
    let justExpired = false;

    if (!this.isActive || this.lastActivatedAt === null) {
      return { justWarned, justExpired };
    }

    const currentRemaining = this.getRemainingSeconds();

    // 1. Warning Threshold Check (fires once per session)
    if (
      !this.isWarningEmitted &&
      currentRemaining <= this.warningThresholdSeconds &&
      currentRemaining > 0
    ) {
      this.isWarningEmitted = true;
      justWarned = true;
      if (this.callbacks.onWarning) {
        this.callbacks.onWarning(currentSiteDisplay, this.rule, Math.round(currentRemaining));
      }
    }

    // 2. Expiry Check (fires once)
    if (currentRemaining <= 0 && !this.isExpired) {
      this.remainingSeconds = 0;
      this.isExpired = true;
      justExpired = true;
      if (this.callbacks.onExpired) {
        this.callbacks.onExpired(currentSiteDisplay, this.rule);
      }
    }

    return { justWarned, justExpired };
  }

  /**
   * Resets this rule's session budget to its full allowance
   */
  public resetBudget(): void {
    this.remainingSeconds = this.rule.allowanceMinutes * 60;
    this.isExpired = this.remainingSeconds <= 0;
    this.isWarningEmitted = false;
    if (this.isActive) {
      this.lastActivatedAt = this.timeProvider.now();
    } else {
      this.lastActivatedAt = null;
    }
  }

  /**
   * Updates the underlying rule. If allowance changed, budget resets.
   */
  public updateRule(newRule: SiteRule): void {
    const allowanceChanged = this.rule.allowanceMinutes !== newRule.allowanceMinutes;
    this.rule = newRule;
    if (allowanceChanged) {
      this.resetBudget();
    }
  }

  public getState(): SiteTimerState {
    const rem = this.getRemainingSeconds();
    return {
      ruleId: this.rule.id,
      domain: this.rule.domain,
      path: this.rule.path,
      allowanceMinutes: this.rule.allowanceMinutes,
      remainingSeconds: Math.round(rem),
      status: this.getStatus(),
      isActive: this.isActive,
      isExpired: this.isExpired,
      isWarningEmitted: this.isWarningEmitted,
      lastActivatedAt: this.lastActivatedAt,
      totalActiveSeconds: Math.round(this.totalActiveSeconds),
    };
  }
}
