import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useSystemSettings } from "../../context/SystemSettingsContext";

const defaultSettings = {
  organization_name: "YOUTH ECND - Les Batisseurs Vision 26-27",
  contact_email: "",
  maintenance_mode: false,
  registrations_open: true,
  email_notifications: true,
};

function isMissingRelationError(error) {
  return error?.message?.toLowerCase().includes("app_settings") || error?.code === "42P01";
}

export default function AdminSettings() {
  const { reloadSettings } = useSystemSettings();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tableMissing, setTableMissing] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      const { data, error: queryError } = await supabase
        .from("app_settings")
        .select("*")
        .eq("slug", "main")
        .maybeSingle();

      if (queryError) throw queryError;

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

      setTableMissing(false);
    } catch (err) {
      console.error("[ADMIN_SETTINGS] load:", err);
      if (isMissingRelationError(err)) {
        setTableMissing(true);
        setError("La table 'app_settings' est absente. Execute le script SQL de configuration.");
      } else {
        setError(err.message || "Impossible de charger les parametres.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setError("");

      const payload = {
        slug: "main",
        organization_name: settings.organization_name.trim(),
        contact_email: settings.contact_email.trim(),
        maintenance_mode: settings.maintenance_mode,
        registrations_open: settings.registrations_open,
        email_notifications: settings.email_notifications,
      };

      const { error: upsertError } = await supabase
        .from("app_settings")
        .upsert([payload], { onConflict: "slug" });

      if (upsertError) throw upsertError;
      await reloadSettings();
      setSuccess("Parametres enregistres.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_SETTINGS] save:", err);
      setError(err.message || "Impossible d'enregistrer les parametres.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSystemSwitch(key, value) {
    try {
      setError("");
      setSettings((current) => ({ ...current, [key]: value }));

      const payload = {
        slug: "main",
        organization_name: settings.organization_name.trim(),
        contact_email: settings.contact_email.trim(),
        maintenance_mode: key === "maintenance_mode" ? value : settings.maintenance_mode,
        registrations_open: key === "registrations_open" ? value : settings.registrations_open,
        email_notifications: key === "email_notifications" ? value : settings.email_notifications,
      };

      const { error: upsertError } = await supabase
        .from("app_settings")
        .upsert([payload], { onConflict: "slug" });
      if (upsertError) throw upsertError;

      await reloadSettings();
      setSuccess("Option systeme mise a jour.");
      setTimeout(() => setSuccess(""), 1600);
    } catch (err) {
      console.error("[ADMIN_SETTINGS] saveSystemSwitch:", err);
      setError(err.message || "Impossible de sauvegarder cette option.");
      await loadSettings();
    }
  }

  async function updatePassword() {
    try {
      if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
        setError("Le nouveau mot de passe doit contenir au moins 6 caracteres.");
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError("Les mots de passe ne correspondent pas.");
        return;
      }

      setPasswordSaving(true);
      setError("");
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) throw updateError;
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setSuccess("Mot de passe administrateur mis a jour.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_SETTINGS] password:", err);
      setError(err.message || "Impossible de modifier le mot de passe.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function logoutCurrentSession() {
    const confirmed = window.confirm("Deconnecter la session actuelle ?");
    if (!confirmed) return;

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message || "Deconnexion impossible.");
      return;
    }

    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
        Chargement des parametres...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Parametres Admin</h1>
        <p className="mt-2 text-slate-600">
          Gere l'identite du projet, le fonctionnement general du systeme et la securite de ton compte.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">General</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Nom de l'organisation</span>
            <input
              type="text"
              value={settings.organization_name}
              onChange={(e) => setSettings((current) => ({ ...current, organization_name: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              disabled={tableMissing}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Email de contact</span>
            <input
              type="email"
              value={settings.contact_email}
              onChange={(e) => setSettings((current) => ({ ...current, contact_email: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              disabled={tableMissing}
            />
          </label>
        </div>

        <div className="mt-5">
          <button
            onClick={saveSettings}
            disabled={saving || tableMissing}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Systeme</h2>
        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-4">
            <div>
              <p className="font-medium text-slate-900">Mode maintenance</p>
              <p className="text-sm text-slate-500">Bloque les pages non-admins.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => saveSystemSwitch("maintenance_mode", e.target.checked)}
              className="h-5 w-5"
              disabled={tableMissing}
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-4">
            <div>
              <p className="font-medium text-slate-900">Activer les inscriptions</p>
              <p className="text-sm text-slate-500">Ouvre ou ferme la page d'inscription.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.registrations_open}
              onChange={(e) => saveSystemSwitch("registrations_open", e.target.checked)}
              className="h-5 w-5"
              disabled={tableMissing}
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-4">
            <div>
              <p className="font-medium text-slate-900">Notifications par email</p>
              <p className="text-sm text-slate-500">Active la file d'attente d'emails systeme.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.email_notifications}
              onChange={(e) => saveSystemSwitch("email_notifications", e.target.checked)}
              className="h-5 w-5"
              disabled={tableMissing}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Securite</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Nouveau mot de passe</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((current) => ({ ...current, newPassword: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Confirmer le mot de passe</span>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((current) => ({ ...current, confirmPassword: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={updatePassword}
            disabled={passwordSaving}
            className="rounded-xl border border-slate-300 px-5 py-3 text-left font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passwordSaving ? "Mise a jour..." : "Changer le mot de passe administrateur"}
          </button>
          <button
            onClick={logoutCurrentSession}
            className="rounded-xl border border-red-300 px-5 py-3 text-left font-medium text-red-600 hover:bg-red-50"
          >
            Deconnecter cette session
          </button>
        </div>
      </section>
    </div>
  );
}
