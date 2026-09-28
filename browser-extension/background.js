// FocusDog Browser Companion - Service Worker (Manifest V3)

const BRIDGE_PORT = 42123;
const BRIDGE_HTTP_URL = `http://127.0.0.1:${BRIDGE_PORT}/activity`;
const BRIDGE_STATUS_URL = `http://127.0.0.1:${BRIDGE_PORT}/status`;
const BRIDGE_COMMANDS_URL = `http://127.0.0.1:${BRIDGE_PORT}/commands`;
const NATIVE_HOST_NAME = 'com.kavin.focusdog';

let nativePort = null;
let isConnected = false;
let lastSentUrl = null;
let lastSentFocused = null;
let lastSentTabId = null;

// Determine browser identity
const isEdge = typeof navigator !== 'undefined' && navigator.userAgent.includes('Edg/');
const browserType = isEdge ? 'edge' : 'chrome';

/**
 * Normalizes URL into clean domain and path, filtering internal browser pages
 */
function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // Internal and special schemes
  if (/^(chrome|edge|about|chrome-extension|extension|view-source|devtools|file|data|javascript):/i.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    let domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return path ? `${domain}${path}` : domain;
  } catch {
    return null;
  }
}

/**
 * Handle incoming browser commands (e.g. CLOSE_TAB)
 */
async function handleBrowserCommand(cmd) {
  if (!cmd || typeof cmd !== 'object') return;
  if (cmd.type !== 'CLOSE_TAB') return;
  if (cmd.browser && cmd.browser !== browserType) return;
  if (typeof cmd.tabId !== 'number' || cmd.tabId <= 0) return;

  try {
    const tab = await chrome.tabs.get(cmd.tabId);
    if (tab) {
      console.log(`[FocusDog] Enforcing tab close for tabId ${cmd.tabId} (${tab.url})`);
      await chrome.tabs.remove(cmd.tabId);
    }
  } catch (err) {
    console.warn(`[FocusDog] Target tab ${cmd.tabId} could not be closed:`, err);
  }
}

/**
 * Poll pending commands from desktop bridge
 */
async function pollCommands() {
  if (!isConnected) return;
  try {
    const resp = await fetch(`${BRIDGE_COMMANDS_URL}?browser=${browserType}`, {
      method: 'GET',
      cache: 'no-store'
    });
    if (resp.ok) {
      const commands = await resp.json();
      if (Array.isArray(commands)) {
        for (const cmd of commands) {
          await handleBrowserCommand(cmd);
        }
      }
    }
  } catch {
    // Desktop bridge temporarily unavailable
  }
}

/**
 * Ping desktop bridge status
 */
async function checkBridgeStatus() {
  try {
    const resp = await fetch(BRIDGE_STATUS_URL, {
      method: 'GET',
      cache: 'no-store'
    });
    if (resp.ok) {
      if (!isConnected) {
        isConnected = true;
        checkActiveTab();
      }
    } else {
      isConnected = false;
    }
  } catch {
    isConnected = false;
  }

  // Update extension storage for popup
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({
      isConnected: isConnected || Boolean(nativePort),
      browserType
    });
  }
}

/**
 * Send normalized activity message to FocusDog desktop app
 */
async function sendActivityMessage(url, title, focused, tabId) {
  const message = {
    type: 'ACTIVE_TAB_CHANGED',
    browser: browserType,
    url: url || null,
    title: title || '',
    focused: Boolean(focused),
    tabId: typeof tabId === 'number' ? tabId : null,
    timestamp: Date.now()
  };

  // 1. Try Native Messaging if connected
  if (nativePort) {
    try {
      nativePort.postMessage(message);
    } catch {
      nativePort = null;
    }
  }

  // 2. Send via Loopback HTTP POST
  try {
    const resp = await fetch(BRIDGE_HTTP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });
    if (resp.ok) {
      isConnected = true;
    }
  } catch (err) {
    isConnected = false;
  }

  // 3. Store in extension storage for popup status UI
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({
      lastReportedUrl: url,
      lastReportedTitle: title,
      isWindowFocused: focused,
      isConnected: isConnected || Boolean(nativePort),
      browserType
    });
  }
}

/**
 * Check active tab and window focus state
 */
async function checkActiveTab() {
  try {
    const currentWindow = await chrome.windows.getLastFocused({ populate: false });
    const isWindowFocused = currentWindow && currentWindow.focused;

    if (!isWindowFocused) {
      if (lastSentFocused !== false) {
        lastSentFocused = false;
        lastSentUrl = null;
        lastSentTabId = null;
        await sendActivityMessage(null, '', false, null);
      }
      return;
    }

    const windowId = currentWindow ? currentWindow.id : undefined;
    const tabs = await chrome.tabs.query({ active: true, windowId });
    const activeTab = tabs && tabs[0];

    const rawUrl = (activeTab && (activeTab.url || activeTab.pendingUrl)) || null;
    const tabId = (activeTab && typeof activeTab.id === 'number') ? activeTab.id : null;
    const normalized = normalizeUrl(rawUrl);

    if (normalized !== lastSentUrl || lastSentFocused !== true || tabId !== lastSentTabId) {
      lastSentUrl = normalized;
      lastSentFocused = true;
      lastSentTabId = tabId;
      await sendActivityMessage(normalized, (activeTab && activeTab.title) || '', true, tabId);
    }
  } catch (err) {
    // Fail gracefully without crashing
  }
}

// Browser Event Listeners
chrome.tabs.onActivated.addListener(() => {
  checkActiveTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status || (tab && (tab.url || tab.pendingUrl))) {
    checkActiveTab();
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    lastSentFocused = false;
    lastSentUrl = null;
    lastSentTabId = null;
    sendActivityMessage(null, '', false, null);
  } else {
    checkActiveTab();
  }
});

chrome.tabs.onRemoved.addListener(() => {
  checkActiveTab();
});

// Try Native Messaging first
try {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.connectNative) {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    nativePort.onDisconnect.addListener(() => {
      nativePort = null;
    });
    nativePort.onMessage.addListener((msg) => {
      handleBrowserCommand(msg);
    });
  }
} catch {
  nativePort = null;
}

// Initial status check, command polling & periodic heartbeat
checkBridgeStatus();
setInterval(checkBridgeStatus, 2500);
setInterval(pollCommands, 500);
