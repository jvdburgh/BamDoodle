import { useEffect, useState } from "react";
import { LabSettingsUtils, type LabSettings } from "@/components/lab/_utils/labSettings.utils";

const STORAGE_KEY = "bamdoodle.lab";
const WIDE_ENOUGH_FOR_BOTH = 1200;

function stored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function initial(): LabSettings {
  const saved = stored();
  const settings = LabSettingsUtils.read(window.location.search, saved);
  // First visit on a big screen: show the phone and the host screen side by side.
  const chosen = saved !== null || new URLSearchParams(window.location.search).has("view");
  if (!chosen && window.innerWidth >= WIDE_ENOUGH_FOR_BOTH) settings.view = "both";
  return settings;
}

/** The playground's switches, remembered per viewer in localStorage and mirrored into the URL. */
export function useLabSettings() {
  const [settings, setSettings] = useState(initial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Private mode or blocked storage: the switches still work, they just aren't remembered.
    }
    const search = LabSettingsUtils.toSearch(settings, window.location.search);
    if (search !== window.location.search) {
      window.history.replaceState(null, "", `${window.location.pathname}${search}${window.location.hash}`);
    }
  }, [settings]);

  const update = (patch: Partial<LabSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const reset = () => setSettings({ ...LabSettingsUtils.defaults });

  return { settings, update, reset };
}
