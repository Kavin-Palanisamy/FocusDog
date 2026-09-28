import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "../../hooks/useSettings";
import { PatrolSettings } from "./PatrolSettings";
import { FocusSettings } from "./FocusSettings";
import { DogSettings } from "./DogSettings";
import { AboutSettings } from "./AboutSettings";
import "../../styles/settings/settings.css";

type TabId = "patrol" | "focus" | "dog" | "about";

export const SettingsShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("patrol");
  const {
    settings,
    loading,
    saving,
    updatePatrol,
    updateDog,
    addFocusSite,
    updateFocusSite,
    removeFocusSite,
    saveAndStart,
  } = useSettings();

  const handleCancel = async () => {
    try {
      await invoke("close_settings_window");
    } catch (err) {
      console.warn("Could not invoke close_settings_window:", err);
    }
  };

  if (loading) {
    return (
      <div className="fd-loading-screen">
        <div className="fd-spinner" />
        <p>Loading FocusDog settings...</p>
      </div>
    );
  }

  const navItems: Array<{ id: TabId; label: string; icon: string }> = [
    { id: "patrol", label: "Patrol", icon: "🛡️" },
    { id: "focus", label: "Focus", icon: "🎯" },
    { id: "dog", label: "The Dog", icon: "🐶" },
    { id: "about", label: "About", icon: "ℹ️" },
  ];

  return (
    <div className="fd-settings-layout">
      {/* Left Sidebar Navigation */}
      <aside className="fd-sidebar">
        <div className="fd-sidebar-brand">
          <span className="fd-brand-icon">🐶</span>
          <div className="fd-brand-text">
            <h1 className="fd-brand-title">FocusDog</h1>
            <span className="fd-brand-badge">Desktop Pet</span>
          </div>
        </div>

        <nav className="fd-nav" aria-label="Settings Navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`fd-nav-item ${activeTab === item.id ? "fd-nav-active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="fd-nav-icon">{item.icon}</span>
              <span className="fd-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="fd-sidebar-footer">
          <span className="fd-footer-ver">FocusDog v0.1.0</span>
        </div>
      </aside>

      {/* Main Settings Content */}
      <main className="fd-main-content">
        <div className="fd-content-body">
          {activeTab === "patrol" && (
            <PatrolSettings patrol={settings.patrol} onChange={updatePatrol} />
          )}

          {activeTab === "focus" && (
            <FocusSettings
              focus={settings.focus}
              onAddSite={addFocusSite}
              onUpdateSite={updateFocusSite}
              onRemoveSite={removeFocusSite}
            />
          )}

          {activeTab === "dog" && (
            <DogSettings dog={settings.dog} onChange={updateDog} />
          )}

          {activeTab === "about" && <AboutSettings />}
        </div>

        {/* Sticky Bottom Action Bar */}
        <footer className="fd-action-bar">
          <div className="fd-action-left">
            {!settings.onboardingCompleted && (
              <span className="fd-onboarding-hint">
                👋 Welcome! Configure your companion and click Save &amp; Start to begin.
              </span>
            )}
          </div>
          <div className="fd-action-right">
            {settings.onboardingCompleted && (
              <button
                type="button"
                className="fd-btn fd-btn-subtle"
                onClick={handleCancel}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className="fd-btn fd-btn-primary fd-btn-lg"
              disabled={saving}
              onClick={saveAndStart}
            >
              {saving ? "Starting..." : "Save & Start"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};