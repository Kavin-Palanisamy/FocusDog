import { FocusEngine } from '../engine/FocusEngine';
import { MockBrowserActivityProvider } from '../provider/BrowserActivityProvider';
import { MockTimeProvider } from '../timer/TimeProvider';

export class DevTestControls {
  private engine: FocusEngine;

  constructor(engine: FocusEngine) {
    this.engine = engine;
  }

  public simulateSite(url: string | null, title?: string): void {
    const provider = this.engine.getActivityProvider();
    if (provider instanceof MockBrowserActivityProvider) {
      provider.setActiveTab(url ? { url, title: title || url } : null);
    }
    this.engine.tick();
  }

  public advanceTime(seconds: number): void {
    const timeProvider = this.engine.getTimeProvider();
    if (timeProvider instanceof MockTimeProvider) {
      timeProvider.advanceSeconds(seconds);
    }
    this.engine.tick();
  }

  public triggerWarning(): void {
    const match = this.engine.getMatchingRule();
    const site = this.engine.getActiveSite() || 'test-site.com';
    if (match) {
      this.engine.getEventBus().emit('SITE_ALLOWANCE_WARNING', {
        site,
        rule: match,
        remainingSeconds: 60,
        timestamp: this.engine.getTimeProvider().now(),
      });
    }
  }

  public triggerExpiry(): void {
    const match = this.engine.getMatchingRule();
    const site = this.engine.getActiveSite() || 'test-site.com';
    if (match) {
      this.engine.getEventBus().emit('SITE_ALLOWANCE_EXPIRED', {
        site,
        rule: match,
        timestamp: this.engine.getTimeProvider().now(),
      });
    }
  }

  public triggerSnooze(minutes: number = 15): void {
    this.engine.snooze(minutes);
  }
}
