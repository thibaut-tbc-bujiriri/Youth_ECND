import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getMemberContext } from "../../lib/memberData";
import { logAuditEvent } from "../../lib/audit";
import Loading from "../../components/Loading";
import { useConfirm } from "../../context/ConfirmContext";
import "boxicons";

const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const cvBucket = "member-cv";

export default function MemberCV() {
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [publicUserId, setPublicUserId] = useState(null);
  const [jeuneId, setJeuneId] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    loadCvRows();
  }, []);

  useEffect(() => {
    if (!publicUserId) return undefined;
    const channel = supabase
      .channel(`member-cv-${publicUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cv",
          filter: `member_user_id=eq.${publicUserId}`,
        },
        (payload) => {
          const nextRow = payload.new;
          setRows((current) => current.map((item) => (item.id === nextRow.id ? { ...item, ...nextRow } : item)));
          if (nextRow.commentaire && nextRow.commentaire !== payload.old?.commentaire) {
            setSuccess("Nouveau commentaire de l'administrateur recu sur votre CV.");
            setTimeout(() => setSuccess(""), 3200);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicUserId]);

  async function loadCvRows() {
    try {
      setLoading(true);
      setError("");
      const context = await getMemberContext();
      const memberId = context.publicUser?.id || null;
      const youngId = context.jeune?.id || null;
      setPublicUserId(memberId);
      setJeuneId(youngId);

      if (!memberId) {
        setRows([]);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("cv")
        .select("*")
        .eq("member_user_id", memberId)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;
      setRows(data || []);
    } catch (err) {
      console.error("[MEMBER_CV] load:", err);
      setError(err.message || "Impossible de charger vos CV.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadCv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!publicUserId) {
        setError("Profil membre introuvable.");
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setError("Formats acceptes: PDF, DOC, DOCX.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Le CV ne doit pas depasser 10 Mo.");
        return;
      }

      setUploading(true);
      setError("");

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const safeName = file.name.replace(/\s+/g, "_");
      const ownerKey = authUser?.id || "member";
      const filePath = `${ownerKey}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from(cvBucket).upload(filePath, file, {
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(cvBucket).getPublicUrl(filePath);
      const payload = {
        member_user_id: publicUserId,
        jeune_id: jeuneId,
        file_name: file.name,
        file_path: filePath,
        file_url: publicUrlData.publicUrl,
        mime_type: file.type,
        size_bytes: file.size,
        status: "soumis",
      };

      const { error: insertError } = await supabase.from("cv").insert([payload]);
      if (insertError) throw insertError;

      await logAuditEvent({
        action: "CV_UPLOAD",
        entity: "cv",
        details: { file_name: file.name },
      });

      setSuccess("CV televerse avec succes.");
      setTimeout(() => setSuccess(""), 2500);
      await loadCvRows();
    } catch (err) {
      console.error("[MEMBER_CV] upload:", err);
      setError(
        err.message?.includes("Bucket not found")
          ? "Le bucket 'member-cv' est introuvable. Executez le script sql/member_cv_bucket.sql puis reessayez."
          : err.message || "Impossible de televerser le CV.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function deleteCv(id) {
    const approved = await confirm({
      title: "Supprimer le CV",
      message: "Voulez-vous vraiment supprimer ce CV ?",
      confirmText: "Supprimer",
      tone: "danger",
    });
    if (!approved) return;
    try {
      const { error: deleteError } = await supabase.from("cv").delete().eq("id", id).eq("member_user_id", publicUserId);
      if (deleteError) throw deleteError;

      await logAuditEvent({
        action: "CV_DELETE",
        entity: "cv",
        entityId: id,
      });

      setRows((current) => current.filter((item) => item.id !== id));
      setSuccess("CV supprime.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("[MEMBER_CV] delete:", err);
      setError(err.message || "Suppression impossible.");
    }
  }

  if (loading) return <Loading message="Chargement des CV..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mon CV</h1>
          <p className="mt-1 text-sm text-slate-600">Televersez votre CV (PDF, DOC, DOCX).</p>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg px-2 py-2 text-emerald-600 transition hover:text-emerald-500" title="Televerser un CV">
          {uploading ? "Televersement..." : "Televerser un CV"}
          <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={uploadCv} />
        </label>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-500">Aucun CV enregistre.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px]">
              <thead className="bg-slate-100 text-left text-sm text-slate-600">
                <tr>
                  <th className="px-5 py-4 font-semibold">Nom du fichier</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Format</th>
                  <th className="px-5 py-4 font-semibold">Taille</th>
                  <th className="px-5 py-4 font-semibold">Statut</th>
                  <th className="px-5 py-4 font-semibold">Commentaire admin</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 text-sm text-slate-700">
                    <td className="px-5 py-4 font-medium text-slate-900">{item.file_name || "-"}</td>
                    <td className="px-5 py-4">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    <td className="px-5 py-4">{item.mime_type || "-"}</td>
                    <td className="px-5 py-4">{item.size_bytes ? `${Math.round(item.size_bytes / 1024)} Ko` : "-"}</td>
                    <td className="px-5 py-4">{item.status || "soumis"}</td>
                    <td className="px-5 py-4">
                      {item.commentaire ? (
                        <p className="max-w-[320px] break-words rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                          {item.commentaire}
                        </p>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg px-1 py-1 text-slate-600 hover:text-slate-400"
                          title="Ouvrir"
                        >
                          <box-icon name="file-find" type="solid" color="currentColor" size="sm"></box-icon>
                        </a>
                        <button
                          onClick={() => deleteCv(item.id)}
                          className="rounded-lg px-1 py-1 text-red-500 hover:text-red-400"
                          title="Supprimer"
                        >
                          <box-icon name="trash" type="solid" color="currentColor" size="sm"></box-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
