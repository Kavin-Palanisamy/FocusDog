import React, { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SettingsShell } from "./components/settings/SettingsShell";
import { Dog } from "./components/dog/Dog";

export const App: React.FC = () => {
  const [windowLabel, setWindowLabel] = useState<string>("settings");

  useEffect(() => {
    try {
      const win = getCurrentWindow();
      if (win && win.label) {
        setWindowLabel(win.label);
      }
    } catch {
      // Fallback for browser mode dev/testing
      const urlParams = new URLSearchParams(window.location.search);
      const param = urlParams.get("window");
      if (param) {
        setWindowLabel(param);
      }
    }
  }, []);

  if (windowLabel === "pet") {
    return <Dog />;
  }

  return <SettingsShell />;
};

export default App;