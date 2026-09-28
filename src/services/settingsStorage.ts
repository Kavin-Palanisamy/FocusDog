import { invoke } from "@tauri-apps/api/core";
import { DEFAULT_SETTINGS, FocusDogSettings } from "../models/settings";

const STORAGE_KEY = "focusdog_settings_v01";

export function normalizeSiteUrl(rawInput: string): string {
  let cleaned = rawInput.trim();
  if (!cleaned) return "";

  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//i, "");

  // Remove leading www.
  cleaned = cleaned.replace(/^www\./i, "");

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, "");

  // Separate domain and path
  const slashIndex = cleaned.indexOf("/");
  if (slashIndex !== -1) {
    const domain = cleaned.slice(0, slashIndex).toLowerCase();
    const path = cleaned.slice(slashIndex);
    return `${domain}${path}`;
  }

  return cleaned.toLowerCase();
}

export async function loadFocusDogSettings(): Promise<FocusDogSettings> {
  try {
    const settings = await invoke<FocusDogSettings>("get_settings");
    if (settings && typeof settings === "object") {
      return settings;
    }
  } catch (err) {
    console.warn("Tauri get_settings not available, checking localStorage:", err);
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to read from localStorage:", e);
  }

  return DEFAULT_SETTINGS;
}

export async function saveFocusDogSettings(settings: FocusDogSettings): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }

  try {
    await invoke("save_settings", { settings });
  } catch (err) {
    console.warn("Tauri save_settings invocation failed (browser mode?):", err);
  }
}

export async function saveSettingsAndStart(settings: FocusDogSettings): Promise<void> {
  const updatedSettings = {
    ...settings,
    onboardingCompleted: true,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }

  try {
    await invoke("save_settings_and_start", { settings: updatedSettings });
  } catch (err) {
    console.warn("Tauri save_settings_and_start failed (browser mode?):", err);
  }
}