import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { logAuditEvent } from "../lib/audit";
import { useSystemSettings } from "../context/SystemSettingsContext";
import { useTheme } from "../context/ThemeContext";
import { queueEmailNotification } from "../lib/emailNotifications";
import "boxicons";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!settings.registrations_open) {
      setError("Les inscriptions sont temporairement desactivees par l'administration.");
      return;
    }

    if (!email || !password || !confirmPassword || !name) {
      setError("Tous les champs sont requis.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        let errorMsg = authError.message;
        if (errorMsg.includes("already registered")) {
          errorMsg = "Cet email est deja utilise.";
        } else if (errorMsg.includes("Password should be")) {
          errorMsg = "Le mot de passe ne respecte pas les criteres de securite.";
        }
        setError(errorMsg);
        setLoading(false);
        await logAuditEvent({
          action: "REGISTER_FAILED",
          entity: "auth",
          details: { email, reason: errorMsg },
          success: false,
        });
        return;
      }

      if (data?.user) {
        const { data: userRow, error: dbError } = await supabase
          .from("users")
          .upsert(
            [
              {
                auth_id: data.user.id,
                email,
              },
            ],
            { onConflict: "auth_id" },
          )
          .select("id")
          .single();

        if (dbError) {
          console.error("Database error:", dbError);
          setError("Erreur lors de la creation du profil. Veuillez contacter le support.");
          setLoading(false);
          await logAuditEvent({
            action: "REGISTER_FAILED",
            entity: "auth",
            details: { email, reason: "profile_create_failed" },
            success: false,
          });
          return;
        }

        const { data: memberRole, error: roleError } = await supabase
          .from("roles")
          .select("id")
          .eq("name", "membre")
          .single();

        if (roleError || !memberRole?.id) {
          console.error("Role error:", roleError);
          setError("Role 'membre' introuvable. Contactez un administrateur.");
          setLoading(false);
          await logAuditEvent({
            action: "REGISTER_FAILED",
            entity: "auth",
            details: { email, reason: "member_role_missing" },
            success: false,
          });
          return;
        }

        const { error: mapError } = await supabase
          .from("user_roles")
          .upsert([{ user_id: userRow.id, role_id: memberRole.id }], { onConflict: "user_id,role_id" });

        if (mapError) {
          console.error("Role mapping error:", mapError);
          setError("Erreur lors de l'attribution du role utilisateur.");
          setLoading(false);
          await logAuditEvent({
            action: "REGISTER_FAILED",
            entity: "auth",
            details: { email, reason: "role_mapping_failed" },
            success: false,
          });
          return;
        }

        await logAuditEvent({
          action: "REGISTER_SUCCESS",
          entity: "auth",
          entity_id: userRow.id,
          details: { email },
        });
        await queueEmailNotification({
          type: "new_registration",
          subject: "Nouvelle inscription YOUTH ECND",
          message: `Un nouveau compte a ete cree: ${email}`,
          payload: { email, user_id: userRow.id },
        });

        setSuccess("Inscription reussie. Verifiez votre e-mail pour confirmer.");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError("Erreur lors de la creation du compte. Veuillez reessayer.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Unexpected registration error:", err);
      setError("Une erreur inattendue s'est produite. Veuillez reessayer.");
      setLoading(false);
      await logAuditEvent({
        action: "REGISTER_FAILED",
        entity: "auth",
        details: { email, reason: err?.message || "unexpected_error" },
        success: false,
      });
    }
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
        <h1 className="text-3xl mb-4 font-bold">Creer un compte</h1>
        <p className={`text-sm mb-6 ${isDark ? "text-slate-200" : "text-slate-600"}`}>Rejoins YOUTH ECND pour gerer la jeunesse de ton eglise.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <box-icon name="user" type="solid" color="#dbeafe" size="xs"></box-icon>
              Nom complet
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className={`w-full p-3 rounded-lg text-slate-900 placeholder-slate-500 disabled:opacity-50 ${
                isDark ? "bg-white/90" : "bg-slate-100"
              }`}
              placeholder="Thibaut Tbc Bujiriri"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <box-icon name="envelope" type="solid" color="#dbeafe" size="xs"></box-icon>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className={`w-full p-3 rounded-lg text-slate-900 placeholder-slate-500 disabled:opacity-50 ${
                isDark ? "bg-white/90" : "bg-slate-100"
              }`}
              placeholder="thibauttbcbujiriri@gmail.com"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <box-icon name="lock-alt" type="solid" color="#dbeafe" size="xs"></box-icon>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={`w-full p-3 rounded-lg text-slate-900 placeholder-slate-500 disabled:opacity-50 ${
                isDark ? "bg-white/90" : "bg-slate-100"
              }`}
              placeholder="********"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <box-icon name="check-shield" type="solid" color="#dbeafe" size="xs"></box-icon>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
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

          {success && (
            <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-200 text-sm">{success}</p>
            </div>
          )}
          {!settings.registrations_open && (
            <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg">
              <p className="text-amber-200 text-sm">Les inscriptions sont actuellement fermees.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !settings.registrations_open}
            className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <span className="inline-flex items-center gap-2">
              <box-icon name="user-plus" type="solid" color="#ffffff" size="xs"></box-icon>
              {loading ? "Creation en cours..." : "S'inscrire"}
            </span>
          </button>
        </form>

        <p className={`mt-6 text-sm text-center ${isDark ? "text-slate-200" : "text-slate-600"}`}>
          Deja inscrit ?{" "}
          <Link className={`font-semibold ${isDark ? "text-cyan-200 hover:text-cyan-100" : "text-emerald-700 hover:text-emerald-800"}`} to="/login">
            Se connecter
          </Link>
        </p>
      </section>
    </main>
  );
}
