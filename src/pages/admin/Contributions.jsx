import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Loading from "../../components/Loading";
import { printTableReport } from "../../lib/printUtils";

const defaultForm = {
  jeune_id: "",
  date: new Date().toISOString().slice(0, 10),
  montant: "",
  amount: "",
  status: "en attente",
  regul: "Mensuel",
  commentaire: "",
};

const statusOptions = ["en attente", "non payé", "partiel", "payé"];
const regularityOptions = ["Mensuel", "Ponctuel", "Exceptionnel"];

const defaultExpenseForm = {
  date_depense: new Date().toISOString().slice(0, 10),
  libelle: "",
  montant: "",
  commentaire: "",
};

function isMissingRelationError(error) {
  const code = error?.code || error?.details?.code || error?.hint;
  const message = (error?.message || "").toLowerCase();
  return code === "42P01" || code === "PGRST205" || message.includes("could not find the table");
}

function isPermissionError(error) {
  const code = error?.code || error?.details?.code;
  const message = (error?.message || "").toLowerCase();
  return code === "42501" || message.includes("permission denied") || message.includes("row-level security");
}

function currency(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fullName(jeune) {
  return [jeune.nom, jeune.postnom, jeune.prenom].filter(Boolean).join(" ");
}

export default function AdminContributions() {
  const [contributions, setContributions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [jeunes, setJeunes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [caisseTableMissing, setCaisseTableMissing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingContribution, setEditingContribution] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        { data: contributionsData, error: contributionsError },
        { data: jeunesData, error: jeunesError },
        { data: expensesData, error: expensesError },
      ] =
        await Promise.all([
          supabase.from("contributions").select("*").order("date", { ascending: false }),
          supabase.from("jeunes").select("id, nom, postnom, prenom").order("nom", { ascending: true }),
          supabase.from("caisse_depenses").select("*").order("date_depense", { ascending: false }),
        ]);

      if (contributionsError) throw contributionsError;
      if (jeunesError) throw jeunesError;

      setContributions(contributionsData || []);
      setJeunes(jeunesData || []);
      if (expensesError) {
        if (isMissingRelationError(expensesError)) {
          setCaisseTableMissing(true);
          setExpenses([]);
        } else if (isPermissionError(expensesError)) {
          setCaisseTableMissing(false);
          setExpenses([]);
          setError(
            "Acces refuse a la table caisse_depenses. Verifie les policies RLS (role admin) dans Supabase.",
          );
        } else {
          throw expensesError;
        }
      } else {
        setCaisseTableMissing(false);
        setExpenses(expensesData || []);
      }
    } catch (err) {
      console.error("[ADMIN_CONTRIBUTIONS] loadData:", err);
      setError(err.message || "Impossible de charger les contributions.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingContribution(null);
    setForm(defaultForm);
    setShowModal(true);
    setError("");
  }

  function openEditModal(contribution) {
    setEditingContribution(contribution);
    setForm({
      ...defaultForm,
      ...contribution,
      montant: contribution.montant ?? contribution.amount ?? "",
      amount: contribution.amount ?? contribution.montant ?? "",
      date: contribution.date ? contribution.date.slice(0, 10) : defaultForm.date,
    });
    setShowModal(true);
    setError("");
  }

  function closeModal() {
    setEditingContribution(null);
    setForm(defaultForm);
    setShowModal(false);
  }

  function updateField(key, value) {
    setForm((current) => {
      if (key === "montant" || key === "amount") {
        return { ...current, montant: value, amount: value };
      }
      return { ...current, [key]: value };
    });
  }

  async function handleSave(event) {
    event?.preventDefault();

    try {
      if (!form.jeune_id || !form.date || !form.montant) {
        setError("Le jeune, la date et le montant sont requis.");
        return;
      }

      const amountValue = Number(form.montant);
      if (Number.isNaN(amountValue) || amountValue <= 0) {
        setError("Le montant doit être supérieur à 0.");
        return;
      }

      setSaving(true);
      setError("");

      const payload = {
        jeune_id: form.jeune_id,
        date: form.date,
        montant: amountValue,
        amount: amountValue,
        status: form.status,
        regul: form.regul,
        commentaire: form.commentaire.trim(),
      };

      if (editingContribution) {
        const { error: updateError } = await supabase
          .from("contributions")
          .update(payload)
          .eq("id", editingContribution.id);
        if (updateError) throw updateError;
        setSuccess("Contribution mise à jour.");
      } else {
        const { error: insertError } = await supabase.from("contributions").insert([payload]);
        if (insertError) throw insertError;
        setSuccess("Contribution enregistrée.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_CONTRIBUTIONS] save:", err);
      setError(err.message || "Impossible d'enregistrer cette contribution.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Supprimer cette contribution ?")) return;

    try {
      setError("");
      const { error: deleteError } = await supabase.from("contributions").delete().eq("id", id);
      if (deleteError) throw deleteError;
      setContributions((current) => current.filter((item) => item.id !== id));
      setSuccess("Contribution supprimée.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_CONTRIBUTIONS] delete:", err);
      setError(err.message || "Impossible de supprimer cette contribution.");
    }
  }

  async function handleSaveExpense(event) {
    event?.preventDefault();
    try {
      if (!expenseForm.libelle.trim()) {
        setError("Le libellé de la dépense est requis.");
        return;
      }
      if (!expenseForm.montant) {
        setError("Le montant de la dépense est requis.");
        return;
      }
      const amountValue = Number(expenseForm.montant);
      if (Number.isNaN(amountValue) || amountValue <= 0) {
        setError("Le montant dépensé doit être supérieur à 0.");
        return;
      }

      setSavingExpense(true);
      setError("");

      const payload = {
        date_depense: expenseForm.date_depense || new Date().toISOString().slice(0, 10),
        libelle: expenseForm.libelle.trim(),
        montant: amountValue,
        commentaire: expenseForm.commentaire.trim(),
      };

      const { error: insertError } = await supabase.from("caisse_depenses").insert([payload]);
      if (insertError) throw insertError;

      setSuccess("Dépense enregistrée dans le rapport de caisse.");
      setExpenseForm(defaultExpenseForm);
      await loadData();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_CONTRIBUTIONS] saveExpense:", err);
      if (isMissingRelationError(err)) {
        setCaisseTableMissing(true);
        setError("La table 'caisse_depenses' est absente. Exécute le script sql/caisse_depenses.sql.");
      } else if (isPermissionError(err)) {
        setCaisseTableMissing(false);
        setError("Acces refuse (RLS) sur caisse_depenses. Connecte-toi en admin et verifie les policies.");
      } else {
        setError(err.message || "Impossible d'enregistrer cette dépense.");
      }
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleDeleteExpense(id) {
    if (!window.confirm("Supprimer cette dépense du rapport de caisse ?")) return;
    try {
      setError("");
      const { error: deleteError } = await supabase.from("caisse_depenses").delete().eq("id", id);
      if (deleteError) throw deleteError;
      setExpenses((current) => current.filter((item) => item.id !== id));
      setSuccess("Dépense supprimée.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_CONTRIBUTIONS] deleteExpense:", err);
      setError(err.message || "Impossible de supprimer cette dépense.");
    }
  }

  const filteredContributions = useMemo(() => {
    return contributions.filter((contribution) => {
      const jeune = jeunes.find((item) => item.id === contribution.jeune_id);
      const contributionMonth = contribution.date ? contribution.date.slice(0, 7) : "";
      const searchable = [
        jeune ? fullName(jeune) : "",
        contribution.status,
        contribution.regul,
        contribution.commentaire,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || searchable.includes(search.toLowerCase());
      const matchesStatus = !statusFilter || contribution.status === statusFilter;
      const matchesMonth = !monthFilter || contributionMonth === monthFilter;
      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [contributions, jeunes, search, statusFilter, monthFilter]);

  const stats = useMemo(() => {
    const totalAmount = contributions.reduce((sum, item) => sum + Number(item.amount ?? item.montant ?? 0), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.montant ?? 0), 0);
    const realBalance = totalAmount - totalExpenses;
    const paid = contributions.filter((item) => item.status === "payé").length;
    const partial = contributions.filter((item) => item.status === "partiel").length;
    const unpaid = contributions.filter((item) => item.status === "non payé").length;
    const pending = contributions.filter((item) => item.status === "en attente").length;

    return {
      totalAmount,
      totalExpenses,
      realBalance,
      count: contributions.length,
      paid,
      partial,
      unpaid,
      pending,
    };
  }, [contributions, expenses]);

  function handlePrintContributions() {
    printTableReport({
      title: "Etat de sortie - Contributions",
      subtitle: "Contributions affichees (filtres appliques)",
      columns: [
        { key: "jeune", label: "Jeune" },
        { key: "date", label: "Date" },
        { key: "montant", label: "Montant" },
        { key: "status", label: "Statut" },
        { key: "regul", label: "Regularite" },
        { key: "commentaire", label: "Commentaire" },
      ],
      rows: filteredContributions.map((contribution) => {
        const jeune = jeunes.find((item) => item.id === contribution.jeune_id);
        return {
          jeune: jeune ? fullName(jeune) : "Jeune supprime",
          date: contribution.date ? new Date(contribution.date).toLocaleDateString("fr-FR") : "-",
          montant: currency(contribution.amount ?? contribution.montant),
          status: contribution.status || "-",
          regul: contribution.regul || "-",
          commentaire: contribution.commentaire || "-",
        };
      }),
      summary: [
        { label: "Total lignes", value: filteredContributions.length },
        { label: "Total collecte (global)", value: currency(stats.totalAmount) },
        { label: "Payees", value: stats.paid },
        { label: "En attente", value: stats.pending },
      ],
    });
  }

  function handlePrintCashReport() {
    printTableReport({
      title: "Etat de sortie - Rapport de caisse",
      subtitle: "Depenses et solde reel",
      columns: [
        { key: "date_depense", label: "Date depense" },
        { key: "libelle", label: "Libelle depense" },
        { key: "montant", label: "Montant depense" },
        { key: "commentaire", label: "Commentaire" },
      ],
      rows: expenses.map((item) => ({
        date_depense: item.date_depense ? new Date(item.date_depense).toLocaleDateString("fr-FR") : "-",
        libelle: item.libelle || "-",
        montant: currency(item.montant),
        commentaire: item.commentaire || "-",
      })),
      summary: [
        { label: "Total contributions", value: currency(stats.totalAmount) },
        { label: "Total depenses", value: currency(stats.totalExpenses) },
        { label: "Solde reel en caisse", value: currency(stats.realBalance) },
      ],
    });
  }

  if (loading) return <Loading message="Chargement des contributions..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Gestion des Contributions</h1>
          <p className="mt-2 text-slate-600">
            Suivi des cotisations mensuelles, régularité des jeunes et validation des paiements.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={handlePrintContributions}
            className="w-full rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
          >
            Imprimer le rapport
          </button>
          <button
            onClick={openCreateModal}
            className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"
          >
            + Ajouter une contribution
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total collecté</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{currency(stats.totalAmount)}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm text-emerald-700">Payées</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{stats.paid}</p>
        </article>
        <article className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
          <p className="text-sm text-orange-700">En attente</p>
          <p className="mt-2 text-3xl font-bold text-orange-900">{stats.pending}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-amber-700">Partielles</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">{stats.partial}</p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-sm text-rose-700">Non payées</p>
          <p className="mt-2 text-3xl font-bold text-rose-900">{stats.unpaid}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Rapport de caisse</h2>
            <p className="text-sm text-slate-600">
              Enregistre les dépenses effectuées. Le système calcule automatiquement le solde réel en caisse.
            </p>
          </div>
          <button
            onClick={handlePrintCashReport}
            disabled={caisseTableMissing}
            className="w-full rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Imprimer rapport de caisse
          </button>
        </div>

        {caisseTableMissing ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            La table <strong>caisse_depenses</strong> n'existe pas encore. Exécute le script{" "}
            <code>sql/caisse_depenses.sql</code> dans Supabase puis rafraîchis la page.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-700">Total contributions</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">{currency(stats.totalAmount)}</p>
              </article>
              <article className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">Total dépenses</p>
                <p className="mt-1 text-2xl font-bold text-red-900">{currency(stats.totalExpenses)}</p>
              </article>
              <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Solde réel en caisse</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">{currency(stats.realBalance)}</p>
              </article>
            </div>

            <form onSubmit={handleSaveExpense} className="mt-5 grid gap-3 lg:grid-cols-5">
              <input
                type="date"
                value={expenseForm.date_depense}
                onChange={(event) => setExpenseForm((current) => ({ ...current, date_depense: event.target.value }))}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
              />
              <input
                type="text"
                value={expenseForm.libelle}
                onChange={(event) => setExpenseForm((current) => ({ ...current, libelle: event.target.value }))}
                placeholder="Libellé de la dépense"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 lg:col-span-2"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={expenseForm.montant}
                onChange={(event) => setExpenseForm((current) => ({ ...current, montant: event.target.value }))}
                placeholder="Montant dépensé"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
              />
              <button
                type="submit"
                disabled={savingExpense}
                className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingExpense ? "Enregistrement..." : "Ajouter dépense"}
              </button>

              <textarea
                value={expenseForm.commentaire}
                onChange={(event) => setExpenseForm((current) => ({ ...current, commentaire: event.target.value }))}
                rows="3"
                placeholder="Commentaire (optionnel)"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 lg:col-span-5"
              />
            </form>

            {expenses.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Aucune dépense enregistrée pour le moment.
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 md:hidden">
                  {expenses.map((item) => (
                    <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{item.libelle || "-"}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.date_depense ? new Date(item.date_depense).toLocaleDateString("fr-FR") : "-"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-red-700">{currency(item.montant)}</p>
                      <p className="mt-1 break-words text-sm text-slate-600">{item.commentaire || "Aucun commentaire"}</p>
                      <button
                        onClick={() => handleDeleteExpense(item.id)}
                        className="mt-3 w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Supprimer
                      </button>
                    </article>
                  ))}
                </div>

                <div className="mt-4 hidden overflow-x-auto md:block">
                  <table className="min-w-[860px] w-full">
                    <thead className="bg-slate-100 text-left text-sm text-slate-600">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Date dépense</th>
                        <th className="px-5 py-4 font-semibold">Libellé dépense</th>
                        <th className="px-5 py-4 font-semibold">Montant dépensé</th>
                        <th className="px-5 py-4 font-semibold">Commentaire</th>
                        <th className="px-5 py-4 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100 text-sm text-slate-700">
                          <td className="px-5 py-4">
                            {item.date_depense ? new Date(item.date_depense).toLocaleDateString("fr-FR") : "-"}
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-900">{item.libelle || "-"}</td>
                          <td className="px-5 py-4 text-red-700">{currency(item.montant)}</td>
                          <td className="px-5 py-4 text-slate-600">{item.commentaire || "-"}</td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleDeleteExpense(item.id)}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un jeune ou un commentaire..."
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
          >
            <option value="">Tous les statuts</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <input
            type="month"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
          />
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setMonthFilter("");
            }}
            className="rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredContributions.length === 0 && (
          <div className="px-5 py-10 text-center text-slate-500">Aucune contribution trouvee.</div>
        )}

        {filteredContributions.length > 0 && (
          <div className="grid gap-3 p-3 md:hidden">
            {filteredContributions.map((contribution) => {
              const jeune = jeunes.find((item) => item.id === contribution.jeune_id);
              return (
                <article key={contribution.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{jeune ? fullName(jeune) : "Jeune supprime"}</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    <p><span className="font-medium">Date:</span> {contribution.date ? new Date(contribution.date).toLocaleDateString("fr-FR") : "-"}</p>
                    <p><span className="font-medium">Montant:</span> {currency(contribution.amount ?? contribution.montant)}</p>
                    <p><span className="font-medium">Statut:</span> {contribution.status || "-"}</p>
                    <p><span className="font-medium">Regularite:</span> {contribution.regul || "Mensuel"}</p>
                    <p className="break-words"><span className="font-medium">Commentaire:</span> {contribution.commentaire || "-"}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEditModal(contribution)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(contribution.id)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[980px] w-full">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="px-5 py-4 font-semibold">Jeune</th>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Montant</th>
                <th className="px-5 py-4 font-semibold">Statut</th>
                <th className="px-5 py-4 font-semibold">Régularité</th>
                <th className="px-5 py-4 font-semibold">Commentaire</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContributions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-500">
                    Aucune contribution trouvée.
                  </td>
                </tr>
              ) : (
                filteredContributions.map((contribution) => {
                  const jeune = jeunes.find((item) => item.id === contribution.jeune_id);
                  return (
                    <tr key={contribution.id} className="border-t border-slate-100 text-sm text-slate-700">
                      <td className="px-5 py-4 font-medium text-slate-900">{jeune ? fullName(jeune) : "Jeune supprimé"}</td>
                      <td className="px-5 py-4">{contribution.date ? new Date(contribution.date).toLocaleDateString("fr-FR") : "-"}</td>
                      <td className="px-5 py-4">{currency(contribution.amount ?? contribution.montant)}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          contribution.status === "payé"
                            ? "bg-emerald-100 text-emerald-700"
                            : contribution.status === "en attente"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-700"
                        }`}>
                          {contribution.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">{contribution.regul || "Mensuel"}</td>
                      <td className="px-5 py-4 text-slate-500">{contribution.commentaire || "-"}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(contribution)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(contribution.id)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingContribution ? "Modifier la contribution" : "Nouvelle contribution"}
                </h2>
                <p className="text-sm text-slate-500">Passe une contribution de en attente vers payé quand elle est approuvée.</p>
              </div>
              <button onClick={closeModal} className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
                Fermer
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Jeune concerné</span>
                  <select
                    value={form.jeune_id}
                    onChange={(e) => updateField("jeune_id", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  >
                    <option value="">Sélectionner un jeune</option>
                    {jeunes.map((jeune) => (
                      <option key={jeune.id} value={jeune.id}>
                        {fullName(jeune)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Date</span>
                  <input type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Montant</span>
                  <input type="number" min="0" step="0.01" value={form.montant} onChange={(e) => updateField("montant", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Statut</span>
                  <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Régularité</span>
                  <select value={form.regul} onChange={(e) => updateField("regul", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    {regularityOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Commentaire</span>
                  <textarea value={form.commentaire} onChange={(e) => updateField("commentaire", e.target.value)} rows="4" className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Ex: En attente de confirmation..." />
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeModal} className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Enregistrement..." : editingContribution ? "Mettre à jour" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
