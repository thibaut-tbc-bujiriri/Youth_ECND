import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Loading from "../../components/Loading";
import { logAuditEvent } from "../../lib/audit";
import "boxicons";

function fullName(jeune) {
  return [jeune?.nom, jeune?.postnom, jeune?.prenom].filter(Boolean).join(" ");
}

export default function AdminCV() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [savingCommentId, setSavingCommentId] = useState("");
  const [usersMap, setUsersMap] = useState({});
  const [jeunesMap, setJeunesMap] = useState({});
  const [commentModal, setCommentModal] = useState({
    open: false,
    cvId: "",
    text: "",
    mode: "envoyer",
  });

  useEffect(() => {
    loadCv();
  }, []);

  async function loadCv() {
    try {
      setLoading(true);
      setError("");
      const { data: cvRows, error: cvError } = await supabase.from("cv").select("*").order("created_at", { ascending: false });
      if (cvError) throw cvError;

      const memberIds = [...new Set((cvRows || []).map((item) => item.member_user_id).filter(Boolean))];
      const jeuneIds = [...new Set((cvRows || []).map((item) => item.jeune_id).filter(Boolean))];

      const [{ data: usersRows, error: usersError }, { data: jeunesRows, error: jeunesError }] = await Promise.all([
        memberIds.length ? supabase.from("users").select("id, email").in("id", memberIds) : Promise.resolve({ data: [] }),
        jeuneIds.length ? supabase.from("jeunes").select("id, nom, postnom, prenom").in("id", jeuneIds) : Promise.resolve({ data: [] }),
      ]);
      if (usersError) throw usersError;
      if (jeunesError) throw jeunesError;

      const nextUsersMap = {};
      (usersRows || []).forEach((item) => {
        nextUsersMap[item.id] = item;
      });
      const nextJeunesMap = {};
      (jeunesRows || []).forEach((item) => {
        nextJeunesMap[item.id] = item;
      });

      setUsersMap(nextUsersMap);
      setJeunesMap(nextJeunesMap);
      setRows(cvRows || []);
    } catch (err) {
      console.error("[ADMIN_CV] load:", err);
      setError(err.message || "Impossible de charger les CV.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => {
      const user = usersMap[item.member_user_id];
      const jeune = jeunesMap[item.jeune_id];
      const hay = [
        item.file_name,
        item.status,
        item.mime_type,
        user?.email,
        fullName(jeune),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, usersMap, jeunesMap]);

  function openCommentModal(item) {
    const hasComment = Boolean(item.commentaire?.trim());
    setCommentModal({
      open: true,
      cvId: item.id,
      text: item.commentaire || "",
      mode: hasComment ? "modifier" : "envoyer",
    });
  }

  function closeCommentModal() {
    setCommentModal({ open: false, cvId: "", text: "", mode: "envoyer" });
  }

  async function saveComment() {
    try {
      const cvId = commentModal.cvId;
      if (!cvId) return;
      setSavingCommentId(cvId);
      const commentaire = (commentModal.text || "").trim();
      const { error: updateError } = await supabase
        .from("cv")
        .update({ commentaire, status: commentaire ? "valide" : "soumis" })
        .eq("id", cvId);
      if (updateError) throw updateError;
      await logAuditEvent({
        action: "UPDATE_CV_COMMENT",
        entity: "cv",
        entity_id: cvId,
      });
      setRows((current) =>
        current.map((item) =>
          item.id === cvId ? { ...item, commentaire, status: commentaire ? "valide" : item.status } : item,
        ),
      );
      closeCommentModal();
    } catch (err) {
      setError(err.message || "Impossible d'enregistrer le commentaire.");
    } finally {
      setSavingCommentId("");
    }
  }

  if (loading) return <Loading message="Chargement des CV..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">CV des membres</h1>
          <p className="mt-2 text-slate-600">Consulte tous les CV deja televerses par les membres.</p>
        </div>
        <button
          onClick={loadCv}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          title="Rafraichir"
        >
          <box-icon name="refresh" type="solid" color="currentColor" size="sm"></box-icon>
          Rafraichir
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher par email, membre, fichier..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredRows.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-500">Aucun CV trouve.</div>
        ) : (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {filteredRows.map((item) => {
                const user = usersMap[item.member_user_id];
                const jeune = jeunesMap[item.jeune_id];
                const hasComment = Boolean(item.commentaire?.trim());
                return (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="break-all text-sm font-semibold text-slate-900">{item.file_name || "-"}</p>
                    <p className="mt-1 text-xs text-slate-600">{user?.email || "-"}</p>
                    <p className="mt-1 text-xs text-slate-600">{fullName(jeune) || "-"}</p>
                    <p className="mt-2 text-xs text-slate-600">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("fr-FR") : "-"} - {item.status || "soumis"}
                    </p>
                    <p className="mt-2 text-xs text-slate-700">
                      Commentaire: <span className="font-medium">{item.commentaire || "-"}</span>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openCommentModal(item)}
                        disabled={savingCommentId === item.id}
                        className="p-1 text-emerald-600 transition hover:text-emerald-500 disabled:opacity-50"
                        title={hasComment ? "Modifier commentaire" : "Envoyer commentaire"}
                      >
                        {savingCommentId === item.id ? (
                          "..."
                        ) : (
                          <box-icon
                            name={hasComment ? "edit-alt" : "send"}
                            type="solid"
                            color="currentColor"
                            size="sm"
                          ></box-icon>
                        )}
                      </button>
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg px-1 py-1 text-emerald-600 hover:text-emerald-500"
                        title="Ouvrir CV"
                      >
                        <box-icon name="file-find" type="solid" color="currentColor" size="sm"></box-icon>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px] table-auto">
                <thead className="bg-slate-100 text-left text-sm text-slate-600">
                  <tr>
                    <th className="px-4 py-4 font-semibold">Membre</th>
                    <th className="px-4 py-4 font-semibold">Jeune</th>
                    <th className="px-4 py-4 font-semibold">Fichier</th>
                    <th className="px-4 py-4 font-semibold">Type</th>
                    <th className="px-4 py-4 font-semibold">Date</th>
                    <th className="px-4 py-4 font-semibold">Statut</th>
                    <th className="px-4 py-4 font-semibold">Commentaire admin</th>
                    <th className="px-4 py-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((item) => {
                    const user = usersMap[item.member_user_id];
                    const jeune = jeunesMap[item.jeune_id];
                    const hasComment = Boolean(item.commentaire?.trim());
                    return (
                      <tr key={item.id} className="border-t border-slate-100 text-sm text-slate-700">
                        <td className="px-4 py-4 max-w-[220px] break-all">{user?.email || "-"}</td>
                        <td className="px-4 py-4 max-w-[180px] break-words">{fullName(jeune) || "-"}</td>
                        <td className="px-4 py-4 max-w-[220px] break-all font-medium text-slate-900">{item.file_name || "-"}</td>
                        <td className="px-4 py-4">{item.mime_type || "-"}</td>
                        <td className="px-4 py-4 whitespace-nowrap">{item.created_at ? new Date(item.created_at).toLocaleDateString("fr-FR") : "-"}</td>
                        <td className="px-4 py-4">{item.status || "soumis"}</td>
                        <td className="px-4 py-4 max-w-[280px] break-words">{item.commentaire || "-"}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            onClick={() => openCommentModal(item)}
                            disabled={savingCommentId === item.id}
                            className="p-1 text-emerald-600 transition hover:text-emerald-500 disabled:opacity-50"
                            title={hasComment ? "Modifier commentaire" : "Envoyer commentaire"}
                          >
                            {savingCommentId === item.id ? (
                              "..."
                            ) : (
                              <box-icon
                                name={hasComment ? "edit-alt" : "send"}
                                type="solid"
                                color="currentColor"
                                size="sm"
                              ></box-icon>
                            )}
                          </button>
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg p-1 text-emerald-600 hover:text-emerald-500"
                            title="Ouvrir CV"
                          >
                            <box-icon name="file-find" type="solid" color="currentColor" size="sm"></box-icon>
                          </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {commentModal.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {commentModal.mode === "modifier" ? "Modifier le commentaire" : "Envoyer un commentaire"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">Ecris un message clair pour le membre.</p>
            <textarea
              value={commentModal.text}
              onChange={(event) =>
                setCommentModal((current) => ({ ...current, text: event.target.value }))
              }
              placeholder="Commentaire admin..."
              rows={5}
              className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCommentModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveComment}
                disabled={savingCommentId === commentModal.cvId}
                className="p-2 text-emerald-600 transition hover:text-emerald-500 disabled:opacity-50"
                title="Envoyer commentaire"
              >
                {savingCommentId === commentModal.cvId ? (
                  "..."
                ) : (
                  <box-icon name="send" type="solid" color="currentColor" size="sm"></box-icon>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
