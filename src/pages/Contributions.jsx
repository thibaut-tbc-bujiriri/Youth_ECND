import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";

const defaultContribution = { jeune_id: "", montant: "", date: "", status: "non payé", regul: "" };

export default function Contributions() {
  const [contributions, setContributions] = useState([]);
  const [jeunes, setJeunes] = useState([]);
  const [form, setForm] = useState(defaultContribution);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: cons } = await supabase.from("contributions").select("*");
      const { data: je } = await supabase.from("jeunes").select("id, nom, postnom, prenom");
      setContributions(cons || []);
      setJeunes(je || []);
      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const total = contributions.length;
    const paid = contributions.filter((c) => c.status === "payé").length;
    const partial = contributions.filter((c) => c.status === "partiel").length;
    const unpaid = contributions.filter((c) => c.status === "non payé").length;
    return { total, paid, partial, unpaid };
  }, [contributions]);

  async function addContribution(e) {
    e.preventDefault();
    if (!form.jeune_id || !form.montant || !form.date) {
      alert("Jeune, montant et date requis");
      return;
    }
    setSaving(true);
    await supabase.from("contributions").insert([{ ...form, amount: form.montant }]);
    setForm(defaultContribution);
    const { data } = await supabase.from("contributions").select("*");
    setContributions(data || []);
    setSaving(false);
  }

  if (loading) return <DashboardLayout><Loading message="Chargement des contributions..." /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Contributions</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border">Total: {stats.total}</div>
          <div className="p-4 bg-white rounded-xl border">Payé: {stats.paid}</div>
          <div className="p-4 bg-white rounded-xl border">Partiel: {stats.partial}</div>
          <div className="p-4 bg-white rounded-xl border">Non payé: {stats.unpaid}</div>
        </div>

        <form onSubmit={addContribution} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-white rounded-xl border">
          <select
            value={form.jeune_id}
            onChange={(e) => setForm({ ...form, jeune_id: e.target.value })}
            className="p-2 border rounded"
          >
            <option value="">Choisir le jeune</option>
            {jeunes.map((j) => (
              <option key={j.id} value={j.id}>{`${j.nom} ${j.postnom} ${j.prenom}`}</option>
            ))}
          </select>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="p-2 border rounded" />
          <input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} placeholder="Montant" className="p-2 border rounded" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="p-2 border rounded">
            <option value="non payé">non payé</option>
            <option value="partiel">partiel</option>
            <option value="payé">payé</option>
          </select>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">{saving ? "En cours..." : "Ajouter"}</button>
        </form>

        <div className="bg-white rounded-xl border p-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2">Jeune</th>
                <th className="p-2">Date</th>
                <th className="p-2">Montant</th>
                <th className="p-2">Statut</th>
                <th className="p-2">Régularité</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => {
                const jeune = jeunes.find((j) => j.id === c.jeune_id);
                return (
                  <tr key={c.id} className="border-b even:bg-slate-50">
                    <td className="p-2">{jeune ? `${jeune.nom} ${jeune.prenom}` : "-"}</td>
                    <td className="p-2">{c.date}</td>
                    <td className="p-2">{c.amount || c.montant} €</td>
                    <td className="p-2">{c.status}</td>
                    <td className="p-2">{c.regul || "Mensuel"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
