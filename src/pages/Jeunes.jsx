import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";

const defaultForm = { nom: "", postnom: "", prenom: "", telephone: "", adresse: "", etat_spirituel: "", profession: "", photo_url: "" };

export default function Jeunes() {
  const [jeunes, setJeunes] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchJeunes() {
    setLoading(true);
    const { data, error } = await supabase.from("jeunes").select("*");
    setJeunes(data || []);
    setLoading(false);
    if (error) console.error(error);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      if (!active) return;
      await fetchJeunes();
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return jeunes
      .filter((j) => {
        const full = `${j.nom} ${j.postnom} ${j.prenom}`.toLowerCase();
        const q = query.toLowerCase();
        if (filter && j.etat_spirituel !== filter) return false;
        return full.includes(q);
      })
      .slice(0, 100);
  }, [jeunes, query, filter]);

  async function submit() {
    setSaving(true);
    if (!form.nom || !form.prenom) {
      alert("Nom et prénom sont requis.");
      setSaving(false);
      return;
    }

    if (editing) {
      await supabase.from("jeunes").update(form).eq("id", editing.id);
    } else {
      await supabase.from("jeunes").insert([form]);
    }
    setForm(defaultForm);
    setEditing(null);
    await fetchJeunes();
    setSaving(false);
  }

  function startEdit(item) {
    setEditing(item);
    setForm({ ...item });
  }

  async function deleteJeune(id) {
    if (!window.confirm("Supprimer ce jeune ?")) return;
    await supabase.from("jeunes").delete().eq("id", id);
    fetchJeunes();
  }

  if (loading) return <DashboardLayout><Loading message="Chargement des jeunes..." /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Gestion des jeunes</h2>
            <p className="text-sm text-slate-500">CRUD et recherche</p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="p-2 rounded border"
              placeholder="Rechercher..."
            />
            <select className="p-2 rounded border" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Tous</option>
              <option value="nouveau">Nouveau</option>
              <option value="engagé">Engagé</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>
        </div>

        <section className="grid md:grid-cols-2 gap-4 p-4 bg-white rounded-xl border shadow-sm">
          <div className="space-y-3">
            <h3 className="font-semibold">Ajouter / Modifier</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(form).map(([key, value]) => {
                if (key === "photo_url") return null;
                return (
                  <input
                    key={key}
                    value={value || ""}
                    placeholder={key}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="border p-2 rounded"
                  />
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={submit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">
                {saving ? "Enregistrement..." : editing ? "Mettre à jour" : "Ajouter"}
              </button>
              <button onClick={() => { setForm(defaultForm); setEditing(null); }} className="px-4 py-2 bg-gray-200 rounded">
                Annuler
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded">
            <p className="text-sm text-slate-500">États spirituels</p>
            <ul className="mt-2 text-sm text-slate-700">
              <li>nouveau</li>
              <li>engagé</li>
              <li>inactif</li>
            </ul>
          </div>
        </section>

        <section className="bg-white rounded-xl border shadow-sm p-3 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-2">Nom</th>
                <th className="px-2 py-2">Téléphone</th>
                <th className="px-2 py-2">État</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((jeune) => (
                <tr key={jeune.id} className="border-b hover:bg-slate-50">
                  <td className="px-2 py-2">{jeune.nom} {jeune.postnom} {jeune.prenom}</td>
                  <td className="px-2 py-2">{jeune.telephone}</td>
                  <td className="px-2 py-2">{jeune.etat_spirituel}</td>
                  <td className="px-2 py-2 space-x-1">
                    <button onClick={() => startEdit(jeune)} className="text-blue-600 hover:underline">Modifier</button>
                    <button onClick={() => deleteJeune(jeune.id)} className="text-red-600 hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </DashboardLayout>
  );
}
