import { useState, useEffect } from 'react';
import { FocusEngine } from '../engine/FocusEngine';
import { DevTestControls } from '../provider/DevTestControls';
import { TimerStatus, SiteTimerState } from '../models/TimerState';
import { SiteRule, createSiteRule } from '../models/SiteRule';
import { SiteRule as SettingsSiteRule, PatrolSettings as SettingsPatrol } from '../../models/settings';
import { RealBrowserActivityProvider } from '../provider/RealBrowserActivityProvider';
import { MockBrowserActivityProvider } from '../provider/BrowserActivityProvider';
import { EnforcementController } from '../enforcement/EnforcementController';
import { RealBrowserEnforcementProvider, MockBrowserEnforcementProvider } from '../enforcement/BrowserEnforcementProvider';
import { EnforcementSession } from '../enforcement/EnforcementState';

// Check if running inside Tauri native runtime
const isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Initialize activity provider (real for desktop Tauri runtime, mock for tests/web)
export const activeActivityProvider = isTauriEnv
  ? new RealBrowserActivityProvider()
  : new MockBrowserActivityProvider();

export const sharedFocusEngine = new FocusEngine({
  activityProvider: activeActivityProvider,
  autoTick: true,
  tickIntervalMs: 500,
});

export const activeEnforcementProvider = isTauriEnv
  ? new RealBrowserEnforcementProvider()
  : new MockBrowserEnforcementProvider();

export const sharedEnforcementController = new EnforcementController({
  focusEngine: sharedFocusEngine,
  enforcementProvider: activeEnforcementProvider,
});

export const sharedDevControls = new DevTestControls(sharedFocusEngine);

export function useFocusEngine(settingsRules?: SettingsSiteRule[], settingsPatrol?: SettingsPatrol) {
  // Synchronize rules from settings whenever they change
  useEffect(() => {
    if (settingsRules && Array.isArray(settingsRules)) {
      const converted: SiteRule[] = [];
      for (const r of settingsRules) {
        try {
          converted.push(
            createSiteRule(r.url, r.minutes, {
              id: r.id || r.url,
              enabled: r.enabled !== false,
            })
          );
        } catch {
          // Ignore invalid rules gracefully
        }
      }
      sharedFocusEngine.setRules(converted);
    }
  }, [settingsRules]);

  // Synchronize patrol settings into enforcement controller
  useEffect(() => {
    if (settingsPatrol) {
      sharedEnforcementController.updatePolicy({
        enabled: settingsPatrol.enabled,
        catchAction: settingsPatrol.catchAction,
        countdownSeconds: settingsPatrol.countdownSeconds,
        snoozeMinutes: settingsPatrol.snoozeMinutes,
      });
    }
  }, [settingsPatrol]);

  const [activeSite, setActiveSite] = useState<string | null>(sharedFocusEngine.getActiveSite());
  const [matchingRule, setMatchingRule] = useState<SiteRule | null>(sharedFocusEngine.getMatchingRule());
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(sharedFocusEngine.getRemainingSeconds());
  const [timerStatus, setTimerStatus] = useState<TimerStatus>(sharedFocusEngine.getTimerStatus());
  const [isExpired, setIsExpired] = useState<boolean>(sharedFocusEngine.isExpired());
  const [isSnoozed, setIsSnoozed] = useState<boolean>(sharedFocusEngine.isSnoozed());
  const [snoozeRemaining, setSnoozeRemaining] = useState<number>(sharedFocusEngine.getSnoozeRemainingSeconds());
  const [timerStates, setTimerStates] = useState<SiteTimerState[]>(sharedFocusEngine.getAllTimerStates());
  const [currentBrowser, setCurrentBrowser] = useState<'chrome' | 'edge' | null>(null);
  const [enforcementSession, setEnforcementSession] = useState<EnforcementSession | null>(
    sharedEnforcementController.getCurrentSession()
  );

  useEffect(() => {
    const updateState = () => {
      setActiveSite(sharedFocusEngine.getActiveSite());
      setMatchingRule(sharedFocusEngine.getMatchingRule());
      setRemainingSeconds(sharedFocusEngine.getRemainingSeconds());
      setTimerStatus(sharedFocusEngine.getTimerStatus());
      setIsExpired(sharedFocusEngine.isExpired());
      setIsSnoozed(sharedFocusEngine.isSnoozed());
      setSnoozeRemaining(sharedFocusEngine.getSnoozeRemainingSeconds());
      setTimerStates(sharedFocusEngine.getAllTimerStates());
      setEnforcementSession(sharedEnforcementController.getCurrentSession());

      const provider = sharedFocusEngine.getActivityProvider();
      if (provider && provider.getCurrentBrowser) {
        setCurrentBrowser(provider.getCurrentBrowser());
      }
    };

    updateState();
    const interval = setInterval(updateState, 500);

    const bus = sharedFocusEngine.getEventBus();
    const unsub1 = bus.on('SITE_FOCUS_STARTED', updateState);
    const unsub2 = bus.on('SITE_FOCUS_PAUSED', updateState);
    const unsub3 = bus.on('SITE_ALLOWANCE_EXPIRED', updateState);
    const unsubWarn = bus.on('SITE_ALLOWANCE_WARNING', updateState);
    const unsub4 = bus.on('SNOOZE_STARTED', updateState);
    const unsub5 = bus.on('SNOOZE_ENDED', updateState);

    return () => {
      clearInterval(interval);
      unsub1();
      unsub2();
      unsub3();
      unsubWarn();
      unsub4();
      unsub5();
    };
  }, []);

  return {
    engine: sharedFocusEngine,
    enforcementController: sharedEnforcementController,
    enforcementSession,
    devControls: sharedDevControls,
    activeSite,
    matchingRule,
    remainingSeconds,
    timerStatus,
    isExpired,
    isSnoozed,
    snoozeRemainingSeconds: snoozeRemaining,
    timerStates,
    currentBrowser,
    snooze: (minutes?: number) => sharedFocusEngine.snooze(minutes),
    cancelSnooze: () => sharedFocusEngine.cancelSnooze(),
    resetBudgetForRule: (ruleId: string) => sharedFocusEngine.resetBudgetForRule(ruleId),
    resetAllBudgets: () => sharedFocusEngine.resetAllBudgets(),
  };
}
