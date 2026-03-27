import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Loading from "../../components/Loading";
import "boxicons";

const TRACKED_ACTIONS = ["CREATE", "INSERT", "UPDATE", "DELETE"];

function isMissingRelationError(error) {
  return error?.message?.toLowerCase().includes("audit_logs") || error?.code === "42P01";
}

function isTrackedAction(action) {
  return TRACKED_ACTIONS.includes(String(action || "").toUpperCase());
}

function actionToText(action, success) {
  const key = String(action || "").toUpperCase();
  if (success === false) return "Action echouee";
  if (key === "CREATE" || key === "INSERT") return "Connexion";
  if (key === "UPDATE") return "Mise a jour";
  if (key === "DELETE") return "Deconnexion";
  return "Action";
}

function actionBadgeClass(action, success) {
  if (success === false) return "bg-red-100 text-red-700";
  const key = String(action || "").toUpperCase();
  if (key === "CREATE" || key === "INSERT") return "bg-emerald-100 text-emerald-700";
  if (key === "DELETE") return "bg-slate-200 text-slate-700";
  if (key === "UPDATE") return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-700";
}

function roleBadgeClass(role) {
  const key = String(role || "").toLowerCase();
  if (key.includes("admin")) return "bg-red-100 text-red-700";
  if (key.includes("manager")) return "bg-amber-100 text-amber-700";
  if (key.includes("magasin")) return "bg-blue-100 text-blue-700";
  if (key.includes("membre") || key.includes("member")) return "bg-emerald-100 text-emerald-700";
  if (key.includes("anonymous")) return "bg-slate-200 text-slate-700";
  return "bg-slate-200 text-slate-700";
}

function roleToText(role) {
  if (!role) return "ANONYMOUS";
  return String(role).toUpperCase();
}

function parseDetails(details) {
  if (details && typeof details === "object" && !Array.isArray(details)) return details;
  return {};
}

function resolveEntity(log) {
  const rawEntity = log.entity || "session";
  const entityLabel = String(rawEntity);
  if (log.entity_id) return `${entityLabel} #${log.entity_id}`;
  return entityLabel;
}

function resolveIp(log) {
  const details = parseDetails(log.details);
  return (
    details.ip ||
    details.ip_address ||
    details.client_ip ||
    details.remote_ip ||
    details.forwarded_for ||
    "-"
  );
}

function detectOs(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return "Inconnu";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os")) return "macOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
  if (ua.includes("linux")) return "Linux";
  return "Inconnu";
}

function resolveDeviceType(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return "Desktop";
  if (ua.includes("android") || ua.includes("iphone") || ua.includes("ipad") || ua.includes("mobile")) return "Mobile";
  if (ua.includes("tablet")) return "Tablette";
  return "Desktop";
}

function detectBrowser(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return "Navigateur";
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("chrome/") && !ua.includes("edg/") && !ua.includes("opr/")) return "Chrome";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  return "Navigateur";
}

function resolveDisplayName(log) {
  if (log.actor_name) return log.actor_name;
  if (log.actor_email) return log.actor_email;
  return "Utilisateur inconnu";
}

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    try {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(700);

      if (queryError) throw queryError;

      const rawLogs = (data || []).filter((item) => isTrackedAction(item.action));
      const actorIds = [...new Set(rawLogs.map((item) => item.actor_user_id).filter(Boolean))];

      let actorMap = new Map();
      if (actorIds.length > 0) {
        const { data: usersRows } = await supabase
          .from("users")
          .select("id, nom, postnom, prenom, full_name, email")
          .in("id", actorIds);

        actorMap = new Map(
          (usersRows || []).map((user) => {
            const fullName = [user.nom, user.postnom, user.prenom].filter(Boolean).join(" ").trim();
            const resolved = fullName || user.full_name || user.email || "";
            return [user.id, resolved];
          }),
        );
      }

      const hydrated = rawLogs.map((log) => ({
        ...log,
        actor_name: actorMap.get(log.actor_user_id) || null,
      }));

      setLogs(hydrated);
      setTableMissing(false);
    } catch (err) {
      console.error("[ADMIN_AUDIT] load:", err);
      if (isMissingRelationError(err)) {
        setTableMissing(true);
        setError("La table 'audit_logs' est absente. Execute le fichier sql/audit_logs.sql.");
      } else {
        setError(err.message || "Impossible de charger les logs d'audit.");
      }
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(
    () =>
      logs.map((log) => ({
        ...log,
        details: parseDetails(log.details),
        displayDate: log.created_at ? new Date(log.created_at).toLocaleString("fr-FR") : "-",
        displayName: resolveDisplayName(log),
        displayRole: roleToText(log.actor_role),
        displayAction: actionToText(log.action, log.success),
        displayEntity: resolveEntity(log),
        displayIp: resolveIp(log),
        displayDeviceType: resolveDeviceType(log.user_agent),
        displayOs: parseDetails(log.details).os || detectOs(log.user_agent),
        displayBrowser: parseDetails(log.details).browser || detectBrowser(log.user_agent),
      })),
    [logs],
  );

  if (loading) return <Loading message="Chargement des logs d'audit..." />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Journal d'Audit</h1>
        <p className="mt-2 text-slate-600">Vue des mouvements de l'application avec presentation type registre.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!tableMissing && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-2xl font-semibold text-slate-900">Entrees ({rows.length})</h2>
            <button
              onClick={loadAuditLogs}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              title="Rafraichir"
            >
              <box-icon name="refresh" color="currentColor" size="sm"></box-icon>
              Rafraichir
            </button>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1080px]">
              <thead className="bg-slate-100 text-left text-sm text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Utilisateur</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Entite</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-4 py-3 font-semibold">Appareil</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center text-slate-500">
                      Aucun log d'audit.
                    </td>
                  </tr>
                ) : (
                  rows.map((log) => (
                    <tr key={log.id} className="border-t border-slate-100 text-sm text-slate-700">
                      <td className="px-4 py-3 whitespace-nowrap">{log.displayDate}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{log.displayName}</p>
                        <p className="text-xs text-slate-500 break-all">{log.actor_email || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(log.actor_role)}`}>
                          {log.displayRole}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${actionBadgeClass(log.action, log.success)}`}>
                          {log.displayAction}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {log.displayEntity}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{log.displayIp}</td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2 text-slate-600">
                          <box-icon name={log.displayDeviceType === "Mobile" ? "mobile" : "desktop"} color="currentColor" size="xs"></box-icon>
                          <div className="leading-tight">
                            <p className="text-xs">{log.displayOs} ({log.displayDeviceType})</p>
                            <p className="text-xs text-slate-500">{log.displayBrowser}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Aucun log d'audit.
              </div>
            ) : (
              rows.map((log) => (
                <article key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">{log.displayDate}</p>
                  <p className="mt-1 font-semibold text-slate-900">{log.displayName}</p>
                  <p className="text-xs text-slate-500 break-all">{log.actor_email || "-"}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(log.actor_role)}`}>
                      {log.displayRole}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${actionBadgeClass(log.action, log.success)}`}>
                      {log.displayAction}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p><span className="font-medium">Entite:</span> {log.displayEntity}</p>
                    <p><span className="font-medium">IP:</span> {log.displayIp}</p>
                    <p><span className="font-medium">Appareil:</span> {log.displayOs} ({log.displayDeviceType}) / {log.displayBrowser}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
