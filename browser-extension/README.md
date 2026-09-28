# FocusDog Browser Extension (Chrome & Microsoft Edge)

Official browser companion extension for the **FocusDog** desktop pet.

## Capabilities & Privacy
- Monitors the active tab's domain and path (e.g. `youtube.com/shorts`, `reddit.com`).
- Tracks window focus changes so the Focus timer pauses when you switch away to another application.
- **Privacy First**: Only communicates locally with the running FocusDog desktop application on your computer (`127.0.0.1:42123`). No telemetry or browsing data is sent to external servers or the internet.
- **No Content Scripts**: Does not inject code or modify web page content.

---

## Installation & Setup

### 1. Register Native Messaging Host on Windows
Open PowerShell as your normal user and run:
```powershell
powershell -ExecutionPolicy Bypass -File .\browser-extension\native_host\install_host.ps1
```
This registers `com.kavin.focusdog` in the Windows Registry for both Google Chrome and Microsoft Edge.

### 2. Load Extension into Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Turn on **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `browser-extension` directory:
   `C:\Users\kavin\Documents\FocusDog\browser-extension`
5. The FocusDog extension icon (🐶) will appear in your Chrome toolbar.

### 3. Load Extension into Microsoft Edge
1. Open Microsoft Edge and navigate to `edge://extensions`.
2. Turn on **Developer mode** (toggle in the bottom-left sidebar).
3. Click **Load unpacked**.
4. Select the `browser-extension` directory:
   `C:\Users\kavin\Documents\FocusDog\browser-extension`
5. The FocusDog extension icon will appear in your Edge toolbar.

---

## Verification & Status

1. Click the FocusDog extension icon in your browser toolbar.
2. The popup will display:
   - **🟢 Connected to FocusDog**
   - **Browser**: Google Chrome or Microsoft Edge
   - **Current Active Site**: Displays the normalized website (e.g. `youtube.com/shorts`) or `Browser unfocused (Desktop)`.
3. Open FocusDog Settings -> **Focus** tab. The **Right Now** telemetry card will dynamically reflect your active browser tab in real time!

---

## Troubleshooting

- **Popup shows "Waiting for FocusDog App"**: Ensure the FocusDog desktop application is running. The extension will automatically reconnect within 2.5 seconds.
- **Internal pages show as untracked**: Browser internal pages (`chrome://`, `edge://`, `about:blank`, new tab pages) are intentionally treated as untracked desktop time so your site allowances are not consumed.
