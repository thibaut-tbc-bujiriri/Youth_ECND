import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { invalidateAuditActorCache, logAuditEvent } from "../lib/audit";
import { useSystemSettings } from "../context/SystemSettingsContext";

const SIGN_IN_TIMEOUT_MS = 20000;
const PROFILE_TIMEOUT_MS = 8000;
const SESSION_CHECK_TIMEOUT_MS = 3000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)),
  ]);
}

function extractRoleNames(userData) {
  const mappings = Array.isArray(userData?.user_roles) ? userData.user_roles : [];
  return mappings
    .map((item) => {
      const roleNode = item?.roles;
      if (Array.isArray(roleNode)) return roleNode[0]?.name;
      return roleNode?.name;
    })
    .filter(Boolean)
    .map((name) => name.toString().trim().toLowerCase());
}

function resolveRole(userData) {
  const roles = extractRoleNames(userData);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("membre")) return "membre";
  return null;
}

async function resolveRoleWithFallback(userData) {
  const nestedRole = resolveRole(userData);
  if (nestedRole) return nestedRole;

  const userId = userData?.id;
  if (!userId) return null;

  const { data: roleRows, error } = await withTimeout(
    supabase
      .from("user_roles")
      .select(`
        roles ( name )
      `)
      .eq("user_id", userId),
    PROFILE_TIMEOUT_MS,
    "login_role_fallback",
  );

  if (error) return null;

  const roleNames = (roleRows || [])
    .map((row) => {
      const node = row?.roles;
      if (Array.isArray(node)) return node[0]?.name;
      return node?.name;
    })
    .filter(Boolean)
    .map((name) => name.toString().trim().toLowerCase());

  if (roleNames.includes("admin")) return "admin";
  if (roleNames.includes("membre")) return "membre";
  return null;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { settings } = useSystemSettings();

  const finishRedirect = (role) => {
    localStorage.setItem("role", role);
    invalidateAuditActorCache();
    if (role === "admin") navigate("/admin/dashboard", { replace: true });
    else navigate("/member/dashboard", { replace: true });
  };

  const loadRoleAndRedirect = async (authUserId) => {
    const { data: userData, error: profileError } = await withTimeout(
      supabase
        .from("users")
        .select(`
          id,
          email,
          user_roles (
            roles ( name )
          )
        `)
        .eq("auth_id", authUserId)
        .maybeSingle(),
      PROFILE_TIMEOUT_MS,
      "login_profile_query",
    );

    if (profileError || !userData) {
      const fallbackRole = localStorage.getItem("role") || "membre";
      finishRedirect(fallbackRole);
      return fallbackRole;
    }

    const role = await resolveRoleWithFallback(userData);
    const resolved = role || localStorage.getItem("role") || "membre";
    finishRedirect(resolved);
    return resolved;
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      let signedUser = null;
      try {
        const { data, error: authError } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          SIGN_IN_TIMEOUT_MS,
          "signInWithPassword",
        );
        if (authError) throw authError;
        signedUser = data?.user ?? null;
      } catch (err) {
        if (!err?.message?.includes("signInWithPassword timeout")) throw err;
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_CHECK_TIMEOUT_MS,
          "session_after_timeout",
        );
        signedUser = data?.session?.user ?? null;
        if (!signedUser) throw err;
      }

      if (!signedUser?.id) {
        throw new Error("Utilisateur non retourne par Supabase.");
      }

      const role = await loadRoleAndRedirect(signedUser.id);
      await logAuditEvent({
        action: "LOGIN_SUCCESS",
        entity: "auth",
        details: { role },
      });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      await logAuditEvent({
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
      setLoading(false);
    }
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email || !password) {
      setError("Email et mot de passe sont requis.");
      return;
    }
    await handleLogin();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-800 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-8 shadow-xl">
        <h1 className="text-3xl mb-4 font-bold">Connexion</h1>
        <p className="text-sm text-slate-200 mb-6">Bienvenue sur YOUTH ECND, connectez-vous pour continuer.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full p-3 rounded-lg bg-white/90 text-slate-900 placeholder-slate-500 disabled:opacity-50"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full p-3 rounded-lg bg-white/90 text-slate-900 placeholder-slate-500 disabled:opacity-50"
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
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-200 text-center">
          {settings.registrations_open ? (
            <>
              Pas de compte ?{" "}
              <Link className="text-cyan-200 hover:text-cyan-100 font-semibold" to="/register">
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
