import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Loading from "../../components/Loading";
import { printTableReport } from "../../lib/printUtils";
import { queueEmailNotification } from "../../lib/emailNotifications";
import { useConfirm } from "../../context/ConfirmContext";
import { logAuditEvent } from "../../lib/audit";
import "boxicons";

const defaultForm = {
  title: "",
  location: "",
  event_date: "",
  status: "Planifie",
  participants_target: "",
  budget_planned: "",
  budget_actual: "",
  strategy_1: "",
  strategy_2: "",
  strategy_3: "",
  strategy_4: "",
  strategy_5: "",
  final_activities: "",
  report_name: "",
  report_date: "",
  report_theme: "",
  report_verse: "",
  report_attendance: "",
  report_offering: "",
  report_objectives: "",
  notes: "",
};

const statusOptions = ["Planifie", "En preparation", "Publie", "Termine", "Annule"];

function dateLabel(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function isMissingRelationError(error) {
  return error?.message?.toLowerCase().includes("activities") || error?.code === "42P01";
}

function parseActivityDetails(description) {
  if (!description) {
    return { schema: "activities_v2", notes: "", planification: {}, rapport: {} };
  }

  try {
    const parsed = JSON.parse(description);
    if (parsed && parsed.schema === "activities_v2") {
      return {
        schema: "activities_v2",
        notes: parsed.notes || "",
        planification: parsed.planification || {},
        rapport: parsed.rapport || {},
      };
    }
  } catch {
    // Fallback handled below.
  }

  return {
    schema: "legacy",
    notes: description,
    planification: {},
    rapport: {},
  };
}

function buildDescriptionPayload(form) {
  const payload = {
    schema: "activities_v2",
    notes: form.notes.trim() || null,
    planification: {
      budget_prevu: toNumberOrNull(form.budget_planned),
      budget_reel: toNumberOrNull(form.budget_actual),
      strategie_1: form.strategy_1.trim() || null,
      strategie_2: form.strategy_2.trim() || null,
      strategie_3: form.strategy_3.trim() || null,
      strategie_4: form.strategy_4.trim() || null,
      strategie_5: form.strategy_5.trim() || null,
      activites_finales: form.final_activities.trim() || null,
    },
    rapport: {
      nom_activite: (form.report_name || form.title).trim() || null,
      date: form.report_date ? new Date(`${form.report_date}T00:00:00`).toISOString() : null,
      theme: form.report_theme.trim() || null,
      verset_biblique: form.report_verse.trim() || null,
      effectif: toNumberOrNull(form.report_attendance),
      offrande: toNumberOrNull(form.report_offering),
      objectifs_atteints: form.report_objectives.trim() || null,
    },
  };

  return JSON.stringify(payload);
}

export default function AdminActivites() {
  const { confirm } = useConfirm();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    try {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("activities")
        .select("*")
        .order("event_date", { ascending: true });

      if (queryError) throw queryError;
      setActivities(data || []);
      setTableMissing(false);
    } catch (err) {
      console.error("[ADMIN_ACTIVITES] fetchActivities:", err);
      if (isMissingRelationError(err)) {
        setTableMissing(true);
        setError("La table 'activities' n'existe pas encore. Cree-la dans Supabase.");
      } else {
        setError(err.message || "Impossible de charger les activites.");
      }
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingActivity(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEditModal(activity) {
    const details = parseActivityDetails(activity.description);
    const planning = details.planification || {};
    const report = details.rapport || {};

    setEditingActivity(activity);
    setForm({
      ...defaultForm,
      ...activity,
      event_date: activity.event_date ? activity.event_date.slice(0, 16) : "",
      participants_target: activity.participants_target ?? "",
      budget_planned: planning.budget_prevu ?? "",
      budget_actual: planning.budget_reel ?? "",
      strategy_1: planning.strategie_1 || "",
      strategy_2: planning.strategie_2 || "",
      strategy_3: planning.strategie_3 || "",
      strategy_4: planning.strategie_4 || "",
      strategy_5: planning.strategie_5 || "",
      final_activities: planning.activites_finales || "",
      report_name: report.nom_activite || activity.title || "",
      report_date: report.date ? report.date.slice(0, 10) : "",
      report_theme: report.theme || "",
      report_verse: report.verset_biblique || "",
      report_attendance: report.effectif ?? "",
      report_offering: report.offrande ?? "",
      report_objectives: report.objectifs_atteints || "",
      notes: details.notes || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setEditingActivity(null);
    setForm(defaultForm);
    setShowModal(false);
  }

  async function handleSave(event) {
    event?.preventDefault();
    try {
      if (!form.title.trim() || !form.event_date) {
        setError("Le nom d'activite et la date prevue sont requis.");
        return;
      }

      setSaving(true);
      setError("");
      const payload = {
        title: form.title.trim(),
        location: form.location.trim(),
        event_date: new Date(form.event_date).toISOString(),
        status: form.status,
        participants_target: toNumberOrNull(form.participants_target),
        description: buildDescriptionPayload(form),
      };

      if (editingActivity) {
        const { error: updateError } = await supabase
          .from("activities")
          .update(payload)
          .eq("id", editingActivity.id);
        if (updateError) throw updateError;
        await logAuditEvent({
          action: "UPDATE_ACTIVITY",
          entity: "activities",
          entity_id: editingActivity.id,
          details: { title: form.title, status: form.status },
        });
        setSuccess("Activite mise a jour.");
        await queueEmailNotification({
          type: "activity_updated",
          subject: "Activite modifiee",
          message: `L'activite '${form.title}' a ete modifiee.`,
          payload: { activity_id: editingActivity.id, status: form.status },
        });
      } else {
        const { error: insertError } = await supabase.from("activities").insert([payload]);
        if (insertError) throw insertError;
        await logAuditEvent({
          action: "CREATE_ACTIVITY",
          entity: "activities",
          details: { title: form.title, status: form.status },
        });
        setSuccess("Activite creee.");
        await queueEmailNotification({
          type: "activity_created",
          subject: "Nouvelle activite",
          message: `Une nouvelle activite '${form.title}' a ete creee.`,
          payload: { event_date: form.event_date, status: form.status },
        });
      }

      closeModal();
      await fetchActivities();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_ACTIVITES] save:", err);
      setError(err.message || "Impossible d'enregistrer cette activite.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const approved = await confirm({
      title: "Supprimer l'activite",
      message: "Voulez-vous supprimer cette activite ?",
      confirmText: "Supprimer",
      tone: "danger",
    });
    if (!approved) return;

    try {
      const { error: deleteError } = await supabase.from("activities").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await logAuditEvent({
        action: "DELETE_ACTIVITY",
        entity: "activities",
        entity_id: id,
      });
      setActivities((current) => current.filter((item) => item.id !== id));
      setSuccess("Activite supprimee.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_ACTIVITES] delete:", err);
      setError(err.message || "Impossible de supprimer cette activite.");
    }
  }

  const normalizedActivities = useMemo(() => {
    return activities.map((activity) => {
      const details = parseActivityDetails(activity.description);
      return {
        ...activity,
        details,
      };
    });
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return normalizedActivities.filter((activity) => {
      const plan = activity.details?.planification || {};
      const report = activity.details?.rapport || {};
      const searchable = [
        activity.title,
        activity.location,
        activity.status,
        activity.details?.notes,
        plan.strategie_1,
        plan.strategie_2,
        plan.strategie_3,
        plan.strategie_4,
        plan.strategie_5,
        report.theme,
        report.verset_biblique,
        report.objectifs_atteints,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !search || searchable.includes(search.toLowerCase());
      const matchesStatus = !statusFilter || activity.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [normalizedActivities, search, statusFilter]);

  const stats = useMemo(() => {
    const total = activities.length;
    const planned = activities.filter((item) => item.status === "Planifie").length;
    const published = activities.filter((item) => item.status === "Publie").length;
    const done = activities.filter((item) => item.status === "Termine").length;
    return { total, planned, published, done };
  }, [activities]);

  function handlePrintActivitiesReport() {
    printTableReport({
      title: "Etat de sortie - Rapport d'activites",
      subtitle: "Planification et rapport des activites (filtres appliques)",
      columns: [
        { key: "nom", label: "Nom activite" },
        { key: "date_prevue", label: "Date prevue" },
        { key: "participants", label: "Participants prevus" },
        { key: "budget_prevu", label: "Budget prevu" },
        { key: "budget_reel", label: "Budget reel" },
        { key: "theme", label: "Theme" },
        { key: "effectif", label: "Effectif" },
        { key: "offrande", label: "Offrande" },
        { key: "statut", label: "Statut" },
      ],
      rows: filteredActivities.map((activity) => {
        const plan = activity.details?.planification || {};
        const report = activity.details?.rapport || {};
        return {
          nom: activity.title || "-",
          date_prevue: activity.event_date ? new Date(activity.event_date).toLocaleString("fr-FR") : "-",
          participants: activity.participants_target ?? "-",
          budget_prevu: plan.budget_prevu !== null && plan.budget_prevu !== undefined ? formatMoney(plan.budget_prevu) : "-",
          budget_reel: plan.budget_reel !== null && plan.budget_reel !== undefined ? formatMoney(plan.budget_reel) : "-",
          theme: report.theme || "-",
          effectif: report.effectif ?? "-",
          offrande: report.offrande !== null && report.offrande !== undefined ? formatMoney(report.offrande) : "-",
          statut: activity.status || "-",
        };
      }),
      summary: [
        { label: "Total activites", value: filteredActivities.length },
        { label: "Planifiees", value: filteredActivities.filter((a) => a.status === "Planifie").length },
        { label: "Publiees", value: filteredActivities.filter((a) => a.status === "Publie").length },
        { label: "Terminees", value: filteredActivities.filter((a) => a.status === "Termine").length },
      ],
    });
  }

  if (loading) return <Loading message="Chargement des activites..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Gestion des Activites</h1>
          <p className="mt-2 text-slate-600">
            Planification complete et rapport detaille pour chaque activite de l'eglise.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrintActivitiesReport}
            disabled={tableMissing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            title="Imprimer rapport d'activites"
          >
            <box-icon name="printer" type="solid" color="currentColor" size="sm"></box-icon>
            Imprimer
          </button>
          <button
            onClick={openCreateModal}
            disabled={tableMissing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            title="Creer une activite"
          >
            <box-icon name="plus-circle" type="solid" color="currentColor" size="sm"></box-icon>
            Ajouter
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {!tableMissing && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
            </article>
            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <p className="text-sm text-blue-700">Planifiees</p>
              <p className="mt-2 text-3xl font-bold text-blue-900">{stats.planned}</p>
            </article>
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-sm text-amber-700">Publiees</p>
              <p className="mt-2 text-3xl font-bold text-amber-900">{stats.published}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm text-emerald-700">Terminees</p>
              <p className="mt-2 text-3xl font-bold text-emerald-900">{stats.done}</p>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-3">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher activite, strategie, theme, verset..."
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-orange-500"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-orange-500"
              >
                <option value="">Tous les statuts</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                }}
                className="rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reinitialiser les filtres
              </button>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            {filteredActivities.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm lg:col-span-2">
                Aucune activite enregistree pour le moment.
              </div>
            ) : (
              filteredActivities.map((activity) => {
                const plan = activity.details?.planification || {};
                const report = activity.details?.rapport || {};
                const strategyList = [
                  plan.strategie_1,
                  plan.strategie_2,
                  plan.strategie_3,
                  plan.strategie_4,
                  plan.strategie_5,
                ].filter(Boolean);
                return (
                  <article key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                          {activity.status}
                        </span>
                        <h3 className="mt-3 text-xl font-bold text-slate-900">{activity.title}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(activity)}
                          className="rounded-lg px-1 py-1 text-emerald-600 hover:text-emerald-500"
                          title="Modifier"
                        >
                          <box-icon name="edit" type="solid" color="currentColor" size="sm"></box-icon>
                        </button>
                        <button
                          onClick={() => handleDelete(activity.id)}
                          className="rounded-lg px-1 py-1 text-red-500 hover:text-red-400"
                          title="Supprimer"
                        >
                          <box-icon name="trash" type="solid" color="currentColor" size="sm"></box-icon>
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
                      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="font-semibold text-slate-900">Planification</p>
                        <p><span className="font-medium">Date prevue:</span> {dateLabel(activity.event_date)}</p>
                        <p><span className="font-medium">Lieu:</span> {activity.location || "A preciser"}</p>
                        <p><span className="font-medium">Participants prevus:</span> {activity.participants_target || "-"}</p>
                        <p><span className="font-medium">Budget prevu:</span> {plan.budget_prevu !== null && plan.budget_prevu !== undefined ? formatMoney(plan.budget_prevu) : "-"}</p>
                        <p><span className="font-medium">Budget reel:</span> {plan.budget_reel !== null && plan.budget_reel !== undefined ? formatMoney(plan.budget_reel) : "-"}</p>
                        <p><span className="font-medium">Activites finales:</span> {plan.activites_finales || "-"}</p>
                      </div>

                      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="font-semibold text-slate-900">Rapport d'activite</p>
                        <p><span className="font-medium">Nom:</span> {report.nom_activite || "-"}</p>
                        <p><span className="font-medium">Date:</span> {report.date ? new Date(report.date).toLocaleDateString("fr-FR") : "-"}</p>
                        <p><span className="font-medium">Theme:</span> {report.theme || "-"}</p>
                        <p><span className="font-medium">Verset biblique:</span> {report.verset_biblique || "-"}</p>
                        <p><span className="font-medium">Effectif:</span> {report.effectif ?? "-"}</p>
                        <p><span className="font-medium">Offrande:</span> {report.offrande !== null && report.offrande !== undefined ? formatMoney(report.offrande) : "-"}</p>
                        <p><span className="font-medium">Objectifs atteints:</span> {report.objectifs_atteints || "-"}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">Strategies</p>
                      {strategyList.length === 0 ? (
                        <p className="text-slate-500">Aucune strategie renseignee.</p>
                      ) : (
                        strategyList.map((item, index) => <p key={`${activity.id}-strategy-${index}`}>{`Strategie ${index + 1}: ${item}`}</p>)
                      )}
                      {activity.details?.notes && (
                        <p className="pt-1 text-slate-600">
                          <span className="font-medium text-slate-900">Notes:</span> {activity.details.notes}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingActivity ? "Modifier l'activite" : "Nouvelle activite"}
                </h2>
                <p className="text-sm text-slate-500">
                  Planification + rapport d'activite selon les besoins de l'eglise.
                </p>
              </div>
              <button onClick={closeModal} className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
                Fermer
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6 p-6">
              <section className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Nom d'activite prevu</span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Date de l'activite prevue</span>
                  <input
                    type="datetime-local"
                    value={form.event_date}
                    onChange={(e) => setForm((current) => ({ ...current, event_date: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Statut</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Lieu</span>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Nombre des participants prevu</span>
                  <input
                    type="number"
                    min="0"
                    value={form.participants_target}
                    onChange={(e) => setForm((current) => ({ ...current, participants_target: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Budget prevu</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.budget_planned}
                    onChange={(e) => setForm((current) => ({ ...current, budget_planned: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Budget reel pour activite</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.budget_actual}
                    onChange={(e) => setForm((current) => ({ ...current, budget_actual: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </label>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Strategie de planification</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input value={form.strategy_1} onChange={(e) => setForm((current) => ({ ...current, strategy_1: e.target.value }))} placeholder="Strategie 1 (ex: reunion comite)" className="rounded-xl border border-slate-300 px-4 py-3" />
                  <input value={form.strategy_2} onChange={(e) => setForm((current) => ({ ...current, strategy_2: e.target.value }))} placeholder="Strategie 2 (ex: sensibilisation)" className="rounded-xl border border-slate-300 px-4 py-3" />
                  <input value={form.strategy_3} onChange={(e) => setForm((current) => ({ ...current, strategy_3: e.target.value }))} placeholder="Strategie 3 (ex: organisation internet)" className="rounded-xl border border-slate-300 px-4 py-3" />
                  <input value={form.strategy_4} onChange={(e) => setForm((current) => ({ ...current, strategy_4: e.target.value }))} placeholder="Strategie 4 (ex: priere et conseil)" className="rounded-xl border border-slate-300 px-4 py-3" />
                  <input value={form.strategy_5} onChange={(e) => setForm((current) => ({ ...current, strategy_5: e.target.value }))} placeholder="Strategie 5 (ex: reunion finale)" className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-2" />
                  <textarea value={form.final_activities} onChange={(e) => setForm((current) => ({ ...current, final_activities: e.target.value }))} rows="3" placeholder="En fin: Activites" className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-2" />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Rapport d'activite</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input value={form.report_name} onChange={(e) => setForm((current) => ({ ...current, report_name: e.target.value }))} placeholder="Nom d'activite" className="rounded-xl border border-slate-300 px-4 py-3" />
                  <input type="date" value={form.report_date} onChange={(e) => setForm((current) => ({ ...current, report_date: e.target.value }))} className="rounded-xl border border-slate-300 px-4 py-3" />
                  <input value={form.report_theme} onChange={(e) => setForm((current) => ({ ...current, report_theme: e.target.value }))} placeholder="Theme" className="rounded-xl border border-slate-300 px-4 py-3" />
                  <input value={form.report_verse} onChange={(e) => setForm((current) => ({ ...current, report_verse: e.target.value }))} placeholder="Verset biblique" className="rounded-xl border border-slate-300 px-4 py-3" />
                  <input type="number" min="0" value={form.report_attendance} onChange={(e) => setForm((current) => ({ ...current, report_attendance: e.target.value }))} placeholder="Effectif" className="rounded-xl border border-slate-300 px-4 py-3" />
                  <input type="number" min="0" step="0.01" value={form.report_offering} onChange={(e) => setForm((current) => ({ ...current, report_offering: e.target.value }))} placeholder="Offrande" className="rounded-xl border border-slate-300 px-4 py-3" />
                  <textarea value={form.report_objectives} onChange={(e) => setForm((current) => ({ ...current, report_objectives: e.target.value }))} rows="3" placeholder="Objectifs atteints" className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-2" />
                  <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows="3" placeholder="Notes complementaires" className="rounded-xl border border-slate-300 px-4 py-3 md:col-span-2" />
                </div>
              </section>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Enregistrement..." : editingActivity ? "Mettre a jour" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
