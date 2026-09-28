import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { IBrowserActivityProvider, BrowserTabInfo } from './BrowserActivityProvider';

interface NativeBrowserActivityPayload {
  type: string;
  browser: string;
  url: string | null;
  title?: string;
  focused?: boolean;
  tabId?: number;
  tab_id?: number;
  timestamp?: number;
}

export class RealBrowserActivityProvider implements IBrowserActivityProvider {
  private currentTab: BrowserTabInfo | null = null;
  private currentBrowser: 'chrome' | 'edge' | null = null;
  private isBrowserFocused: boolean = false;
  private listeners: Set<(tab: BrowserTabInfo | null) => void> = new Set();
  private isRunning: boolean = false;
  private unlistenTauri: UnlistenFn | null = null;
  private isTauri: boolean = false;

  constructor() {
    this.isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  public onActiveTabChange(callback: (tab: BrowserTabInfo | null) => void): () => void {
    this.listeners.add(callback);
    if (this.isRunning) {
      callback(this.currentTab);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.isTauri) {
      try {
        this.unlistenTauri = await listen<NativeBrowserActivityPayload>(
          'browser-activity',
          (event) => {
            this.handleNativePayload(event.payload);
          }
        );
      } catch (err) {
        console.warn('[RealBrowserActivityProvider] Failed to listen to Tauri browser-activity:', err);
      }
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.unlistenTauri) {
      this.unlistenTauri();
      this.unlistenTauri = null;
    }
  }

  public getCurrentBrowser(): 'chrome' | 'edge' | null {
    return this.isBrowserFocused ? this.currentBrowser : null;
  }

  public getIsBrowserFocused(): boolean {
    return this.isBrowserFocused;
  }

  public handleNativePayload(payload: NativeBrowserActivityPayload): void {
    if (!payload || payload.type !== 'ACTIVE_TAB_CHANGED') {
      return;
    }

    const browserId = payload.browser.toLowerCase() === 'edge' ? 'edge' : 'chrome';
    this.currentBrowser = browserId;
    this.isBrowserFocused = payload.focused !== false;

    // If browser window is unfocused or minimized, treat as desktop focus (null tab)
    if (!this.isBrowserFocused || !payload.url) {
      this.currentTab = null;
      this.notifyListeners();
      return;
    }

    // Active foreground tab
    this.currentTab = {
      url: payload.url,
      title: payload.title || '',
      browser: browserId,
      isFocused: true,
      tabId: payload.tabId !== undefined ? payload.tabId : payload.tab_id,
    };

    console.log("[RealBrowserActivityProvider] Activity:", this.currentBrowser, "url:", this.currentTab?.url, "focused:", this.isBrowserFocused);
    this.notifyListeners();
  }

  private notifyListeners(): void {
    if (!this.isRunning) return;
    for (const listener of this.listeners) {
      try {
        listener(this.currentTab);
      } catch (err) {
        console.error('[RealBrowserActivityProvider] Listener error:', err);
      }
    }
  }
}
