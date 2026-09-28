import { useState, useEffect, useCallback } from "react";
import {
  DEFAULT_SETTINGS,
  FocusDogSettings,
  PatrolSettings,
  FocusSettings,
  DogSettings,
} from "../models/settings";
import {
  loadFocusDogSettings,
  saveFocusDogSettings,
  saveSettingsAndStart,
  normalizeSiteUrl,
} from "../services/settingsStorage";

export function useSettings() {
  const [settings, setSettings] = useState<FocusDogSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    loadFocusDogSettings().then((loaded) => {
      if (mounted) {
        setSettings(loaded);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updatePatrol = useCallback((partial: Partial<PatrolSettings>) => {
    setSettings((prev) => ({
      ...prev,
      patrol: { ...prev.patrol, ...partial },
    }));
  }, []);

  const updateFocus = useCallback((partial: Partial<FocusSettings>) => {
    setSettings((prev) => ({
      ...prev,
      focus: { ...prev.focus, ...partial },
    }));
  }, []);

  const addFocusSite = useCallback((url: string, minutes: number = 15) => {
    const cleanUrl = normalizeSiteUrl(url) || "example.com";
    setSettings((prev) => ({
      ...prev,
      focus: {
        ...prev.focus,
        sites: [...prev.focus.sites, { url: cleanUrl, minutes }],
      },
    }));
  }, []);

  const updateFocusSite = useCallback(
    (index: number, url: string, minutes: number, enabled?: boolean) => {
      setSettings((prev) => {
        const nextSites = [...prev.focus.sites];
        if (nextSites[index]) {
          nextSites[index] = {
            url: normalizeSiteUrl(url) || nextSites[index].url,
            minutes: Math.max(0, minutes),
            enabled: enabled !== undefined ? enabled : nextSites[index].enabled,
          };
        }
        return {
          ...prev,
          focus: { ...prev.focus, sites: nextSites },
        };
      });
    },
    []
  );

  const removeFocusSite = useCallback((index: number) => {
    setSettings((prev) => ({
      ...prev,
      focus: {
        ...prev.focus,
        sites: prev.focus.sites.filter((_, i) => i !== index),
      },
    }));
  }, []);

  const updateDog = useCallback((partial: Partial<DogSettings>) => {
    setSettings((prev) => ({
      ...prev,
      dog: { ...prev.dog, ...partial },
    }));
  }, []);

  const handleSaveAndStart = useCallback(async () => {
    setSaving(true);
    try {
      await saveSettingsAndStart(settings);
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const handleSaveOnly = useCallback(async () => {
    setSaving(true);
    try {
      await saveFocusDogSettings(settings);
    } finally {
      setSaving(false);
    }
  }, [settings]);

  return {
    settings,
    loading,
    saving,
    updatePatrol,
    updateFocus,
    addFocusSite,
    updateFocusSite,
    removeFocusSite,
    updateDog,
    saveAndStart: handleSaveAndStart,
    saveOnly: handleSaveOnly,
    setSettings,
  };
}