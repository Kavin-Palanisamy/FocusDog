function updateUI() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['lastReportedUrl', 'isWindowFocused', 'isConnected', 'browserType'], (data) => {
      const dot = document.getElementById('statusDot');
      const text = document.getElementById('statusText');
      const site = document.getElementById('activeSite');
      const badge = document.getElementById('browserBadge');

      if (badge && data.browserType) {
        badge.textContent = data.browserType === 'edge' ? 'Microsoft Edge' : 'Google Chrome';
      }

      if (data.isConnected) {
        dot.className = 'dot dot-online';
        text.textContent = 'Connected to FocusDog';
        text.style.color = '#10B981';
      } else {
        dot.className = 'dot dot-offline';
        text.textContent = 'Waiting for FocusDog App';
        text.style.color = '#EF4444';
      }

      if (!data.isWindowFocused) {
        site.textContent = 'Browser unfocused (Desktop)';
        site.style.color = '#94A3B8';
      } else if (data.lastReportedUrl) {
        site.textContent = data.lastReportedUrl;
        site.style.color = '#38BDF8';
      } else {
        site.textContent = 'Internal / Untracked Page';
        site.style.color = '#94A3B8';
      }
    });
  }
}

updateUI();
setInterval(updateUI, 1000);
