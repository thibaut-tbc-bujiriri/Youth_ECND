import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const SystemSettingsContext = createContext(null);
const SETTINGS_REQUEST_TIMEOUT_MS = 6000;
const SETTINGS_CACHE_KEY = "system_settings_cache_v1";

const defaultSettings = {
  organization_name: "YOUTH ECND",
  contact_email: "",
  maintenance_mode: false,
  registrations_open: true,
  email_notifications: true,
  session_duration_minutes: 120,
};

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)),
  ]);
}

function readSettingsCache() {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      organization_name: parsed.organization_name || defaultSettings.organization_name,
      contact_email: parsed.contact_email || "",
      maintenance_mode: Boolean(parsed.maintenance_mode),
      registrations_open: Boolean(parsed.registrations_open),
      email_notifications: Boolean(parsed.email_notifications),
      session_duration_minutes: Number(parsed.session_duration_minutes || 120),
    };
  } catch {
    return null;
  }
}

function writeSettingsCache(settings) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore cache write issues (quota/private mode).
  }
}

function isMissingRelationError(error) {
  return error?.message?.toLowerCase().includes("app_settings") || error?.code === "42P01";
}

export function SystemSettingsProvider({ children }) {
  const cached = readSettingsCache();
  const [settings, setSettings] = useState(cached || defaultSettings);
  const [loading, setLoading] = useState(!cached);

  async function reloadSettings(options = {}) {
    const { silent = false } = options;
    try {
      if (!silent) setLoading(true);
      const { data, error } = await withTimeout(
        supabase
          .from("app_settings")
          .select("*")
          .eq("slug", "main")
          .maybeSingle(),
        SETTINGS_REQUEST_TIMEOUT_MS,
        "system_settings_query",
      );

      if (error) throw error;

      if (data) {
        const resolvedSettings = {
          organization_name: data.organization_name || defaultSettings.organization_name,
          contact_email: data.contact_email || "",
          maintenance_mode: Boolean(data.maintenance_mode),
          registrations_open: Boolean(data.registrations_open),
          email_notifications: Boolean(data.email_notifications),
          session_duration_minutes: Number(data.session_duration_minutes || 120),
        };
        setSettings(resolvedSettings);
        writeSettingsCache(resolvedSettings);
      } else {
        setSettings(defaultSettings);
        writeSettingsCache(defaultSettings);
      }
    } catch (err) {
      if (!isMissingRelationError(err) && !String(err?.message || "").includes("system_settings_query timeout")) {
        console.error("[SYSTEM_SETTINGS] reload:", err);
      }
      if (!cached) {
        setSettings(defaultSettings);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    reloadSettings({ silent: Boolean(cached) });
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
