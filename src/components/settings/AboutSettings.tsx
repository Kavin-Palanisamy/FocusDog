import React from "react";
import { invoke } from "@tauri-apps/api/core";

export const AboutSettings: React.FC = () => {
  const handleQuit = () => {
    // Attempt exit via Tauri or close
    try {
      window.close();
    } catch {
      // fallback
    }
  };

  const handleVisitWebsite = () => {
    try {
      invoke("plugin:opener|open_url", { url: "https://github.com/focusdog" }).catch(() => {
        window.open("https://github.com/focusdog", "_blank");
      });
    } catch {
      window.open("https://github.com/focusdog", "_blank");
    }
  };

  return (
    <div className="fd-section">
      <div className="fd-section-header">
        <h2 className="fd-section-title">About</h2>
        <p className="fd-section-desc">What you are running, and what it is built on.</p>
      </div>

      <div className="fd-card fd-about-card">
        <div className="fd-about-brand">
          <div className="fd-about-logo">🐶</div>
          <div>
            <h3 className="fd-about-title">FocusDog</h3>
            <span className="fd-about-version">v0.1.0 (Desktop Edition)</span>
          </div>
        </div>

        <p className="fd-about-text">
          FocusDog is your desktop companion for staying mindful, focused, and on track.
          Built with Tauri 2, React, TypeScript, and native Windows desktop integration.
        </p>

        <div className="fd-tray-tip-box">
          <div className="fd-tip-icon">💡</div>
          <div className="fd-tip-text">
            <strong>Desktop Pet Controls:</strong>
            <ul>
              <li><strong>Left-click the dog:</strong> View its current mood and status.</li>
              <li><strong>Right-click the dog:</strong> Reopen this Settings window at any time.</li>
              <li><strong>Double-click the dog:</strong> Pet your dog and receive love hearts!</li>
              <li><strong>System Tray:</strong> FocusDog lives in your Windows notification area (system tray) to let you pause patrol, snooze, or quit.</li>
            </ul>
          </div>
        </div>

        <div className="fd-about-actions">
          <button
            type="button"
            className="fd-btn fd-btn-secondary"
            onClick={handleVisitWebsite}
          >
            Visit the website
          </button>
          <button
            type="button"
            className="fd-btn fd-btn-danger"
            onClick={handleQuit}
          >
            Quit FocusDog
          </button>
        </div>
      </div>
    </div>
  );
};