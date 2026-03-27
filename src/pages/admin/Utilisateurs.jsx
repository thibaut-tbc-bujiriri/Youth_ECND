import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Loading from "../../components/Loading";
import { printTableReport } from "../../lib/printUtils";
import { useConfirm } from "../../context/ConfirmContext";
import "boxicons";

function roleFromUserRow(userRow) {
  return userRow.user_roles?.[0]?.roles?.name ?? "sans-role";
}

export default function AdminUtilisateurs() {
  const { confirm } = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    role: "membre",
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("users")
        .select(`
          id,
          auth_id,
          email,
          created_at,
          user_roles (
            role_id,
            roles ( name )
          )
        `)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      const normalizedUsers = (data || []).map((u) => ({
        ...u,
        role: roleFromUserRow(u),
      }));

      setUsers(normalizedUsers);
    } catch (err) {
      console.error("[ADMIN_USERS] fetchUsers error:", err);
      setError(err.message || "Erreur de chargement des utilisateurs.");
    } finally {
      setLoading(false);
    }
  }

  async function getRoleIdByName(roleName) {
    const { data: roleRow, error: roleError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", roleName)
      .single();

    if (roleError || !roleRow?.id) {
      throw new Error(`Le rôle '${roleName}' est introuvable.`);
    }

    return roleRow.id;
  }

  function openAddModal() {
    window.open("/register", "_blank");
    setSuccess("Inscription ouverte dans un nouvel onglet. Revenez ici pour attribuer le role.");
    setTimeout(() => setSuccess(null), 3500);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setFormData({ email: user.email, role: user.role === "sans-role" ? "membre" : user.role });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ email: "", role: "membre" });
  }

  async function handleSaveUser() {
    try {
      setError(null);

      if (!formData.email) {
        setError("L'email est requis.");
        return;
      }

      if (!editingUser) {
        setError("Création directe désactivée: créez d'abord le compte via l'inscription.");
        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ email: formData.email })
        .eq("id", editingUser.id);

      if (updateError) throw updateError;

      if (formData.role !== editingUser.role) {
        await handleRoleChange(editingUser.id, formData.role, false);
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, email: formData.email } : u)),
        );
      }

      setSuccess("Utilisateur modifié avec succès.");
      closeModal();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[ADMIN_USERS] handleSaveUser error:", err);
      setError(err.message || "Une erreur est survenue.");
    }
  }

  async function handleDeleteUser(userId) {
    const approved = await confirm({
      title: "Supprimer l'utilisateur",
      message: "Etes-vous sur de vouloir supprimer cet utilisateur ?",
      confirmText: "Supprimer",
      tone: "danger",
    });
    if (!approved) return;

    try {
      setError(null);

      const { error: deleteMappingsError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteMappingsError) throw deleteMappingsError;

      const { error: deleteUserError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (deleteUserError) throw deleteUserError;

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccess("Utilisateur supprimé avec succès.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[ADMIN_USERS] handleDeleteUser error:", err);
      setError(err.message || "Erreur lors de la suppression.");
    }
  }

  async function handleRoleChange(userId, newRole, showToast = true) {
    try {
      setError(null);
      const roleId = await getRoleIdByName(newRole);

      const { error: clearRoleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (clearRoleError) throw clearRoleError;

      const { error: mapError } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role_id: roleId }]);

      if (mapError) throw mapError;

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));

      if (showToast) {
        setSuccess("Rôle modifié avec succès.");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error("[ADMIN_USERS] handleRoleChange error:", err);
      setError(err.message || "Erreur lors du changement de rôle.");
      throw err;
    }
  }

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const email = user.email?.toLowerCase() || "";
        const role = user.role?.toLowerCase() || "";
        const query = searchTerm.toLowerCase();
        return email.includes(query) || role.includes(query);
      }),
    [searchTerm, users],
  );

  function handlePrintUsers() {
    printTableReport({
      title: "Etat de sortie - Utilisateurs",
      subtitle: "Liste des utilisateurs (filtres appliques)",
      columns: [
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
        { key: "created_at", label: "Date inscription" },
      ],
      rows: filteredUsers.map((user) => ({
        email: user.email || "-",
        role: user.role || "-",
        created_at: user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "-",
      })),
      summary: [
        { label: "Total", value: filteredUsers.length },
        { label: "Admins", value: filteredUsers.filter((u) => u.role === "admin").length },
        { label: "Membres", value: filteredUsers.filter((u) => u.role === "membre").length },
      ],
    });
  }

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen p-3 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 flex items-center gap-3">
              <box-icon name="user-check" type="solid"></box-icon>
              Gestion des Utilisateurs
            </h1>
            <p className="text-gray-600 mt-2">Gérez les accès et les rôles des utilisateurs</p>
          </div>
          <button
            onClick={openAddModal}
            className="w-full sm:w-auto px-2 py-2 text-emerald-600 transition hover:text-emerald-500"
            title="Creer via inscription"
          >
            <box-icon name="user-plus" type="solid" color="currentColor"></box-icon>
          </button>
        </div>
        <div className="mb-6">
          <button
            onClick={handlePrintUsers}
            className="w-full sm:w-auto px-2 py-2 text-slate-600 transition hover:text-slate-400"
            title="Imprimer la liste des utilisateurs"
          >
            <box-icon name="printer" type="solid" color="currentColor"></box-icon>
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <div className="flex items-center gap-2">
              <box-icon name="error" type="solid"></box-icon>
              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
            <div className="flex items-center gap-2">
              <box-icon name="check-circle" type="solid"></box-icon>
              <p>{success}</p>
            </div>
          </div>
        )}

        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Rechercher par email ou rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <box-icon name="search" class="absolute left-3 top-3.5"></box-icon>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <box-icon name="inbox" type="solid" size="lg" class="mx-auto mb-4 text-gray-400"></box-icon>
              <p className="text-gray-500 text-lg">Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 p-3 md:hidden">
                {filteredUsers.map((user) => (
                  <article key={user.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="break-all text-sm font-semibold text-slate-800">{user.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Inscrit le {user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "-"}
                    </p>
                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Rôle
                      </label>
                      <select
                        value={user.role === "sans-role" ? "membre" : user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg font-semibold text-white cursor-pointer ${
                          user.role === "admin" ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        <option value="membre">Membre</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="px-1 py-1 text-emerald-600 transition hover:text-emerald-500 flex items-center justify-center"
                        title="Modifier"
                      >
                        <box-icon name="edit" type="solid" color="currentColor" size="sm"></box-icon>
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-1 py-1 text-red-500 transition hover:text-red-400 flex items-center justify-center"
                        title="Supprimer"
                      >
                        <box-icon name="trash" type="solid" color="currentColor" size="sm"></box-icon>
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold">Email</th>
                      <th className="px-6 py-4 text-left font-semibold">Rôle</th>
                      <th className="px-6 py-4 text-left font-semibold">Date d'inscription</th>
                      <th className="px-6 py-4 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-blue-50 transition">
                        <td className="px-6 py-4 text-gray-800 font-medium break-all">{user.email}</td>
                        <td className="px-6 py-4">
                          <select
                            value={user.role === "sans-role" ? "membre" : user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className={`px-3 py-2 rounded-lg font-semibold text-white cursor-pointer ${
                              user.role === "admin" ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            <option value="membre">Membre</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "-"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => openEditModal(user)}
                              className="px-1 py-1 text-emerald-600 transition hover:text-emerald-500"
                              title="Modifier"
                            >
                              <box-icon name="edit" type="solid" color="currentColor"></box-icon>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="px-1 py-1 text-red-500 transition hover:text-red-400"
                              title="Supprimer"
                            >
                              <box-icon name="trash" type="solid" color="currentColor"></box-icon>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Utilisateurs</p>
                <p className="text-3xl font-bold text-emerald-700">{filteredUsers.length}</p>
              </div>
              <box-icon name="user-circle" type="solid" size="lg" class="text-emerald-400"></box-icon>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Administrateurs</p>
                <p className="text-3xl font-bold text-red-600">
                  {filteredUsers.filter((u) => u.role === "admin").length}
                </p>
              </div>
              <box-icon name="shield-check" type="solid" size="lg" class="text-red-400"></box-icon>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Membres</p>
                <p className="text-3xl font-bold text-emerald-700">
                  {filteredUsers.filter((u) => u.role === "membre").length}
                </p>
              </div>
              <box-icon name="group" type="solid" size="lg" class="text-emerald-400"></box-icon>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <box-icon name={editingUser ? "edit" : "user-plus"} type="solid"></box-icon>
                {editingUser ? "Modifier l'Utilisateur" : "Ajouter un Utilisateur"}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <box-icon name="envelope" type="solid"></box-icon> Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="utilisateur@example.com"
                  disabled={!!editingUser}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <box-icon name="shield-check" type="solid"></box-icon> Rôle
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="membre">Membre</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>

            {!editingUser && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mt-4">
                Créez d'abord le compte via l'inscription, puis revenez ici pour attribuer le rôle.
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition flex items-center justify-center gap-2"
              >
                <box-icon name="x" type="solid"></box-icon>
                Annuler
              </button>
              <button
                onClick={handleSaveUser}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition flex items-center justify-center gap-2"
              >
                <box-icon name="check" type="solid"></box-icon>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
