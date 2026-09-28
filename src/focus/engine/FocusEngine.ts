import { SiteRule } from '../models/SiteRule';
import { TimerStatus, SiteTimerState } from '../models/TimerState';
import { SiteRuleMatcher, MatchResult } from '../matcher/SiteRuleMatcher';
import { SiteTimerManager } from '../timer/SiteTimerManager';
import { ITimeProvider, SystemTimeProvider } from '../timer/TimeProvider';
import { FocusEventBus } from '../events/FocusEventBus';
import { IBrowserActivityProvider, MockBrowserActivityProvider, BrowserTabInfo } from '../provider/BrowserActivityProvider';

export interface FocusEngineOptions {
  rules?: SiteRule[];
  timeProvider?: ITimeProvider;
  activityProvider?: IBrowserActivityProvider;
  warningThresholdSeconds?: number;
  snoozeDurationMinutes?: number;
  autoTick?: boolean;
  tickIntervalMs?: number;
}

export class FocusEngine {
  private rules: SiteRule[] = [];
  private eventBus: FocusEventBus;
  private timeProvider: ITimeProvider;
  private activityProvider: IBrowserActivityProvider;
  private timerManager: SiteTimerManager;

  private currentTab: BrowserTabInfo | null = null;
  private activeMatch: MatchResult | null = null;
  private isRunning: boolean = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeActivity: (() => void) | null = null;

  constructor(options: FocusEngineOptions = {}) {
    this.eventBus = new FocusEventBus();
    this.timeProvider = options.timeProvider || new SystemTimeProvider();
    this.activityProvider = options.activityProvider || new MockBrowserActivityProvider();
    this.rules = options.rules || [];

    // Initialize Timer Manager
    this.timerManager = new SiteTimerManager(this.rules, {
      timeProvider: this.timeProvider,
      warningThresholdSeconds: options.warningThresholdSeconds !== undefined ? options.warningThresholdSeconds : 60,
      callbacks: {
        onWarning: (site, rule, remaining) => {
          this.eventBus.emit('SITE_ALLOWANCE_WARNING', {
            site,
            rule,
            remainingSeconds: remaining,
            timestamp: this.timeProvider.now(),
          });
        },
        onExpired: (site, rule) => {
          this.eventBus.emit('SITE_ALLOWANCE_EXPIRED', {
            site,
            rule,
            timestamp: this.timeProvider.now(),
          });
        },
      },
    });

    // Subscribe to activity provider
    this.activityProvider.start();
    this.unsubscribeActivity = this.activityProvider.onActiveTabChange((tab) => {
      this.handleTabChange(tab);
    });

    if (options.autoTick !== false) {
      this.start(options.tickIntervalMs || 250);
    }
  }

  public start(tickIntervalMs: number = 250): void {
    if (this.isRunning) return;
    this.isRunning = true;

    if (tickIntervalMs > 0 && !this.tickTimer) {
      this.tickTimer = setInterval(() => {
        this.tick();
      }, tickIntervalMs);
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  public destroy(): void {
    this.stop();
    if (this.unsubscribeActivity) {
      this.unsubscribeActivity();
      this.unsubscribeActivity = null;
    }
    this.activityProvider.stop();
  }

  public setRules(rules: SiteRule[]): void {
    this.rules = [...rules];
    this.timerManager.syncRules(this.rules);
    // Re-evaluate current tab against new rules
    this.handleTabChange(this.currentTab);
  }

  public getRules(): SiteRule[] {
    return [...this.rules];
  }

  public getEventBus(): FocusEventBus {
    return this.eventBus;
  }

  public getTimeProvider(): ITimeProvider {
    return this.timeProvider;
  }

  public getActivityProvider(): IBrowserActivityProvider {
    return this.activityProvider;
  }

  // --- Right Now Status API ---

  public getCurrentTab(): BrowserTabInfo | null {
    return this.currentTab ? { ...this.currentTab } : null;
  }

  public getActiveSite(): string | null {
    return this.currentTab?.url || null;
  }

  public getMatchingRule(): SiteRule | null {
    return this.activeMatch?.rule || null;
  }

  public getRemainingSeconds(): number | null {
    const activeTimer = this.timerManager.getActiveTimer();
    return activeTimer ? Math.round(activeTimer.getRemainingSeconds()) : null;
  }

  public getAllowanceMinutes(): number | null {
    return this.activeMatch ? this.activeMatch.rule.allowanceMinutes : null;
  }

  public getTimerStatus(): TimerStatus {
    if (this.isSnoozed()) {
      return 'PAUSED';
    }
    const activeTimer = this.timerManager.getActiveTimer();
    if (!activeTimer) {
      return this.currentTab ? 'UNTRACKED' : 'PAUSED';
    }
    return activeTimer.getStatus();
  }

  public isExpired(): boolean {
    const activeTimer = this.timerManager.getActiveTimer();
    return activeTimer ? activeTimer.getIsExpired() : false;
  }

  public isSnoozed(): boolean {
    return this.timerManager.isSnoozed();
  }

  public getSnoozeRemainingSeconds(): number {
    return this.timerManager.getSnoozeRemainingSeconds();
  }

  public getAllTimerStates(): SiteTimerState[] {
    return this.timerManager.getAllTimerStates();
  }

  // --- Actions ---

  public snooze(minutes: number = 15): void {
    this.timerManager.snooze(minutes);
    this.eventBus.emit('SNOOZE_STARTED', {
      durationMinutes: minutes,
      timestamp: this.timeProvider.now(),
    });
  }

  public cancelSnooze(): void {
    if (this.timerManager.isSnoozed()) {
      this.timerManager.cancelSnooze();
      this.eventBus.emit('SNOOZE_ENDED', {
        timestamp: this.timeProvider.now(),
      });
    }
  }

  public resetBudgetForRule(ruleId: string): void {
    this.timerManager.resetBudgetForRule(ruleId);
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      this.eventBus.emit('SITE_BUDGET_RESET', {
        ruleId,
        allowanceMinutes: rule.allowanceMinutes,
        timestamp: this.timeProvider.now(),
      });
    }
  }

  public resetAllBudgets(): void {
    this.timerManager.resetAllBudgets();
  }

  /**
   * Periodic evaluation of active timers and snooze
   */
  public tick(): void {
    const currentSite = this.currentTab?.url || 'unknown';
    const res = this.timerManager.tick(currentSite);

    if (res.snoozeEnded) {
      this.eventBus.emit('SNOOZE_ENDED', {
        timestamp: this.timeProvider.now(),
      });
    }
  }

  private handleTabChange(tab: BrowserTabInfo | null): void {
    const prevMatch = this.activeMatch;
    this.currentTab = tab;

    if (!tab || !tab.url) {
      this.activeMatch = null;
      this.timerManager.setActiveRule(null);
      if (prevMatch) {
        this.eventBus.emit('SITE_FOCUS_PAUSED', {
          site: prevMatch.matchedUrl,
          rule: prevMatch.rule,
          remainingSeconds: this.timerManager.getTimer(prevMatch.rule.id)?.getRemainingSeconds() || 0,
          timestamp: this.timeProvider.now(),
        });
      }
      return;
    }

    const match = SiteRuleMatcher.match(tab.url, this.rules);
    this.activeMatch = match;

    if (match) {
      this.timerManager.setActiveRule(match.rule, tab.url);
      const timer = this.timerManager.getActiveTimer();
      const remaining = timer ? timer.getRemainingSeconds() : match.rule.allowanceMinutes * 60;

      this.eventBus.emit('SITE_FOCUS_STARTED', {
        site: tab.url,
        rule: match.rule,
        remainingSeconds: remaining,
        timestamp: this.timeProvider.now(),
      });
    } else {
      this.timerManager.setActiveRule(null);
      if (prevMatch) {
        this.eventBus.emit('SITE_FOCUS_PAUSED', {
          site: prevMatch.matchedUrl,
          rule: prevMatch.rule,
          remainingSeconds: this.timerManager.getTimer(prevMatch.rule.id)?.getRemainingSeconds() || 0,
          timestamp: this.timeProvider.now(),
        });
      }
    }
  }
}
