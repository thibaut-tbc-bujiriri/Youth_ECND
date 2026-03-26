import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { printTableReport } from "../../lib/printUtils";
import Loading from "../../components/Loading";

function isMissingRelationError(error) {
  return error?.message?.toLowerCase().includes("audit_logs") || error?.code === "42P01";
}

function prettyLabel(key) {
  const labels = {
    area: "Espace",
    path: "Page",
    role: "Role",
    email: "Email",
    reason: "Raison",
    error: "Erreur",
    amount: "Montant",
    status: "Statut",
    id: "ID",
    user_id: "Utilisateur",
    jeune_id: "Jeune",
    entity_id: "Element",
  };
  return labels[key] || key.replace(/_/g, " ");
}

function valueToText(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "oui" : "non";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => valueToText(item)).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${prettyLabel(k)}: ${valueToText(v)}`)
      .join(", ");
  }
  return String(value);
}

function detailsToText(details) {
  if (!details || (typeof details === "object" && Object.keys(details).length === 0)) return "Aucun detail complementaire";
  if (typeof details !== "object") return valueToText(details);
  return Object.entries(details)
    .map(([key, value]) => `${prettyLabel(key)}: ${valueToText(value)}`)
    .join(" | ");
}

function actionToText(action) {
  const map = {
    PAGE_VIEW: "a consulte une page",
    LOGIN: "s'est connecte",
    LOGOUT: "s'est deconnecte",
    CREATE: "a cree un element",
    UPDATE: "a modifie un element",
    DELETE: "a supprime un element",
    REGISTER: "a effectue une inscription",
  };
  return map[action] || `a execute l'action ${action || "-"}`;
}

function buildAuditDescription(log) {
  const actor = log.actor_email || "Un utilisateur";
  const entity = log.entity ? `sur ${log.entity}` : "";
  const result = log.success ? "avec succes" : "avec echec";
  const details = detailsToText(log.details);
  return `${actor} ${actionToText(log.action)} ${entity} (${result}). ${details}`.trim();
}

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableMissing, setTableMissing] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [successFilter, setSuccessFilter] = useState("");

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
      setLogs(data || []);
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

  const actions = useMemo(() => [...new Set(logs.map((item) => item.action).filter(Boolean))], [logs]);
  const entities = useMemo(() => [...new Set(logs.map((item) => item.entity).filter(Boolean))], [logs]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      const haystack = [
        log.actor_email,
        log.actor_role,
        log.action,
        log.entity,
        log.entity_id,
        log.path,
        detailsToText(log.details),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);
      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesEntity = !entityFilter || log.entity === entityFilter;
      const matchesSuccess =
        !successFilter ||
        (successFilter === "success" && log.success === true) ||
        (successFilter === "failed" && log.success === false);

      return matchesSearch && matchesAction && matchesEntity && matchesSuccess;
    });
  }, [logs, search, actionFilter, entityFilter, successFilter]);

  function handlePrintAudit() {
    printTableReport({
      title: "Etat de sortie - Journal d'audit",
      subtitle: "Suivi des mouvements de l'application (filtres appliques)",
      columns: [
        { key: "date", label: "Date" },
        { key: "acteur", label: "Acteur" },
        { key: "role", label: "Role" },
        { key: "action", label: "Action" },
        { key: "entity", label: "Entite" },
        { key: "entity_id", label: "ID entite" },
        { key: "path", label: "Page" },
        { key: "success", label: "Succes" },
      ],
      rows: filteredLogs.map((log) => ({
        date: log.created_at ? new Date(log.created_at).toLocaleString("fr-FR") : "-",
        acteur: log.actor_email || "-",
        role: log.actor_role || "-",
        action: log.action || "-",
        entity: log.entity || "-",
        entity_id: log.entity_id || "-",
        path: log.path || "-",
        success: log.success ? "Oui" : "Non",
      })),
      summary: [
        { label: "Total lignes", value: filteredLogs.length },
        { label: "Succes", value: filteredLogs.filter((item) => item.success).length },
        { label: "Echecs", value: filteredLogs.filter((item) => !item.success).length },
      ],
    });
  }

  if (loading) return <Loading message="Chargement des logs d'audit..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Journal d'Audit</h1>
          <p className="mt-2 text-slate-600">
            Suis tous les mouvements de l'application: navigation, creations, modifications, suppressions.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={loadAuditLogs}
            disabled={tableMissing}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Rafraichir
          </button>
          <button
            onClick={handlePrintAudit}
            disabled={tableMissing}
            className="w-full rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Imprimer le journal
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!tableMissing && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total logs</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{filteredLogs.length}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm text-emerald-700">Succes</p>
              <p className="mt-2 text-3xl font-bold text-emerald-900">{filteredLogs.filter((item) => item.success).length}</p>
            </article>
            <article className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <p className="text-sm text-red-700">Echecs</p>
              <p className="mt-2 text-3xl font-bold text-red-900">{filteredLogs.filter((item) => !item.success).length}</p>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-5">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher acteur/action/page..."
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 lg:col-span-2"
              />
              <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500">
                <option value="">Toutes les actions</option>
                {actions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
              <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500">
                <option value="">Toutes les entites</option>
                {entities.map((entity) => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
              <select value={successFilter} onChange={(event) => setSuccessFilter(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500">
                <option value="">Succes + Echecs</option>
                <option value="success">Succes</option>
                <option value="failed">Echecs</option>
              </select>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {filteredLogs.length === 0 && (
              <div className="px-5 py-10 text-center text-slate-500">Aucun log d'audit avec ces filtres.</div>
            )}
            {filteredLogs.length > 0 && (
              <div className="grid gap-3 p-3 md:hidden">
                {filteredLogs.map((log) => (
                  <article key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {log.created_at ? new Date(log.created_at).toLocaleString("fr-FR") : "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{log.actor_email || "Utilisateur inconnu"}</p>
                    <p className="mt-2 text-sm text-slate-700">{buildAuditDescription(log)}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">{log.action || "-"}</span>
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">{log.entity || "-"}</span>
                      <span className={`rounded-full px-2.5 py-1 font-semibold ${log.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {log.success ? "Succes" : "Echec"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[1200px] w-full">
                <thead className="bg-slate-100 text-left text-sm text-slate-600">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Acteur</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                    <th className="px-5 py-4 font-semibold">Action</th>
                    <th className="px-5 py-4 font-semibold">Entite</th>
                    <th className="px-5 py-4 font-semibold">Page</th>
                    <th className="px-5 py-4 font-semibold">Resultat</th>
                    <th className="px-5 py-4 font-semibold">Description claire</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-5 py-10 text-center text-slate-500">
                        Aucun log d'audit avec ces filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="border-t border-slate-100 text-sm text-slate-700">
                        <td className="px-5 py-4">{log.created_at ? new Date(log.created_at).toLocaleString("fr-FR") : "-"}</td>
                        <td className="px-5 py-4">{log.actor_email || "-"}</td>
                        <td className="px-5 py-4">{log.actor_role || "-"}</td>
                        <td className="px-5 py-4">{log.action || "-"}</td>
                        <td className="px-5 py-4">
                          <div>{log.entity || "-"}</div>
                          <div className="text-xs text-slate-500">{log.entity_id || ""}</div>
                        </td>
                        <td className="px-5 py-4">{log.path || "-"}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${log.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {log.success ? "Succes" : "Echec"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600 max-w-[420px]">
                          <p className="whitespace-pre-wrap break-words">{buildAuditDescription(log)}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
