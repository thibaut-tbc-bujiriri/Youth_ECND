import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Loading from "../../components/Loading";
import { printTableReport } from "../../lib/printUtils";

const defaultForm = {
  nom: "",
  postnom: "",
  prenom: "",
  telephone: "",
  adresse: "",
  etat_spirituel: "nouveau",
  profession: "",
  etat_sante: "",
  situation_familiale: "",
  etat_civil: "",
  vocation: "",
  talent: "",
  don: "",
  status: "actif",
  statut: "actif",
  photo_url: "",
};

const spiritualOptions = ["nouveau", "chrétien", "païen", "engagé", "inactif"];
const activityOptions = ["actif", "inactif", "en suivi"];
const civilOptions = ["célibataire", "marié(e)", "fiancé(e)", "veuf(ve)", "autre"];

function formatFullName(jeune) {
  return [jeune.nom, jeune.postnom, jeune.prenom].filter(Boolean).join(" ");
}

export default function AdminJeunes() {
  const [jeunes, setJeunes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [spiritualFilter, setSpiritualFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingJeune, setEditingJeune] = useState(null);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    fetchJeunes();
  }, []);

  async function fetchJeunes() {
    try {
      setLoading(true);
      setError("");
      const { data, error: queryError } = await supabase
        .from("jeunes")
        .select("*")
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;
      setJeunes(data || []);
    } catch (err) {
      console.error("[ADMIN_JEUNES] fetchJeunes:", err);
      setError(err.message || "Impossible de charger les jeunes.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingJeune(null);
    setForm(defaultForm);
    setShowModal(true);
    setError("");
  }

  function openEditModal(jeune) {
    setEditingJeune(jeune);
    setForm({
      ...defaultForm,
      ...jeune,
      status: jeune.status || jeune.statut || "actif",
      statut: jeune.statut || jeune.status || "actif",
    });
    setShowModal(true);
    setError("");
  }

  function closeModal() {
    setEditingJeune(null);
    setForm(defaultForm);
    setShowModal(false);
  }

  function updateField(key, value) {
    setForm((current) => {
      if (key === "status" || key === "statut") {
        return { ...current, status: value, statut: value };
      }
      return { ...current, [key]: value };
    });
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `profiles/jeune-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("jeunes-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("jeunes-photos").getPublicUrl(filePath);
      updateField("photo_url", data.publicUrl);
      setSuccess("Photo importée avec succès.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_JEUNES] upload:", err);
      setError(
        err.message?.includes("Bucket not found")
          ? "Le bucket 'jeunes-photos' est introuvable. Exécute le script SQL du bucket."
          : err.message || "Impossible d'importer la photo.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSave() {
    try {
      if (!form.nom.trim() || !form.prenom.trim()) {
        setError("Le nom et le prénom sont requis.");
        return;
      }

      setSaving(true);
      setError("");

      const payload = {
        ...form,
        nom: form.nom.trim(),
        postnom: form.postnom.trim(),
        prenom: form.prenom.trim(),
        telephone: form.telephone.trim(),
        adresse: form.adresse.trim(),
        profession: form.profession.trim(),
        etat_sante: form.etat_sante.trim(),
        situation_familiale: form.situation_familiale.trim(),
        etat_civil: form.etat_civil.trim(),
        vocation: form.vocation.trim(),
        talent: form.talent.trim(),
        don: form.don.trim(),
      };

      if (editingJeune) {
        const { error: updateError } = await supabase
          .from("jeunes")
          .update(payload)
          .eq("id", editingJeune.id);
        if (updateError) throw updateError;
        setSuccess("Fiche jeune mise à jour.");
      } else {
        const { error: insertError } = await supabase.from("jeunes").insert([payload]);
        if (insertError) throw insertError;
        setSuccess("Jeune ajouté avec succès.");
      }

      closeModal();
      await fetchJeunes();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_JEUNES] save:", err);
      setError(err.message || "Impossible d'enregistrer cette fiche.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Supprimer cette fiche jeune ?")) return;

    try {
      setError("");
      const { error: deleteError } = await supabase.from("jeunes").delete().eq("id", id);
      if (deleteError) throw deleteError;
      setJeunes((current) => current.filter((item) => item.id !== id));
      setSuccess("Jeune supprimé.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[ADMIN_JEUNES] delete:", err);
      setError(err.message || "Impossible de supprimer ce jeune.");
    }
  }

  const filteredJeunes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jeunes.filter((jeune) => {
      const haystack = [
        jeune.nom,
        jeune.postnom,
        jeune.prenom,
        jeune.telephone,
        jeune.profession,
        jeune.vocation,
        jeune.talent,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const currentStatus = jeune.status || jeune.statut || "";
      const matchesSearch = !query || haystack.includes(query);
      const matchesStatus = !statusFilter || currentStatus === statusFilter;
      const matchesSpiritual = !spiritualFilter || jeune.etat_spirituel === spiritualFilter;

      return matchesSearch && matchesStatus && matchesSpiritual;
    });
  }, [jeunes, search, statusFilter, spiritualFilter]);

  const stats = useMemo(() => {
    const total = jeunes.length;
    const actifs = jeunes.filter((item) => (item.status || item.statut) === "actif").length;
    const enSuivi = jeunes.filter((item) => (item.status || item.statut) === "en suivi").length;
    const avecPhoto = jeunes.filter((item) => item.photo_url).length;
    return { total, actifs, enSuivi, avecPhoto };
  }, [jeunes]);

  function handlePrintJeunes() {
    printTableReport({
      title: "Etat de sortie - Liste des jeunes",
      subtitle: "Jeunes affiches (filtres appliques)",
      columns: [
        { key: "nom_complet", label: "Nom complet" },
        { key: "telephone", label: "Telephone" },
        { key: "adresse", label: "Adresse" },
        { key: "etat_spirituel", label: "Etat spirituel" },
        { key: "profession", label: "Profession" },
        { key: "status", label: "Statut" },
      ],
      rows: filteredJeunes.map((jeune) => ({
        nom_complet: formatFullName(jeune) || "-",
        telephone: jeune.telephone || "-",
        adresse: jeune.adresse || "-",
        etat_spirituel: jeune.etat_spirituel || "-",
        profession: jeune.profession || "-",
        status: jeune.status || jeune.statut || "-",
      })),
      summary: [
        { label: "Total", value: filteredJeunes.length },
        { label: "Actifs", value: filteredJeunes.filter((j) => (j.status || j.statut) === "actif").length },
        { label: "En suivi", value: filteredJeunes.filter((j) => (j.status || j.statut) === "en suivi").length },
      ],
    });
  }

  if (loading) return <Loading message="Chargement des jeunes..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Gestion des Jeunes</h1>
          <p className="mt-2 text-slate-600">
            Fiches d'identification complètes, suivi spirituel et informations utiles pour l'église.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={handlePrintJeunes}
            className="w-full rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
          >
            Imprimer la liste
          </button>
          <button
            onClick={openCreateModal}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
          >
            + Ajouter un jeune
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total jeunes</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm text-emerald-700">Jeunes actifs</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{stats.actifs}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-amber-700">En suivi</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">{stats.enSuivi}</p>
        </article>
        <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
          <p className="text-sm text-cyan-700">Avec photo</p>
          <p className="mt-2 text-3xl font-bold text-cyan-900">{stats.avecPhoto}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher nom, téléphone, profession..."
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          >
            <option value="">Tous les statuts</option>
            {activityOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select
            value={spiritualFilter}
            onChange={(event) => setSpiritualFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          >
            <option value="">Tous les états spirituels</option>
            {spiritualOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setSpiritualFilter("");
            }}
            className="rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredJeunes.length === 0 && (
          <div className="px-5 py-10 text-center text-slate-500">
            Aucun jeune trouve avec les filtres actuels.
          </div>
        )}
        {filteredJeunes.length > 0 && (
          <div className="grid gap-3 p-3 md:hidden">
            {filteredJeunes.map((jeune) => (
              <article key={jeune.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  {jeune.photo_url ? (
                    <img
                      src={jeune.photo_url}
                      alt={formatFullName(jeune)}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {jeune.prenom?.[0] || jeune.nom?.[0] || "J"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{formatFullName(jeune)}</p>
                    <p className="truncate text-xs text-slate-500">{jeune.vocation || "Vocation non renseignee"}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                  <p><span className="font-medium">Telephone:</span> {jeune.telephone || "-"}</p>
                  <p><span className="font-medium">Etat spirituel:</span> {jeune.etat_spirituel || "-"}</p>
                  <p><span className="font-medium">Profession:</span> {jeune.profession || "-"}</p>
                  <p><span className="font-medium">Statut:</span> {jeune.status || jeune.statut || "-"}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEditModal(jeune)}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(jeune.id)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[900px] w-full">
            <thead className="bg-slate-100 text-left text-sm text-slate-600">
              <tr>
                <th className="px-5 py-4 font-semibold">Jeune</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">État spirituel</th>
                <th className="px-5 py-4 font-semibold">Profession</th>
                <th className="px-5 py-4 font-semibold">Statut</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJeunes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">
                    Aucun jeune trouvé avec les filtres actuels.
                  </td>
                </tr>
              ) : (
                filteredJeunes.map((jeune) => (
                  <tr key={jeune.id} className="border-t border-slate-100 text-sm text-slate-700">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {jeune.photo_url ? (
                          <img
                            src={jeune.photo_url}
                            alt={formatFullName(jeune)}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            {jeune.prenom?.[0] || jeune.nom?.[0] || "J"}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{formatFullName(jeune)}</p>
                          <p className="text-xs text-slate-500">{jeune.vocation || "Vocation non renseignée"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p>{jeune.telephone || "-"}</p>
                      <p className="text-xs text-slate-500">{jeune.adresse || "Adresse non renseignée"}</p>
                    </td>
                    <td className="px-5 py-4">{jeune.etat_spirituel || "-"}</td>
                    <td className="px-5 py-4">{jeune.profession || "-"}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {jeune.status || jeune.statut || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(jeune)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(jeune.id)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingJeune ? "Modifier la fiche jeune" : "Nouvelle fiche jeune"}
                </h2>
                <p className="text-sm text-slate-500">
                  Tous les champs utiles à la fiche d'identification de l'église sont disponibles.
                </p>
              </div>
              <button onClick={closeModal} className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
                Fermer
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Nom</span>
                  <input value={form.nom} onChange={(e) => updateField("nom", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Post-nom</span>
                  <input value={form.postnom} onChange={(e) => updateField("postnom", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Prénom</span>
                  <input value={form.prenom} onChange={(e) => updateField("prenom", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Téléphone</span>
                  <input value={form.telephone} onChange={(e) => updateField("telephone", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Adresse physique</span>
                  <input value={form.adresse} onChange={(e) => updateField("adresse", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Profession</span>
                  <input value={form.profession} onChange={(e) => updateField("profession", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">État de santé</span>
                  <input value={form.etat_sante} onChange={(e) => updateField("etat_sante", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Situation familiale</span>
                  <input value={form.situation_familiale} onChange={(e) => updateField("situation_familiale", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">État civil</span>
                  <select value={form.etat_civil} onChange={(e) => updateField("etat_civil", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="">Sélectionner</option>
                    {civilOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">État spirituel</span>
                  <select value={form.etat_spirituel} onChange={(e) => updateField("etat_spirituel", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    {spiritualOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Statut de suivi</span>
                  <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                    {activityOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Vocation</span>
                  <input value={form.vocation} onChange={(e) => updateField("vocation", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Talent</span>
                  <input value={form.talent} onChange={(e) => updateField("talent", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Don</span>
                  <input value={form.don} onChange={(e) => updateField("don", e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Photo de profil</p>
                    <p className="text-sm text-slate-500">Importe une photo dans le bucket Supabase `jeunes-photos`.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
                    {uploading ? "Import en cours..." : "Choisir une photo"}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>

                {form.photo_url && (
                  <div className="mt-4 flex items-center gap-4">
                    <img src={form.photo_url} alt="Aperçu" className="h-20 w-20 rounded-2xl object-cover" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Photo actuelle</p>
                      <a href={form.photo_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                        Ouvrir l'image
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button onClick={closeModal} className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving || uploading} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Enregistrement..." : editingJeune ? "Mettre à jour" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
