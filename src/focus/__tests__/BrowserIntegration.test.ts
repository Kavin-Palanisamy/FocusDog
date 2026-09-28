import { normalizeBrowserUrl } from '../../../browser-extension/src/normalizer';
import { createSiteRule } from '../models/SiteRule';
import { MockTimeProvider } from '../timer/TimeProvider';
import { MockBrowserActivityProvider } from '../provider/BrowserActivityProvider';
import { RealBrowserActivityProvider } from '../provider/RealBrowserActivityProvider';
import { FocusEngine } from '../engine/FocusEngine';

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

export async function runBrowserIntegrationTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('\n--- Running FocusDog Browser Integration Unit Tests ---\n');

  // TEST 1: Chrome URL message handling
  test('1. Chrome URL message handling and provider emission', () => {
    const provider = new RealBrowserActivityProvider();
    provider.start();

    let emittedTab: any = null;
    provider.onActiveTabChange((tab) => {
      emittedTab = tab;
    });

    provider.handleNativePayload({
      type: 'ACTIVE_TAB_CHANGED',
      browser: 'chrome',
      url: 'https://youtube.com/shorts/test1',
      title: 'YouTube Shorts',
      focused: true,
    });

    assert(emittedTab !== null, 'Emitted tab is not null');
    assertEquals(emittedTab.url, 'https://youtube.com/shorts/test1', 'URL preserved');
    assertEquals(emittedTab.browser, 'chrome', 'Identified as Chrome');
    assertEquals(provider.getCurrentBrowser(), 'chrome', 'Current browser is chrome');
  });

  // TEST 2: Edge URL message handling
  test('2. Edge URL message handling and browser identity', () => {
    const provider = new RealBrowserActivityProvider();
    provider.start();

    let emittedTab: any = null;
    provider.onActiveTabChange((tab) => {
      emittedTab = tab;
    });

    provider.handleNativePayload({
      type: 'ACTIVE_TAB_CHANGED',
      browser: 'edge',
      url: 'https://reddit.com/r/programming',
      title: 'Reddit Programming',
      focused: true,
    });

    assert(emittedTab !== null, 'Emitted tab is not null');
    assertEquals(emittedTab.browser, 'edge', 'Identified as Edge');
    assertEquals(provider.getCurrentBrowser(), 'edge', 'Current browser is edge');
  });

  // TEST 3: URL normalization (domain extraction & path preservation)
  test('3. URL normalization (domain extraction, path preservation, www stripping)', () => {
    const res1 = normalizeBrowserUrl('https://www.youtube.com/watch?v=123');
    assertEquals(res1.domain, 'youtube.com', 'Stripped www and protocol');
    assertEquals(res1.path, '/watch', 'Path extracted');
    assertEquals(res1.normalizedUrl, 'youtube.com/watch', 'Combined normalized URL');

    const res2 = normalizeBrowserUrl('https://youtube.com/shorts/abc/');
    assertEquals(res2.normalizedUrl, 'youtube.com/shorts/abc', 'Preserves specific subpath and strips trailing slash');

    const res3 = normalizeBrowserUrl('https://www.reddit.com/r/programming');
    assertEquals(res3.normalizedUrl, 'reddit.com/r/programming', 'Reddit normalized cleanly');
  });

  // TEST 4: Malformed message handling
  test('4. Malformed message handling (invalid JSON, unknown types, oversized)', () => {
    const provider = new RealBrowserActivityProvider();
    provider.start();

    let emitCount = 0;
    provider.onActiveTabChange((_tab) => {
      emitCount++;
    });

    const initialCount = emitCount;

    // Ignored unknown message types
    provider.handleNativePayload({
      type: 'UNKNOWN_TYPE_INJECTION',
      browser: 'chrome',
      url: 'https://evil.com',
    });
    assertEquals(emitCount, initialCount, 'Unknown message types do not trigger emission');

    // Null / empty payload
    provider.handleNativePayload(null as any);
    assertEquals(emitCount, initialCount, 'Null payloads are rejected safely without emission');
  });

  // TEST 5: Browser focus loss
  test('5. Browser focus loss (pauses active site timer)', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const rule = createSiteRule('youtube.com', 10); // 600s
    const engine = new FocusEngine({
      rules: [rule],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });

    activity.setActiveTab('https://youtube.com', 'chrome');
    engine.tick();
    assertEquals(engine.getTimerStatus(), 'ACTIVE', 'Timer active on YouTube');

    clock.advanceSeconds(30);
    engine.tick();
    assertEquals(engine.getRemainingSeconds(), 570, '570s remaining');

    // Browser loses focus (switched to desktop / other app)
    activity.setActiveTab(null);
    engine.tick();

    assertEquals(engine.getTimerStatus(), 'PAUSED', 'Timer paused on focus loss');
    assertEquals(engine.getActiveSite(), null, 'Active site is null');

    // Advance 100 seconds while working on desktop
    clock.advanceSeconds(100);
    engine.tick();

    const stateWhileOnDesktop = engine.getAllTimerStates().find(s => s.domain === 'youtube.com');
    assertEquals(stateWhileOnDesktop?.remainingSeconds, 570, 'Budget remained frozen at 570s while away');

    // Return to YouTube
    activity.setActiveTab('https://youtube.com', 'chrome');
    engine.tick();
    assertEquals(engine.getRemainingSeconds(), 570, 'Timer resumed at exactly 570s');
  });

  // TEST 6: Browser tab activation
  test('6. Browser tab activation switches tracked rule', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const ruleYt = createSiteRule('youtube.com', 10);
    const ruleReddit = createSiteRule('reddit.com', 15);
    const engine = new FocusEngine({
      rules: [ruleYt, ruleReddit],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });

    activity.setActiveTab('https://youtube.com', 'chrome');
    engine.tick();
    assertEquals(engine.getMatchingRule()?.domain, 'youtube.com', 'Matches YouTube');

    activity.setActiveTab('https://reddit.com/r/technology', 'chrome');
    engine.tick();
    assertEquals(engine.getMatchingRule()?.domain, 'reddit.com', 'Switched to Reddit');
  });

  // TEST 7: Tab navigation (URL update within same tab)
  test('7. Tab navigation within same tab updates rule matching', () => {
    const clock = new MockTimeProvider(1000);
    const activity = new MockBrowserActivityProvider();
    const ruleRoot = createSiteRule('youtube.com', 30);
    const ruleShorts = createSiteRule('youtube.com/shorts', 5);
    const engine = new FocusEngine({
      rules: [ruleRoot, ruleShorts],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });

    activity.setActiveTab('https://youtube.com/feed', 'chrome');
    engine.tick();
    assertEquals(engine.getMatchingRule()?.allowanceMinutes, 30, 'Feed matches 30m root rule');

    // User clicks a Shorts video within YouTube
    activity.setActiveTab('https://youtube.com/shorts/funny_dog', 'chrome');
    engine.tick();
    assertEquals(engine.getMatchingRule()?.allowanceMinutes, 5, 'Navigated to Shorts, matches 5m rule');
  });

  // TEST 8: Switching between sites (YouTube -> Reddit)
  test('8. Switching between sites maintains independent timers', () => {
    const clock = new MockTimeProvider(0);
    const activity = new MockBrowserActivityProvider();
    const ruleYt = createSiteRule('youtube.com', 5); // 300s
    const ruleReddit = createSiteRule('reddit.com', 10); // 600s
    const engine = new FocusEngine({
      rules: [ruleYt, ruleReddit],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });

    activity.setActiveTab('https://youtube.com', 'chrome');
    clock.advanceSeconds(60);
    engine.tick();

    // Switch to Reddit
    activity.setActiveTab('https://reddit.com', 'chrome');
    clock.advanceSeconds(45);
    engine.tick();

    const states = engine.getAllTimerStates();
    const ytState = states.find(s => s.domain === 'youtube.com');
    const redditState = states.find(s => s.domain === 'reddit.com');

    assertEquals(ytState?.remainingSeconds, 240, 'YouTube has 240s remaining (300 - 60)');
    assertEquals(redditState?.remainingSeconds, 555, 'Reddit has 555s remaining (600 - 45)');
  });

  // TEST 9 & 10: Desktop focus loss and return to site
  test('9 & 10. Switching to desktop pauses timer; returning resumes exact budget', () => {
    const clock = new MockTimeProvider(0);
    const activity = new MockBrowserActivityProvider();
    const rule = createSiteRule('reddit.com', 10); // 600s
    const engine = new FocusEngine({
      rules: [rule],
      timeProvider: clock,
      activityProvider: activity,
      autoTick: false,
    });

    activity.setActiveTab('https://reddit.com', 'edge');
    clock.advanceSeconds(50);
    engine.tick();
    assertEquals(engine.getRemainingSeconds(), 550, '550s remaining');

    // Switch to desktop
    activity.setActiveTab(null);
    clock.advanceSeconds(300); // 5 minutes on desktop
    engine.tick();

    // Return to Reddit
    activity.setActiveTab('https://reddit.com', 'edge');
    engine.tick();
    assertEquals(engine.getRemainingSeconds(), 550, 'Budget preserved at 550s');

    clock.advanceSeconds(20);
    engine.tick();
    assertEquals(engine.getRemainingSeconds(), 530, 'Counted down to 530s');
  });

  // TEST 11: Special / Internal browser pages
  test('11. Special & internal browser pages treated as untracked', () => {
    const testCases = [
      'chrome://newtab',
      'chrome://settings',
      'edge://extensions',
      'edge://settings/privacy',
      'about:blank',
      'chrome-extension://xyz123/popup.html',
      'file:///C:/Users/test/doc.pdf',
    ];

    for (const url of testCases) {
      const res = normalizeBrowserUrl(url);
      assertEquals(res.isTrackable, false, `${url} is marked untrackable`);
      assertEquals(res.normalizedUrl, null, `${url} normalized to null`);
    }
  });

  // TEST 12: Disconnected browser handling & reconnection
  test('12. Disconnected browser handling and reconnection', () => {
    const provider = new RealBrowserActivityProvider();
    provider.start();

    let current: any = null;
    provider.onActiveTabChange((tab) => {
      current = tab;
    });

    // Connection active
    provider.handleNativePayload({
      type: 'ACTIVE_TAB_CHANGED',
      browser: 'chrome',
      url: 'https://youtube.com',
      focused: true,
    });
    assert(current !== null, 'Connected tab active');

    // Browser disconnects / loses window
    provider.handleNativePayload({
      type: 'ACTIVE_TAB_CHANGED',
      browser: 'chrome',
      url: null,
      focused: false,
    });
    assertEquals(current, null, 'Cleanly transitioned to null (desktop/paused)');

    // Reconnection / window returns
    provider.handleNativePayload({
      type: 'ACTIVE_TAB_CHANGED',
      browser: 'chrome',
      url: 'https://youtube.com/shorts/dog',
      focused: true,
    });
    assertEquals(current.url, 'https://youtube.com/shorts/dog', 'Reconnected and resumed tracking');
  });

  console.log(`Browser Integration Test Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    throw new Error(`${failed} browser integration tests failed`);
  }

  return { passed, failed };
}

// Auto-run if executed directly
runBrowserIntegrationTests().catch((e) => {
  console.error(e);
  if (typeof (globalThis as any).process !== 'undefined') {
    (globalThis as any).process.exit(1);
  }
});
