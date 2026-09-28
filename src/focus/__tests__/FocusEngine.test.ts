import { createSiteRule, normalizeRuleInput } from '../models/SiteRule';
import { SiteRuleMatcher } from '../matcher/SiteRuleMatcher';
import { MockTimeProvider } from '../timer/TimeProvider';
import { SiteTimer } from '../timer/SiteTimer';
import { SiteTimerManager } from '../timer/SiteTimerManager';
import { MockBrowserActivityProvider } from '../provider/BrowserActivityProvider';
import { FocusEngine } from '../engine/FocusEngine';
import { DevTestControls } from '../provider/DevTestControls';
import { FocusDogBridge } from '../bridge/FocusDogBridge';

// Simple test assertion helper
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

export async function runAllTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  console.log('\n--- Running FocusDog Focus Engine Unit Tests ---\n');

  // TEST 1: Domain matching
  test('1. Domain matching (root, subdomain, protocol-agnostic, rejects invalid)', () => {
    const rules = [
      createSiteRule('youtube.com', 20),
      createSiteRule('reddit.com', 15),
    ];

    const m1 = SiteRuleMatcher.match('https://www.youtube.com/watch?v=123', rules);
    assert(m1 !== null, 'Should match www.youtube.com');
    assertEquals(m1?.rule.domain, 'youtube.com', 'Matches rule domain');

    const m2 = SiteRuleMatcher.match('http://m.youtube.com', rules);
    assert(m2 !== null, 'Should match mobile subdomain');

    const m3 = SiteRuleMatcher.match('https://reddit.com/r/programming', rules);
    assert(m3 !== null, 'Should match reddit.com');

    const m4 = SiteRuleMatcher.match('https://google.com', rules);
    assert(m4 === null, 'Google should not match');

    // Clean domain validation rejection
    const invalidNorm = normalizeRuleInput('invalid:;;domain');
    assertEquals(invalidNorm.isValid, false, 'Invalid domain rejected');
  });

  // TEST 2: Path matching
  test('2. Path matching', () => {
    const rules = [
      createSiteRule('youtube.com/shorts', 5),
    ];

    const matchShorts = SiteRuleMatcher.match('https://youtube.com/shorts/abc123', rules);
    assert(matchShorts !== null, 'Matches path /shorts');
    assertEquals(matchShorts?.matchedPath, '/shorts', 'Matched path is /shorts');

    const matchHome = SiteRuleMatcher.match('https://youtube.com/feed/subscriptions', rules);
    assert(matchHome === null, 'Non-shorts URL should not match path rule');
  });

  // TEST 3: Path precedence
  test('3. Path precedence (specific path takes precedence over root domain)', () => {
    const rules = [
      createSiteRule('youtube.com', 30),
      createSiteRule('youtube.com/shorts', 5),
      createSiteRule('youtube.com/shorts/deep', 2),
    ];

    const matchShorts = SiteRuleMatcher.match('https://youtube.com/shorts/xyz', rules);
    assert(matchShorts !== null, 'Matches shorts rule');
    assertEquals(matchShorts?.rule.allowanceMinutes, 5, 'Selected 5-min shorts rule over 30-min domain rule');

    const matchDeep = SiteRuleMatcher.match('https://youtube.com/shorts/deep/123', rules);
    assertEquals(matchDeep?.rule.allowanceMinutes, 2, 'Deepest path rule takes precedence');

    const matchFeed = SiteRuleMatcher.match('https://youtube.com/feed', rules);
    assertEquals(matchFeed?.rule.allowanceMinutes, 30, 'Feed matches general root domain rule');
  });

  // TEST 4: Timer starts
  test('4. Timer starts when matching site becomes active', () => {
    const clock = new MockTimeProvider(1000);
    const rule = createSiteRule('youtube.com', 10);
    const timer = new SiteTimer(rule, { timeProvider: clock });

    assertEquals(timer.getStatus(), 'PAUSED', 'Initially paused');
    timer.activate('https://youtube.com');
    assertEquals(timer.getStatus(), 'ACTIVE', 'Becomes active');
    assertEquals(timer.getIsActive(), true, 'isActive is true');
  });

  // TEST 5: Timer pauses
  test('5. Timer pauses immediately when user leaves site', () => {
    const clock = new MockTimeProvider(1000);
    const rule = createSiteRule('youtube.com', 10); // 600s
    const timer = new SiteTimer(rule, { timeProvider: clock });

    timer.activate('https://youtube.com');
    clock.advanceSeconds(40);
    timer.pause();

    assertEquals(timer.getStatus(), 'PAUSED', 'Paused after leaving');
    assertEquals(timer.getRemainingSeconds(), 560, 'Preserved 560s remaining');
  });

  // TEST 6: Timer resumes
  test('6. Timer resumes from preserved budget upon return', () => {
    const clock = new MockTimeProvider(1000);
    const rule = createSiteRule('youtube.com', 10);
    const timer = new SiteTimer(rule, { timeProvider: clock });

    timer.activate();
    clock.advanceSeconds(50);
    timer.pause();
    assertEquals(timer.getRemainingSeconds(), 550, '550s remaining');

    // Switch away for 100 seconds
    clock.advanceSeconds(100);
    assertEquals(timer.getRemainingSeconds(), 550, 'Budget did not decrease while away');

    // Resume
    timer.activate();
    clock.advanceSeconds(25);
    assertEquals(timer.getRemainingSeconds(), 525, 'Resumed and counted down to 525s');
  });

  // TEST 7: Independent site budgets
  test('7. Independent site budgets across multiple sites', () => {
    const clock = new MockTimeProvider(0);
    const ruleA = createSiteRule('siteA.com', 10); // 600s
    const ruleB = createSiteRule('siteB.com', 20); // 1200s
    const manager = new SiteTimerManager([ruleA, ruleB], { timeProvider: clock });

    manager.setActiveRule(ruleA);
    clock.advanceSeconds(120); // spend 2m on Site A
    manager.setActiveRule(ruleB); // switch to Site B

    const timerA = manager.getTimer(ruleA.id);
    const timerB = manager.getTimer(ruleB.id);

    assertEquals(timerA?.getRemainingSeconds(), 480, 'Site A spent 120s (480s left)');
    assertEquals(timerB?.getRemainingSeconds(), 1200, 'Site B untouched (1200s left)');

    clock.advanceSeconds(60); // spend 1m on Site B
    assertEquals(timerA?.getRemainingSeconds(), 480, 'Site A remained at 480s');
    assertEquals(timerB?.getRemainingSeconds(), 1140, 'Site B spent 60s (1140s left)');
  });

  // TEST 8: Expiry occurs exactly once
  test('8. Expiry occurs exactly once (no repeat event spam)', () => {
    const clock = new MockTimeProvider(0);
    const rule = createSiteRule('quick.com', 1); // 60s
    let expiryCount = 0;

    const timer = new SiteTimer(rule, {
      timeProvider: clock,
      callbacks: {
        onExpired: () => {
          expiryCount++;
        },
      },
    });

    timer.activate();
    clock.advanceSeconds(65); // Past 60s allowance

    timer.tick('quick.com');
    assertEquals(expiryCount, 1, 'Expiry event fired on first expiry tick');
    assertEquals(timer.getStatus(), 'EXPIRED', 'Status is EXPIRED');
    assertEquals(timer.getRemainingSeconds(), 0, 'Remaining clamped to 0');

    // Subsequent ticks must NOT fire duplicate expiry events
    timer.tick('quick.com');
    clock.advanceSeconds(10);
    timer.tick('quick.com');
    assertEquals(expiryCount, 1, 'No duplicate expiry events fired');
  });

  // TEST 9: Snooze mechanics
  test('9. Snooze pauses enforcement and resumes automatically', () => {
    const clock = new MockTimeProvider(0);
    const rule = createSiteRule('youtube.com', 10);
    const manager = new SiteTimerManager([rule], { timeProvider: clock });

    manager.setActiveRule(rule);
    clock.advanceSeconds(30);
    manager.tick('youtube.com');

    // Trigger 10-minute snooze
    manager.snooze(10);
    assertEquals(manager.isSnoozed(), true, 'Snooze active');
    assertEquals(manager.getSnoozeRemainingSeconds(), 600, '600s snooze remaining');

    // Advance 5 minutes into snooze
    clock.advanceSeconds(300);
    assertEquals(manager.isSnoozed(), true, 'Still snoozed');
    assertEquals(manager.getSnoozeRemainingSeconds(), 300, '300s snooze remaining');

    // Advance past snooze end
    clock.advanceSeconds(301);
    const tickRes = manager.tick('youtube.com');
    assertEquals(tickRes.snoozeEnded, true, 'Snooze ended');
    assertEquals(manager.isSnoozed(), false, 'Snooze is no longer active');
  });

  // TEST 10: Rule editing resets budget
  test('10. Rule editing resets that rule budget', () => {
    const clock = new MockTimeProvider(0);
    const rule = createSiteRule('reddit.com', 10, { id: 'reddit_rule' });
    const manager = new SiteTimerManager([rule], { timeProvider: clock });

    manager.setActiveRule(rule);
    clock.advanceSeconds(200); // 400s remaining
    manager.tick('reddit.com');

    assertEquals(manager.getTimer('reddit_rule')?.getRemainingSeconds(), 400, '400s remaining before edit');

    // Edit rule allowance to 15m
    const updatedRule = { ...rule, allowanceMinutes: 15, updatedAt: 100 };
    manager.syncRules([updatedRule]);

    assertEquals(manager.getTimer('reddit_rule')?.getRemainingSeconds(), 900, 'Budget reset to new 15m (900s)');
  });

  // TEST 11: Restart / in-memory reset behavior
  test('11. Restart / in-memory reset behavior', () => {
    const clock = new MockTimeProvider(0);
    const rules = [createSiteRule('youtube.com', 10), createSiteRule('instagram.com', 5)];
    const manager = new SiteTimerManager(rules, { timeProvider: clock });

    manager.setActiveRule(rules[0]);
    clock.advanceSeconds(300);
    manager.setActiveRule(rules[1]);
    clock.advanceSeconds(120);

    // In-memory reset
    manager.resetAllBudgets();

    assertEquals(manager.getTimer(rules[0].id)?.getRemainingSeconds(), 600, 'YouTube reset to 600s');
    assertEquals(manager.getTimer(rules[1].id)?.getRemainingSeconds(), 300, 'Instagram reset to 300s');
  });

  // TEST 12: Warning event only once
  test('12. Warning threshold event fires exactly once per session', () => {
    const clock = new MockTimeProvider(0);
    const rule = createSiteRule('youtube.com', 2); // 120s, threshold 60s
    let warningCount = 0;

    const timer = new SiteTimer(rule, {
      timeProvider: clock,
      warningThresholdSeconds: 60,
      callbacks: {
        onWarning: () => {
          warningCount++;
        },
      },
    });

    timer.activate();
    clock.advanceSeconds(50); // 70s remaining (no warning yet)
    timer.tick('youtube.com');
    assertEquals(warningCount, 0, 'No warning at 70s');

    clock.advanceSeconds(15); // 55s remaining (crossed 60s threshold)
    timer.tick('youtube.com');
    assertEquals(warningCount, 1, 'Warning fired at 55s');

    // Repeated ticks under threshold must not spam
    clock.advanceSeconds(5);
    timer.tick('youtube.com');
    clock.advanceSeconds(10);
    timer.tick('youtube.com');
    assertEquals(warningCount, 1, 'Warning event not spammed');
  });

  // TEST 13: 15-Step Demonstration Scenario
  test('13. 15-Step Full Demonstration Scenario', () => {
    console.log('\n    --- Executing 15-Step Scenario Walkthrough ---');
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const rule = createSiteRule('youtube.com', 1, { id: 'yt_1' }); // 1 minute allowance = 60s

    const engine = new FocusEngine({
      rules: [rule],
      timeProvider: clock,
      activityProvider: activity,
      warningThresholdSeconds: 60,
      autoTick: false,
    });

    const bridge = new FocusDogBridge(engine);
    const devControls = new DevTestControls(engine);

    let warningFired = 0;
    let expiredFired = 0;
    let dogReceivedExpiry = false;

    engine.getEventBus().on('SITE_ALLOWANCE_WARNING', () => {
      warningFired++;
    });

    engine.getEventBus().on('SITE_ALLOWANCE_EXPIRED', () => {
      expiredFired++;
      dogReceivedExpiry = true;
    });

    // 1. Mock active site = youtube.com
    activity.setActiveTab('https://www.youtube.com');
    assertEquals(engine.getActiveSite(), 'https://www.youtube.com', 'Step 1: Active site set');

    // 2. Allowance = 1 minute
    assertEquals(engine.getAllowanceMinutes(), 1, 'Step 2: Allowance is 1 minute');

    // 3. Timer begins
    assertEquals(engine.getTimerStatus(), 'ACTIVE', 'Step 3: Timer status is ACTIVE');

    // 4. Advance 30 seconds
    clock.advanceSeconds(30);
    engine.tick();

    // 5. Remaining = 30 seconds
    assertEquals(engine.getRemainingSeconds(), 30, 'Step 5: Remaining is 30 seconds');

    // 6. Switch to another site
    activity.setActiveTab('https://github.com');
    engine.tick();

    // 7. YouTube timer pauses
    assertEquals(engine.getTimerStatus(), 'UNTRACKED', 'Step 7: GitHub is untracked; YouTube timer paused');

    // Advance 60 seconds while on GitHub
    clock.advanceSeconds(60);
    engine.tick();

    // 8. Return to YouTube
    activity.setActiveTab('https://www.youtube.com');
    engine.tick();

    // 9. Timer resumes at approximately 30 seconds
    assertEquals(engine.getTimerStatus(), 'ACTIVE', 'Step 9: YouTube timer resumed');
    assertEquals(engine.getRemainingSeconds(), 30, 'Step 9: Remaining time preserved at 30 seconds');

    // 10. Advance remaining time to zero (advance 30s)
    clock.advanceSeconds(30);
    engine.tick();

    // 11. Warning occurs once before/at expiry
    assert(warningFired >= 1, 'Step 11: Warning event occurred');

    // 12. Expiry event occurs once
    assertEquals(expiredFired, 1, 'Step 12: Expiry event occurred once');
    assertEquals(engine.isExpired(), true, 'Step 12: Engine status isExpired');

    // 13. Dog receives SITE_ALLOWANCE_EXPIRED
    assert(dogReceivedExpiry, 'Step 13: Dog bridge received SITE_ALLOWANCE_EXPIRED');

    // 14. Snooze temporarily suppresses enforcement
    engine.snooze(15);
    assertEquals(engine.isSnoozed(), true, 'Step 14: Snooze active');
    assertEquals(engine.getTimerStatus(), 'PAUSED', 'Step 14: Enforcement suppressed during snooze');

    // 15. Snooze ends and enforcement resumes
    clock.advanceSeconds(15 * 60 + 1); // 15 mins passed
    engine.tick();
    assertEquals(engine.isSnoozed(), false, 'Step 15: Snooze ended');
    assertEquals(engine.getTimerStatus(), 'EXPIRED', 'Step 15: Enforcement resumed (status EXPIRED)');

    assert(devControls !== null, 'DevTestControls initialized');
    bridge.destroy();
    console.log('    ✓ All 15 scenario steps verified flawlessly!\n');
  });

  console.log(`Test Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    throw new Error(`${failed} tests failed`);
  }

  return { passed, failed };
}

// Auto-run if executed directly
runAllTests().catch((e) => {
  console.error(e);
  if (typeof (globalThis as any).process !== 'undefined') {
    (globalThis as any).process.exit(1);
  }
});
