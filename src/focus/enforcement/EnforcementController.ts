import { FocusEngine } from '../engine/FocusEngine';
import { IBrowserEnforcementProvider } from './BrowserEnforcementProvider';
import {
  EnforcementSession,
  EnforcementCancelReason,
  PatrolPolicy,
} from './EnforcementState';
import { ITimeProvider, SystemTimeProvider } from '../timer/TimeProvider';
import { BrowserTabInfo } from '../provider/BrowserActivityProvider';

export interface EnforcementControllerOptions {
  focusEngine: FocusEngine;
  enforcementProvider: IBrowserEnforcementProvider;
  timeProvider?: ITimeProvider;
  policy?: PatrolPolicy;
  onStateChange?: (session: EnforcementSession | null) => void;
  onComplaint?: (session: EnforcementSession) => void;
  onCountdownTick?: (remainingSeconds: number, session: EnforcementSession) => void;
  onTabClosed?: (session: EnforcementSession) => void;
  onCancelled?: (reason: EnforcementCancelReason, session: EnforcementSession) => void;
}

export class EnforcementController {
  private focusEngine: FocusEngine;
  private enforcementProvider: IBrowserEnforcementProvider;
  private timeProvider: ITimeProvider;
  private policy: PatrolPolicy;

  private currentSession: EnforcementSession | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private complainedRules: Set<string> = new Set();
  private executedSessions: Set<string> = new Set();
  private unbindEvents: Array<() => void> = [];

  private onStateChange?: (session: EnforcementSession | null) => void;
  private onComplaint?: (session: EnforcementSession) => void;
  private onCountdownTick?: (remainingSeconds: number, session: EnforcementSession) => void;
  private onTabClosed?: (session: EnforcementSession) => void;
  private onCancelled?: (reason: EnforcementCancelReason, session: EnforcementSession) => void;

  constructor(options: EnforcementControllerOptions) {
    this.focusEngine = options.focusEngine;
    this.enforcementProvider = options.enforcementProvider;
    this.timeProvider = options.timeProvider || new SystemTimeProvider();
    this.policy = options.policy || {
      enabled: true,
      catchAction: 'close',
      countdownSeconds: 5,
      snoozeMinutes: 15,
    };

    this.onStateChange = options.onStateChange;
    this.onComplaint = options.onComplaint;
    this.onCountdownTick = options.onCountdownTick;
    this.onTabClosed = options.onTabClosed;
    this.onCancelled = options.onCancelled;

    this.bindEngineEvents();
  }

  public getPolicy(): PatrolPolicy {
    return { ...this.policy };
  }

  public updatePolicy(partial: Partial<PatrolPolicy>): void {
    this.policy = { ...this.policy, ...partial };

    if (!this.policy.enabled && this.currentSession && this.currentSession.status === 'COUNTDOWN') {
      this.cancelCurrent('PATROL_DISABLED');
    }
  }

  public getCurrentSession(): EnforcementSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  private bindEngineEvents(): void {
    const bus = this.focusEngine.getEventBus();

    // 1. Listen for site allowance expiry
    this.unbindEvents.push(
      bus.on('SITE_ALLOWANCE_EXPIRED', (data) => {
        this.handleSiteExpired(data.site, data.rule.id, data.rule.domain);
      })
    );

    // 2. Listen for snooze activation
    this.unbindEvents.push(
      bus.on('SNOOZE_STARTED', () => {
        if (this.currentSession && this.currentSession.status === 'COUNTDOWN') {
          this.cancelCurrent('SNOOZED');
        }
      })
    );

    // 3. Listen for browser tab changes to evaluate cancellation
    const activityProvider = this.focusEngine.getActivityProvider();
    if (activityProvider) {
      const unsub = activityProvider.onActiveTabChange((tab) => {
        this.handleActiveTabChange(tab);
      });
      this.unbindEvents.push(unsub);
    }
  }

  private handleSiteExpired(_siteUrl: string, ruleId: string, _domain: string): void {
    if (!this.policy.enabled) {
      return;
    }

    if (this.focusEngine.isSnoozed()) {
      return;
    }

    const activityProvider = this.focusEngine.getActivityProvider();
    const currentTab = this.focusEngine.getCurrentTab();

    if (!currentTab || currentTab.isFocused === false) {
      return;
    }

    const browser = (currentTab.browser || activityProvider.getCurrentBrowser?.() || 'chrome') as 'chrome' | 'edge';
    const tabId = currentTab.tabId !== undefined ? currentTab.tabId : 1;

    // Check action: only complain vs close it
    if (this.policy.catchAction === 'complain') {
      if (this.complainedRules.has(ruleId)) {
        // Avoid continuous complaint spam for same session
        return;
      }

      this.complainedRules.add(ruleId);
      const session: EnforcementSession = {
        id: `complain_${ruleId}_${this.timeProvider.now()}`,
        status: 'COMPLETED',
        action: 'complain',
        browser,
        tabId,
        url: currentTab.url,
        ruleId,
        startedAt: this.timeProvider.now(),
        countdownDurationSeconds: 0,
        remainingCountdownSeconds: 0,
      };

      this.currentSession = session;
      this.notifyState();
      this.onComplaint?.(session);
      return;
    }

    // Action: Close it
    // Check if an enforcement session is already active or executed for this tab/rule
    const sessionKey = `${browser}_${tabId}_${ruleId}`;
    if (this.executedSessions.has(sessionKey)) {
      return;
    }

    if (this.currentSession && this.currentSession.status === 'COUNTDOWN') {
      if (this.currentSession.tabId === tabId && this.currentSession.ruleId === ruleId) {
        return; // Already counting down
      }
      this.cancelCurrent('TAB_CHANGED');
    }

    const countdown = Math.max(0, this.policy.countdownSeconds);
    const session: EnforcementSession = {
      id: `enforce_${ruleId}_${this.timeProvider.now()}`,
      status: countdown > 0 ? 'COUNTDOWN' : 'EXECUTING',
      action: 'close',
      browser,
      tabId,
      url: currentTab.url,
      ruleId,
      startedAt: this.timeProvider.now(),
      countdownDurationSeconds: countdown,
      remainingCountdownSeconds: countdown,
    };

    this.currentSession = session;
    this.notifyState();

    if (countdown > 0) {
      this.startCountdown();
    } else {
      this.executeEnforcement();
    }
  }

  private startCountdown(): void {
    this.stopCountdown();

    this.countdownTimer = setInterval(() => {
      if (!this.currentSession || this.currentSession.status !== 'COUNTDOWN') {
        this.stopCountdown();
        return;
      }

      this.currentSession.remainingCountdownSeconds = Math.max(
        0,
        this.currentSession.remainingCountdownSeconds - 1
      );

      this.onCountdownTick?.(this.currentSession.remainingCountdownSeconds, this.currentSession);
      this.notifyState();

      if (this.currentSession.remainingCountdownSeconds <= 0) {
        this.stopCountdown();
        this.executeEnforcement();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  public handleActiveTabChange(tab: BrowserTabInfo | null): void {
    if (!this.currentSession || this.currentSession.status !== 'COUNTDOWN') {
      return;
    }

    // Cancellation Check 1: Focus loss to another window or desktop
    if (!tab || tab.isFocused === false) {
      this.cancelCurrent('BROWSER_UNFOCUSED');
      return;
    }

    // Cancellation Check 2: Switched to a different tab ID
    if (tab.tabId !== undefined && tab.tabId !== this.currentSession.tabId) {
      this.cancelCurrent('TAB_CHANGED');
      return;
    }

    // Cancellation Check 3: Current tab URL no longer matches the expired rule
    const matchingRule = this.focusEngine.getMatchingRule();
    if (!matchingRule || matchingRule.id !== this.currentSession.ruleId) {
      this.cancelCurrent('SITE_CHANGED');
      return;
    }
  }

  /**
   * Final Atomic Pre-Flight Validation (Critical Safety Rule)
   * Evaluates all 8 safety conditions immediately before closing any tab.
   */
  public async executeEnforcement(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    const session = this.currentSession;
    const currentTab = this.focusEngine.getCurrentTab();
    const matchingRule = this.focusEngine.getMatchingRule();
    const isExpired = this.focusEngine.isExpired();
    const isSnoozed = this.focusEngine.isSnoozed();
    const sessionKey = `${session.browser}_${session.tabId}_${session.ruleId}`;

    // 1. Target browser is still focused
    const isBrowserFocused = currentTab ? currentTab.isFocused !== false : false;
    if (!isBrowserFocused) {
      this.cancelCurrent('BROWSER_UNFOCUSED');
      return false;
    }

    // 2. Target tab exists (valid numeric ID)
    if (typeof session.tabId !== 'number' || session.tabId <= 0) {
      this.cancelCurrent('PRE_FLIGHT_FAILED');
      return false;
    }

    // 3. Target tab is still active
    if (!currentTab || (currentTab.tabId !== undefined && currentTab.tabId !== session.tabId)) {
      this.cancelCurrent('TAB_CHANGED');
      return false;
    }

    // 4. Target URL still matches the same site rule
    if (!matchingRule || matchingRule.id !== session.ruleId) {
      this.cancelCurrent('SITE_CHANGED');
      return false;
    }

    // 5. Site's allowance is still expired
    if (!isExpired) {
      this.cancelCurrent('ALLOWANCE_RESET');
      return false;
    }

    // 6. Rule is still enabled
    if (matchingRule.enabled === false) {
      this.cancelCurrent('RULE_DISABLED');
      return false;
    }

    // 7. User has not activated Snooze
    if (isSnoozed) {
      this.cancelCurrent('SNOOZED');
      return false;
    }

    // 8. Enforcement request has not already been executed
    if (this.executedSessions.has(sessionKey)) {
      this.cancelCurrent('PRE_FLIGHT_FAILED');
      return false;
    }

    // ALL 8 CONDITIONS PASSED -> Proceed to execute closure
    session.status = 'EXECUTING';
    this.notifyState();
    this.executedSessions.add(sessionKey);

    const success = await this.enforcementProvider.closeTab(session.browser, session.tabId);

    if (success) {
      session.status = 'COMPLETED';
      this.onTabClosed?.(session);
    } else {
      session.status = 'CANCELLED';
      session.cancelReason = 'PRE_FLIGHT_FAILED';
      this.onCancelled?.('PRE_FLIGHT_FAILED', session);
    }

    this.notifyState();
    return success;
  }

  public cancelCurrent(reason: EnforcementCancelReason): void {
    this.stopCountdown();

    if (this.currentSession && (this.currentSession.status === 'COUNTDOWN' || this.currentSession.status === 'EXECUTING')) {
      this.currentSession.status = 'CANCELLED';
      this.currentSession.cancelReason = reason;
      const sessionCopy = { ...this.currentSession };
      this.onCancelled?.(reason, sessionCopy);
      this.notifyState();
    }
  }

  public resetSessionHistory(): void {
    this.stopCountdown();
    this.currentSession = null;
    this.complainedRules.clear();
    this.executedSessions.clear();
    this.notifyState();
  }

  private notifyState(): void {
    this.onStateChange?.(this.getCurrentSession());
  }

  public destroy(): void {
    this.stopCountdown();
    for (const unsub of this.unbindEvents) {
      unsub();
    }
    this.unbindEvents = [];
  }
}
