import { FocusEngine } from '../engine/FocusEngine';
import { MockBrowserActivityProvider } from '../provider/BrowserActivityProvider';
import { MockTimeProvider } from '../timer/TimeProvider';
import { createSiteRule } from '../models/SiteRule';
import { EnforcementController } from '../enforcement/EnforcementController';
import { MockBrowserEnforcementProvider } from '../enforcement/BrowserEnforcementProvider';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion Failed: ${message}. Expected "${expected}", got "${actual}"`);
  }
}

export async function runEnforcementTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n--- Running FocusDog Browser Enforcement Unit Tests ---\n');

  // TEST 1: Close-it policy initiates countdown
  await test('1. Close-it policy initiates countdown upon allowance expiry', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 5, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();

    const session = controller.getCurrentSession();
    assert(session !== null, 'Session exists');
    assertEquals(session?.status, 'COUNTDOWN', 'Status is COUNTDOWN');
    assertEquals(session?.action, 'close', 'Action is close');
    assertEquals(session?.tabId, 42, 'Tab ID is 42');
    assertEquals(session?.remainingCountdownSeconds, 5, 'Remaining countdown is 5s');
    controller.destroy();
  });

  // TEST 2: Only-complain policy
  await test('2. Only-complain policy triggers complaint and never closes tab', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    let complained = false;
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'complain', countdownSeconds: 5, snoozeMinutes: 15 },
      onComplaint: () => { complained = true; },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();

    const session = controller.getCurrentSession();
    assert(session !== null, 'Session created');
    assertEquals(session?.status, 'COMPLETED', 'Status is COMPLETED');
    assertEquals(session?.action, 'complain', 'Action is complain');
    assertEquals(complained, true, 'Complaint callback fired');
    assertEquals(enforcement.closedTabs.length, 0, 'No tabs were closed');
    controller.destroy();
  });

  // TEST 3: Countdown starts and executes at zero
  await test('3. Countdown starts with configured seconds and executes at zero', async () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 0, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();

    // 0s countdown executes immediately
    assertEquals(enforcement.closedTabs.length, 1, 'Tab was closed');
    assertEquals(enforcement.closedTabs[0].tabId, 42, 'Correct tabId closed');
    assertEquals(enforcement.closedTabs[0].browser, 'chrome', 'Correct browser closed');
    controller.destroy();
  });

  // TEST 4: Countdown cancellation on tab switch
  await test('4. Countdown cancellation when user leaves the expired site', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 5, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();
    assertEquals(controller.getCurrentSession()?.status, 'COUNTDOWN', 'Countdown began');

    // Switch to github.com in new tab
    activity.setActiveTab({ url: 'https://github.com', browser: 'chrome', isFocused: true, tabId: 43 });
    assertEquals(controller.getCurrentSession()?.status, 'CANCELLED', 'Cancelled');
    assertEquals(controller.getCurrentSession()?.cancelReason, 'TAB_CHANGED', 'Reason is TAB_CHANGED');
    assertEquals(enforcement.closedTabs.length, 0, 'No tab closed');
    controller.destroy();
  });

  // TEST 5: Tab ID validation
  await test('5. Tab ID validation ensures exact numeric tab ID', async () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 0, snoozeMinutes: 15 },
    });

    // Invalid tab ID
    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: -5 });
    clock.advanceSeconds(60);
    engine.tick();

    assertEquals(enforcement.closedTabs.length, 0, 'Invalid tab ID prevented closure');
    controller.destroy();
  });

  // TEST 6: URL validation
  await test('6. URL validation ensures target URL matches expired rule', async () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 5, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();

    // Change URL in same tab before pre-flight
    activity.setActiveTab({ url: 'https://wikipedia.org', browser: 'chrome', isFocused: true, tabId: 42 });
    const executed = await controller.executeEnforcement();

    assertEquals(executed, false, 'Pre-flight rejected mismatch');
    assertEquals(enforcement.closedTabs.length, 0, 'Wikipedia was not closed');
    controller.destroy();
  });

  // TEST 7: Site mismatch cancellation
  await test('7. Site mismatch cancellation', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [
        createSiteRule('youtube.com', 1, { id: 'rule_yt' }),
        createSiteRule('reddit.com', 2, { id: 'rule_reddit' }),
      ],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 5, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();

    // Navigated same tab to reddit
    activity.setActiveTab({ url: 'https://reddit.com', browser: 'chrome', isFocused: true, tabId: 42 });
    assertEquals(controller.getCurrentSession()?.status, 'CANCELLED', 'Session cancelled');
    assertEquals(controller.getCurrentSession()?.cancelReason, 'SITE_CHANGED', 'Reason is SITE_CHANGED');
    controller.destroy();
  });

  // TEST 8: Browser focus loss cancellation
  await test('8. Browser focus loss cancellation', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 5, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();
    assertEquals(controller.getCurrentSession()?.status, 'COUNTDOWN', 'Counting down');

    // Switch away from browser to desktop
    activity.setActiveTab(null);
    assertEquals(controller.getCurrentSession()?.status, 'CANCELLED', 'Cancelled on focus loss');
    assertEquals(controller.getCurrentSession()?.cancelReason, 'BROWSER_UNFOCUSED', 'Reason is BROWSER_UNFOCUSED');
    controller.destroy();
  });

  // TEST 9: Snooze cancellation
  await test('9. Snooze cancellation during countdown', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 5, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();
    assertEquals(controller.getCurrentSession()?.status, 'COUNTDOWN', 'Counting down');

    engine.snooze(15);
    assertEquals(controller.getCurrentSession()?.status, 'CANCELLED', 'Cancelled on snooze');
    assertEquals(controller.getCurrentSession()?.cancelReason, 'SNOOZED', 'Reason is SNOOZED');
    assertEquals(enforcement.closedTabs.length, 0, 'Tab remained open');
    controller.destroy();
  });

  // TEST 10: Rule disabled cancellation
  await test('10. Rule disabled cancellation', async () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 5, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();

    // Disable the rule
    engine.setRules([createSiteRule('youtube.com', 1, { id: 'rule_yt', enabled: false })]);

    const executed = await controller.executeEnforcement();
    assertEquals(executed, false, 'Pre-flight rejected disabled rule');
    assertEquals(enforcement.closedTabs.length, 0, 'No tab closed');
    controller.destroy();
  });

  // TEST 11: Exact tab closure request
  await test('11. Exact tab closure request dispatched with matching tabId and browser', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 0, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'edge', isFocused: true, tabId: 888 });
    clock.advanceSeconds(60);
    engine.tick();

    assertEquals(enforcement.closedTabs.length, 1, '1 tab closed');
    assertEquals(enforcement.closedTabs[0].browser, 'edge', 'Edge browser targeted');
    assertEquals(enforcement.closedTabs[0].tabId, 888, 'Tab 888 targeted');
    controller.destroy();
  });

  // TEST 12: Duplicate enforcement prevention
  await test('12. Duplicate enforcement prevention (no duplicate closures)', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 0, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();

    assertEquals(enforcement.closedTabs.length, 1, 'First closure executed');

    // Second tick on same tab
    engine.tick();
    assertEquals(enforcement.closedTabs.length, 1, 'Duplicate closure prevented');
    controller.destroy();
  });

  // TEST 13: Chrome isolation
  await test('13. Chrome isolation (Chrome expiry does not affect Edge tabs)', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 0, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 101 });
    clock.advanceSeconds(60);
    engine.tick();

    assertEquals(enforcement.closedTabs.length, 1, '1 tab closed');
    assertEquals(enforcement.closedTabs[0].browser, 'chrome', 'Chrome closed');
    assertEquals(enforcement.closedTabs[0].tabId, 101, 'Targeted tabId 101');
    controller.destroy();
  });

  // TEST 14: Edge isolation
  await test('14. Edge isolation (Edge expiry does not affect Chrome tabs)', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 0, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'edge', isFocused: true, tabId: 202 });
    clock.advanceSeconds(60);
    engine.tick();

    assertEquals(enforcement.closedTabs.length, 1, '1 tab closed');
    assertEquals(enforcement.closedTabs[0].browser, 'edge', 'Edge closed');
    assertEquals(enforcement.closedTabs[0].tabId, 202, 'Targeted tabId 202');
    controller.destroy();
  });

  // TEST 15: Stale expiry handling
  await test('15. Stale expiry handling (no action if site is already re-budgeted)', async () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const enforcement = new MockBrowserEnforcementProvider();
    const engine = new FocusEngine({
      rules: [createSiteRule('youtube.com', 1, { id: 'rule_yt' })],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });
    const controller = new EnforcementController({
      focusEngine: engine,
      enforcementProvider: enforcement,
      timeProvider: clock,
      policy: { enabled: true, catchAction: 'close', countdownSeconds: 5, snoozeMinutes: 15 },
    });

    activity.setActiveTab({ url: 'https://youtube.com', browser: 'chrome', isFocused: true, tabId: 42 });
    clock.advanceSeconds(60);
    engine.tick();
    assertEquals(controller.getCurrentSession()?.status, 'COUNTDOWN', 'Countdown started');

    // Reset budget before countdown completes
    engine.resetBudgetForRule('rule_yt');

    const executed = await controller.executeEnforcement();
    assertEquals(executed, false, 'Pre-flight rejected stale expiry');
    assertEquals(enforcement.closedTabs.length, 0, 'No tab closed');
    controller.destroy();
  });

  console.log(`Browser Enforcement Test Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    throw new Error(`${failed} enforcement tests failed`);
  }

  return { passed, failed };
}

// Auto-run if executed directly
runEnforcementTests().catch((e) => {
  console.error(e);
  if (typeof (globalThis as any).process !== 'undefined') {
    (globalThis as any).process.exit(1);
  }
});
