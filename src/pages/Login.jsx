import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { invalidateAuditActorCache, logAuditEvent } from "../lib/audit";
import { useSystemSettings } from "../context/SystemSettingsContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import "boxicons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { settings } = useSystemSettings();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  function fireAndForgetAudit(payload) {
    Promise.resolve(logAuditEvent(payload)).catch(() => {});
  }

  async function handleLogin() {
    try {
      setSubmitting(true);
      setError("");

      const { role } = await signIn({ email, password });
      invalidateAuditActorCache();

      fireAndForgetAudit({
        action: "LOGIN_SUCCESS",
        entity: "auth",
        details: { role: role || "unknown" },
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      fireAndForgetAudit({
        action: "LOGIN_FAILED",
        entity: "auth",
        details: { reason: err?.message || "unknown" },
        success: false,
      });

      if (err?.message?.includes("Invalid login credentials")) {
        setError("Email ou mot de passe incorrect.");
      } else if (err?.message?.includes("timeout")) {
        setError("La connexion est trop lente. Reessayez dans quelques secondes.");
      } else {
        setError(err?.message || "Une erreur est survenue pendant la connexion.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email || !password) {
      setError("Email et mot de passe sont requis.");
      return;
    }
    await handleLogin();
  }

  return (
    <main
      className={`min-h-screen flex items-center justify-center p-6 ${
        isDark
          ? "bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-800 text-white"
          : "bg-gradient-to-br from-sky-100 via-blue-50 to-slate-100 text-slate-900"
      }`}
    >
      <section
        className={`w-full max-w-md rounded-xl p-8 shadow-xl ${
          isDark ? "bg-white/10 backdrop-blur-md border border-white/10" : "bg-white border border-slate-200"
        }`}
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-1.5 transition ${isDark ? "text-slate-100 hover:text-amber-300" : "text-slate-500 hover:text-emerald-700"}`}
            aria-label="Changer le theme"
            title="Changer le theme"
          >
            <box-icon name={isDark ? "sun" : "moon"} color={isDark ? "#ffffff" : "#0f172a"} size="sm"></box-icon>
          </button>
        </div>
        <h1 className="text-3xl mb-4 font-bold">Connexion</h1>
        <p className={`text-sm mb-6 ${isDark ? "text-slate-200" : "text-slate-600"}`}>
          Bienvenue sur YOUTH ECND, connectez-vous pour continuer.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <box-icon name="envelope" type="solid" color={isDark ? "#dbeafe" : "#334155"} size="xs"></box-icon>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className={`w-full p-3 rounded-lg text-slate-900 placeholder-slate-500 disabled:opacity-50 ${
                isDark ? "bg-white/90" : "bg-slate-100"
              }`}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <box-icon name="lock-alt" type="solid" color={isDark ? "#dbeafe" : "#334155"} size="xs"></box-icon>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className={`w-full p-3 rounded-lg text-slate-900 placeholder-slate-500 disabled:opacity-50 ${
                isDark ? "bg-white/90" : "bg-slate-100"
              }`}
              placeholder="********"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-500 py-3 font-medium transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <box-icon name="log-in" type="solid" color="#ffffff" size="xs"></box-icon>
              {submitting ? "Connexion en cours..." : "Se connecter"}
            </span>
          </button>
        </form>

        <p className={`mt-6 text-sm text-center ${isDark ? "text-slate-200" : "text-slate-600"}`}>
          <Link className={`font-semibold ${isDark ? "text-cyan-200 hover:text-cyan-100" : "text-emerald-700 hover:text-emerald-800"}`} to="/">
            Retour a l'accueil
          </Link>
        </p>

        <p className={`mt-3 text-sm text-center ${isDark ? "text-slate-200" : "text-slate-600"}`}>
          {settings.registrations_open ? (
            <>
              Pas de compte ?{" "}
              <Link className={`font-semibold ${isDark ? "text-cyan-200 hover:text-cyan-100" : "text-emerald-700 hover:text-emerald-800"}`} to="/register">
                Creer un compte
              </Link>
            </>
          ) : (
            "Les inscriptions sont fermees par l'administration."
          )}
        </p>
      </section>
    </main>
  );
}
