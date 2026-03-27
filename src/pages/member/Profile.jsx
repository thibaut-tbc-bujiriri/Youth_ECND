import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getMemberContext, getMemberContributions, saveMemberJeune } from "../../lib/memberData";
import Loading from "../../components/Loading";
import "boxicons";

const defaultForm = {
  nom: "",
  postnom: "",
  prenom: "",
  telephone: "",
  adresse: "",
  etat_spirituel: "chrétien",
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
  return "other";
}

export default function MemberProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [publicUser, setPublicUser] = useState(null);
  const [jeune, setJeune] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const context = await getMemberContext();
      const rows = await getMemberContributions(context.jeune?.id);

      setPublicUser(context.publicUser);
      setJeune(context.jeune || null);
      setContributions(rows);
      setForm({
        ...defaultForm,
        ...(context.jeune || {}),
        status: context.jeune?.status || context.jeune?.statut || "actif",
        statut: context.jeune?.statut || context.jeune?.status || "actif",
        photo_url: context.jeune?.photo_url || "",
      });
    } catch (err) {
      console.error("[MEMBER_PROFILE] load:", err);
      setError(err.message || "Impossible de charger votre profil.");
    } finally {
      setLoading(false);
    }
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
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Formats acceptes: JPG, PNG, WEBP.");
      }
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new Error("La photo ne doit pas depasser 5 Mo.");
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const memberKey = authUser?.id || publicUser?.id || "member";
      const filePath = `profiles/${memberKey}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("jeunes-photos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("jeunes-photos").getPublicUrl(filePath);
      updateField("photo_url", data.publicUrl);

      if (jeune?.id && publicUser?.id) {
        const { data: updatedJeune, error: updateError } = await supabase
          .from("jeunes")
          .update({ photo_url: data.publicUrl })
          .eq("id", jeune.id)
          .eq("created_by", publicUser.id)
          .select("*")
          .single();

        if (updateError) throw updateError;
        setJeune(updatedJeune);
        setSuccess("Photo de profil mise a jour.");
      } else {
        setSuccess("Photo importee. Enregistrez le profil pour finaliser.");
      }
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[MEMBER_PROFILE] photo:", err);
      setError(
        err.message?.includes("Bucket not found")
          ? "Le bucket 'jeunes-photos' est introuvable. Contactez un administrateur."
          : err.message || "Import de photo impossible.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function saveProfile() {
    try {
      if (!publicUser?.id) return;
      if (!form.nom.trim() || !form.prenom.trim()) {
        setError("Nom et prenom sont requis.");
        return;
      }

      setSaving(true);
      setError("");

      const payload = {
        nom: form.nom.trim(),
        postnom: form.postnom.trim(),
        prenom: form.prenom.trim(),
        telephone: form.telephone.trim(),
        adresse: form.adresse.trim(),
        etat_spirituel: form.etat_spirituel,
        profession: form.profession.trim(),
        etat_sante: form.etat_sante.trim(),
        situation_familiale: form.situation_familiale.trim(),
        etat_civil: form.etat_civil.trim(),
        vocation: form.vocation.trim(),
        talent: form.talent.trim(),
        don: form.don.trim(),
        status: form.status,
        statut: form.statut,
        photo_url: form.photo_url || null,
      };

      const savedJeune = await saveMemberJeune(publicUser.id, payload, jeune?.id || null);
      setJeune(savedJeune);
      setForm((current) => ({ ...current, id: savedJeune.id, photo_url: savedJeune.photo_url || current.photo_url }));
      setEditing(false);
      setSuccess("Profil enregistre avec succes.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[MEMBER_PROFILE] save:", err);
      setError(err.message || "Impossible d'enregistrer le profil.");
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword() {
    try {
      if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
        setError("Le nouveau mot de passe doit avoir au moins 6 caracteres.");
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError("Les mots de passe ne correspondent pas.");
        return;
      }

      setPasswordSaving(true);
      setError("");

      const { error: passwordError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (passwordError) throw passwordError;

      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setSuccess("Mot de passe modifie.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[MEMBER_PROFILE] password:", err);
      setError(err.message || "Impossible de changer le mot de passe.");
    } finally {
      setPasswordSaving(false);
    }
  }

  const summary = useMemo(() => {
    const approvedRows = contributions.filter((item) => statusKey(item.status) === "paid");
    const total = approvedRows.reduce((sum, item) => sum + Number(item.amount ?? item.montant ?? 0), 0);
    const month = new Date().toISOString().slice(0, 7);
    const currentMonth = approvedRows
      .filter((item) => item.date?.slice(0, 7) === month)
      .reduce((sum, item) => sum + Number(item.amount ?? item.montant ?? 0), 0);
    const pendingCount = contributions.filter((item) => statusKey(item.status) === "pending").length;
    return { total, currentMonth, pendingCount };
  }, [contributions]);

  if (loading) {
    return <Loading message="Chargement du profil..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <div className="rounded-lg bg-white p-5 shadow-md sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center space-x-4 sm:space-x-6">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Profil membre" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-4xl font-bold text-white">
                {(form.prenom || publicUser?.email || "?")?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="break-all text-xl font-bold text-slate-900 sm:text-2xl">{publicUser?.email}</h2>
              <p className="text-slate-600 text-sm">{form.status || "actif"}</p>
            </div>
          </div>
          <button onClick={() => setEditing((current) => !current)} className="rounded-lg px-2 py-2 text-emerald-600 hover:text-emerald-500" title={editing ? "Fermer" : "Modifier"}>
            <box-icon name={editing ? "x-circle" : "edit"} type="solid" color="currentColor"></box-icon>
          </button>
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-slate-900">Photo de profil</p>
              <p className="text-sm text-slate-500">Formats: JPG, PNG ou WEBP (max 5 Mo).</p>
            </div>
            <label className="inline-flex cursor-pointer items-center rounded-lg bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
              {uploading ? "Import en cours..." : "Choisir une photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>

        {!editing ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 font-medium">Nom complet</p>
              <p className="text-lg text-slate-900">{[form.nom, form.postnom, form.prenom].filter(Boolean).join(" ") || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Telephone</p>
              <p className="text-lg text-slate-900">{form.telephone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Adresse</p>
              <p className="text-lg text-slate-900">{form.adresse || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Profession</p>
              <p className="text-lg text-slate-900">{form.profession || "-"}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={form.nom} onChange={(e) => updateField("nom", e.target.value)} placeholder="Nom" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.postnom} onChange={(e) => updateField("postnom", e.target.value)} placeholder="Postnom" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.prenom} onChange={(e) => updateField("prenom", e.target.value)} placeholder="Prenom" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.telephone} onChange={(e) => updateField("telephone", e.target.value)} placeholder="Telephone" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.adresse} onChange={(e) => updateField("adresse", e.target.value)} placeholder="Adresse" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.profession} onChange={(e) => updateField("profession", e.target.value)} placeholder="Profession" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.etat_sante} onChange={(e) => updateField("etat_sante", e.target.value)} placeholder="Etat de sante" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.situation_familiale} onChange={(e) => updateField("situation_familiale", e.target.value)} placeholder="Situation familiale" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.etat_civil} onChange={(e) => updateField("etat_civil", e.target.value)} placeholder="Etat civil" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.vocation} onChange={(e) => updateField("vocation", e.target.value)} placeholder="Vocation" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.talent} onChange={(e) => updateField("talent", e.target.value)} placeholder="Talent" className="rounded-lg border border-slate-300 px-4 py-3" />
            <input value={form.don} onChange={(e) => updateField("don", e.target.value)} placeholder="Don" className="rounded-lg border border-slate-300 px-4 py-3" />
            <select value={form.etat_spirituel} onChange={(e) => updateField("etat_spirituel", e.target.value)} className="rounded-lg border border-slate-300 px-4 py-3">
              <option value="chrétien">Chretien</option>
              <option value="païen">Paien</option>
              <option value="nouveau">Nouveau</option>
              <option value="engagé">Engage</option>
              <option value="inactif">Inactif</option>
            </select>
            <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="rounded-lg border border-slate-300 px-4 py-3">
              <option value="actif">Actif</option>
              <option value="en suivi">En suivi</option>
              <option value="inactif">Inactif</option>
            </select>
            <div className="md:col-span-2 flex justify-end">
              <button onClick={saveProfile} disabled={saving || uploading} className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? "Enregistrement..." : "Enregistrer le profil"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Resume des Contributions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
          <div className="rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 p-4 text-center">
            <p className="text-sm text-slate-600">Paye ce mois</p>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(summary.currentMonth)}</p>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 p-4 text-center">
            <p className="text-sm text-slate-600">Total paye</p>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(summary.total)}</p>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-center">
            <p className="text-sm text-slate-600">En attente</p>
            <p className="text-2xl font-bold text-orange-600">{summary.pendingCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6" id="settings">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Securite</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((current) => ({ ...current, newPassword: e.target.value }))} placeholder="Nouveau mot de passe" className="rounded-lg border border-slate-300 px-4 py-3" />
          <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((current) => ({ ...current, confirmPassword: e.target.value }))} placeholder="Confirmer mot de passe" className="rounded-lg border border-slate-300 px-4 py-3" />
        </div>
        <button onClick={updatePassword} disabled={passwordSaving} className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60">
          {passwordSaving ? "Mise a jour..." : "Changer le mot de passe"}
        </button>
      </div>
    </div>
  );
}
