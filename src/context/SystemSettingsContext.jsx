import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const SystemSettingsContext = createContext(null);

const defaultSettings = {
  organization_name: "YOUTH ECND",
  contact_email: "",
  maintenance_mode: false,
  registrations_open: true,
  email_notifications: true,
  session_duration_minutes: 120,
};

function isMissingRelationError(error) {
  return error?.message?.toLowerCase().includes("app_settings") || error?.code === "42P01";
}

export function SystemSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  async function reloadSettings(options = {}) {
    const { silent = false } = options;
    try {
      if (!silent) setLoading(true);
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("slug", "main")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          organization_name: data.organization_name || defaultSettings.organization_name,
          contact_email: data.contact_email || "",
          maintenance_mode: Boolean(data.maintenance_mode),
          registrations_open: Boolean(data.registrations_open),
          email_notifications: Boolean(data.email_notifications),
          session_duration_minutes: Number(data.session_duration_minutes || 120),
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (err) {
      if (!isMissingRelationError(err)) {
        console.error("[SYSTEM_SETTINGS] reload:", err);
      }
      setSettings(defaultSettings);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    reloadSettings();
    const interval = window.setInterval(() => {
      reloadSettings({ silent: true });
    }, 30000);

    const onVisible = () => {
      if (document.visibilityState === "visible") reloadSettings({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      reloadSettings,
    }),
    [settings, loading],
  );

  return <SystemSettingsContext.Provider value={value}>{children}</SystemSettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error("useSystemSettings doit etre utilise dans SystemSettingsProvider");
  }
  return context;
}
