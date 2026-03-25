import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const SystemSettingsContext = createContext(null);

const defaultSettings = {
  organization_name: "YOUTH ECND",
  contact_email: "",
  maintenance_mode: false,
  registrations_open: true,
  email_notifications: true,
};

function isMissingRelationError(error) {
  return error?.message?.toLowerCase().includes("app_settings") || error?.code === "42P01";
}

export function SystemSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  async function reloadSettings() {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadSettings();
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
