import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getMemberContext, getMemberContributions } from "../../lib/memberData";
import { queueEmailNotification } from "../../lib/emailNotifications";
import "boxicons";

const defaultForm = {
  date: new Date().toISOString().slice(0, 10),
  montant: "",
  regul: "Mensuel",
  commentaire: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function statusKey(status) {
  const value = (status || "").toString().toLowerCase();
  if (value.includes("attente")) return "pending";
  if (value.includes("pay")) return "paid";
  if (value.includes("partiel")) return "partial";
  if (value.includes("non")) return "unpaid";
  return "other";
}

export default function MemberContributions() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [publicUser, setPublicUser] = useState(null);
  const [jeune, setJeune] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const context = await getMemberContext();
      const rows = await getMemberContributions(context.jeune?.id);
      setPublicUser(context.publicUser);
      setJeune(context.jeune || null);
      setContributions(rows);
    } catch (err) {
      console.error("[MEMBER_CONTRIB] load:", err);
      setError(err.message || "Impossible de charger vos contributions.");
    } finally {
      setLoading(false);
    }
  }

  async function addContribution(event) {
    event.preventDefault();
    try {
      if (!jeune?.id) {
        setError("Completez d'abord votre fiche profil avant d'ajouter une contribution.");
        return;
      }
      if (!form.date || !form.montant) {
        setError("Date et montant sont requis.");
        return;
      }

      const amount = Number(form.montant);
      if (Number.isNaN(amount) || amount <= 0) {
        setError("Le montant doit etre superieur a 0.");
        return;
      }

      setSaving(true);
      setError("");

      const payload = {
        jeune_id: jeune.id,
        date: form.date,
        montant: amount,
        amount: amount,
        status: "en attente",
        regul: form.regul,
        commentaire: form.commentaire.trim(),
        created_by: publicUser?.id || null,
      };

      const { error: insertError } = await supabase.from("contributions").insert([payload]);
      if (insertError) throw insertError;
      await queueEmailNotification({
        type: "contribution_submitted",
        subject: "Nouvelle contribution en attente",
        message: `Une contribution en attente a ete soumise par ${publicUser?.email || "un membre"}.`,
        payload: { jeune_id: jeune.id, montant: amount, date: form.date },
      });

      const rows = await getMemberContributions(jeune.id);
      setContributions(rows);
      setForm(defaultForm);
      setShowModal(false);
      setSuccess("Contribution enregistree et en attente de validation admin.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[MEMBER_CONTRIB] add:", err);
      setError(err.message || "Impossible d'ajouter la contribution.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContribution(id) {
    if (!window.confirm("Supprimer cette contribution en attente ?")) return;
    try {
      const { error: deleteError } = await supabase
        .from("contributions")
        .delete()
        .eq("id", id)
        .eq("created_by", publicUser?.id || "")
        .in("status", ["en attente"]);

      if (deleteError) throw deleteError;
      setContributions((current) => current.filter((item) => item.id !== id));
      setSuccess("Contribution en attente supprimee.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[MEMBER_CONTRIB] delete:", err);
      setError(err.message || "Suppression impossible.");
    }
  }

  const summary = useMemo(() => {
    const approvedRows = contributions.filter((item) => statusKey(item.status) === "paid");
    const total = approvedRows.reduce((sum, item) => sum + Number(item.amount ?? item.montant ?? 0), 0);
    const currentMonthTag = new Date().toISOString().slice(0, 7);
    const currentMonth = approvedRows
      .filter((item) => item.date?.slice(0, 7) === currentMonthTag)
      .reduce((sum, item) => sum + Number(item.amount ?? item.montant ?? 0), 0);
    const pendingCount = contributions.filter((item) => statusKey(item.status) === "pending").length;
    return { total, currentMonth, pendingCount };
  }, [contributions]);

  if (loading) {
    return <div className="rounded-xl bg-white p-6 shadow-sm">Chargement des contributions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Mes Contributions</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + Ajouter une contribution
        </button>
      </div>

      {!jeune?.id && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Votre fiche jeune n'est pas encore complete. Rendez-vous sur{" "}
          <Link to="/member/profile" className="font-semibold underline">Mon profil</Link> pour la renseigner.
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-slate-600 text-sm">Total paye</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(summary.total)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-slate-600 text-sm">Paye ce mois</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(summary.currentMonth)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-slate-600 text-sm">En attente</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{summary.pendingCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="p-4 text-left text-sm font-semibold text-slate-700">Date</th>
              <th className="p-4 text-left text-sm font-semibold text-slate-700">Montant</th>
              <th className="p-4 text-left text-sm font-semibold text-slate-700">Statut</th>
              <th className="p-4 text-left text-sm font-semibold text-slate-700">Commentaire</th>
              <th className="p-4 text-left text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contributions.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500">Aucune contribution enregistree.</td>
              </tr>
            ) : (
              contributions.map((contribution) => {
                const key = statusKey(contribution.status);
                return (
                  <tr key={contribution.id} className="border-b hover:bg-slate-50 transition">
                    <td className="p-4 text-sm text-slate-900">
                      {contribution.date ? new Date(contribution.date).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(contribution.amount ?? contribution.montant)}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        key === "paid"
                          ? "bg-green-100 text-green-800"
                          : key === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                      }`}>
                        {contribution.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{contribution.commentaire || "-"}</td>
                    <td className="p-4 text-sm">
                      {contribution.created_by === publicUser?.id && key === "pending" ? (
                        <button
                          onClick={() => deleteContribution(contribution.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Supprimer
                        </button>
                      ) : (
                        <span className="text-slate-400">Verrouille</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <box-icon name="edit-alt" type="solid" color="#1d4ed8"></box-icon>
          <h3 className="font-bold text-blue-900">Comment contribuer ?</h3>
        </div>
        <p className="text-blue-800 text-sm">
          Cliquez sur le bouton "Ajouter une contribution" pour enregistrer votre contribution mensuelle.
          Elle reste en attente jusqu'a validation d'un administrateur.
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-xl font-bold text-slate-900">Ajouter une contribution</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-600">Fermer</button>
            </div>
            <form onSubmit={addContribution} className="p-5 space-y-4">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.montant}
                onChange={(e) => setForm((current) => ({ ...current, montant: e.target.value }))}
                placeholder="Montant"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
              <select
                value={form.regul}
                onChange={(e) => setForm((current) => ({ ...current, regul: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              >
                <option value="Mensuel">Mensuel</option>
                <option value="Ponctuel">Ponctuel</option>
                <option value="Exceptionnel">Exceptionnel</option>
              </select>
              <textarea
                value={form.commentaire}
                onChange={(e) => setForm((current) => ({ ...current, commentaire: e.target.value }))}
                rows="3"
                placeholder="Commentaire (optionnel)"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-slate-300">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60">
                  {saving ? "Enregistrement..." : "Envoyer en attente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
