export interface BrowserTabInfo {
  url: string;
  title?: string;
  browser?: 'chrome' | 'edge';
  isFocused?: boolean;
  tabId?: number;
}

export interface IBrowserActivityProvider {
  /** Register callback for active foreground browser tab changes */
  onActiveTabChange(callback: (tab: BrowserTabInfo | null) => void): () => void;
  start(): void;
  stop(): void;
  getCurrentBrowser?(): 'chrome' | 'edge' | null;
}

export class MockBrowserActivityProvider implements IBrowserActivityProvider {
  private currentTab: BrowserTabInfo | null = null;
  private listeners: Set<(tab: BrowserTabInfo | null) => void> = new Set();
  private isRunning: boolean = false;

  public onActiveTabChange(callback: (tab: BrowserTabInfo | null) => void): () => void {
    this.listeners.add(callback);
    if (this.isRunning) {
      callback(this.currentTab);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  public start(): void {
    this.isRunning = true;
  }

  public stop(): void {
    this.isRunning = false;
  }

  public setActiveTab(tab: BrowserTabInfo | string | null, browser: 'chrome' | 'edge' = 'chrome', tabId?: number): void {
    if (typeof tab === 'string') {
      this.currentTab = { url: tab, browser, isFocused: true, tabId: tabId || 101 };
    } else {
      this.currentTab = tab;
    }

    if (this.isRunning) {
      for (const cb of this.listeners) {
        cb(this.currentTab);
      }
    }
  }

  public getActiveTab(): BrowserTabInfo | null {
    return this.currentTab;
  }

  public getCurrentBrowser(): 'chrome' | 'edge' | null {
    return this.currentTab?.browser || null;
  }
}
