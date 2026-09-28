import { invoke } from '@tauri-apps/api/core';

export interface IBrowserEnforcementProvider {
  /** Request browser to close a specific tab by ID */
  closeTab(browser: 'chrome' | 'edge', tabId: number): Promise<boolean>;
}

export class MockBrowserEnforcementProvider implements IBrowserEnforcementProvider {
  public closedTabs: Array<{ browser: 'chrome' | 'edge'; tabId: number; timestamp: number }> = [];
  public shouldSucceed: boolean = true;

  public async closeTab(browser: 'chrome' | 'edge', tabId: number): Promise<boolean> {
    if (!this.shouldSucceed) {
      return false;
    }
    this.closedTabs.push({ browser, tabId, timestamp: Date.now() });
    return true;
  }

  public reset(): void {
    this.closedTabs = [];
    this.shouldSucceed = true;
  }
}

export class RealBrowserEnforcementProvider implements IBrowserEnforcementProvider {
  private isTauri: boolean;

  constructor() {
    this.isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  public async closeTab(browser: 'chrome' | 'edge', tabId: number): Promise<boolean> {
    if (!this.isTauri) {
      console.warn('[RealBrowserEnforcementProvider] Not in Tauri runtime, skipping tab close');
      return false;
    }

    try {
      const result = await invoke<boolean>('send_browser_command', {
        command: {
          type: 'CLOSE_TAB',
          browser,
          tabId,
        },
      });
      return result;
    } catch (err) {
      console.error('[RealBrowserEnforcementProvider] Failed to invoke send_browser_command:', err);
      return false;
    }
  }
}
