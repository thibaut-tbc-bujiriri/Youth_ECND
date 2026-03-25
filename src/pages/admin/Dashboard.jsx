import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import Loading from "../../components/Loading";
import "boxicons";

function currency(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

const quickLinks = [
  {
    title: "Gerer les Utilisateurs",
    description: "Voir tous les utilisateurs et leurs roles",
    path: "/admin/utilisateurs",
    icon: "user-check",
  },
  {
    title: "Gerer les Jeunes",
    description: "Ajouter, modifier, supprimer des jeunes",
    path: "/admin/jeunes",
    icon: "group",
  },
  {
    title: "Contributions",
    description: "Suivre les contributions des jeunes",
    path: "/admin/contributions",
    icon: "money",
  },
  {
    title: "Activites",
    description: "Programmer et gerer les activites",
    path: "/admin/activites",
    icon: "calendar-event",
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalJeunes: 0,
    activesJeunes: 0,
    totalContributions: 0,
    totalUtilisateurs: 0,
    totalActivites: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);

      const [
        { data: jeunesData },
        { data: contributionsData },
        { data: usersData },
        { data: activitiesData, error: activitiesError },
      ] = await Promise.all([
        supabase.from("jeunes").select("*", { count: "exact" }),
        supabase.from("contributions").select("*", { count: "exact" }),
        supabase.from("users").select("*", { count: "exact" }),
        supabase.from("activities").select("*", { count: "exact" }),
      ]);

      setStats({
        totalJeunes: jeunesData?.length || 0,
        activesJeunes: jeunesData?.filter((item) => (item.status || item.statut) === "actif").length || 0,
        totalContributions:
          contributionsData?.reduce((sum, item) => sum + Number(item.amount ?? item.montant ?? 0), 0) || 0,
        totalUtilisateurs: usersData?.length || 0,
        totalActivites: activitiesError ? 0 : activitiesData?.length || 0,
      });
    } catch (err) {
      console.error("Erreur lors du chargement des stats:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border-l-4 border-blue-500 bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Jeunes</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalJeunes}</p>
              <p className="mt-2 text-xs text-slate-500">Membres actifs: {stats.activesJeunes}</p>
            </div>
            <box-icon name="group" type="solid" size="lg" class="text-blue-400"></box-icon>
          </div>
        </div>

        <div className="rounded-2xl border-l-4 border-green-500 bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Contributions</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{currency(stats.totalContributions)}</p>
              <p className="mt-2 text-xs text-slate-500">Total collecte</p>
            </div>
            <box-icon name="money" type="solid" size="lg" class="text-green-400"></box-icon>
          </div>
        </div>

        <div className="rounded-2xl border-l-4 border-purple-500 bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Utilisateurs</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalUtilisateurs}</p>
              <p className="mt-2 text-xs text-slate-500">Admins + Membres</p>
            </div>
            <box-icon name="user-circle" type="solid" size="lg" class="text-purple-400"></box-icon>
          </div>
        </div>

        <div className="rounded-2xl border-l-4 border-orange-500 bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Activites</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalActivites}</p>
              <p className="mt-2 text-xs text-slate-500">Evenements enregistres</p>
            </div>
            <box-icon name="calendar-event" type="solid" size="lg" class="text-orange-400"></box-icon>
          </div>
        </div>

        <div className="rounded-2xl border-l-4 border-cyan-500 bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Taux d'activite</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.totalJeunes > 0 ? Math.round((stats.activesJeunes / stats.totalJeunes) * 100) : 0}%
              </p>
              <p className="mt-2 text-xs text-slate-500">Jeunes suivis comme actifs</p>
            </div>
            <box-icon name="trending-up" type="solid" size="lg" class="text-cyan-400"></box-icon>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 p-8 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <box-icon name="badge-check" type="solid" size="lg" class="text-white"></box-icon>
          <div>
            <h1 className="text-3xl font-bold">Bienvenue, Admin</h1>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Acces rapide</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {quickLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <box-icon name={item.icon} type="solid" color="#1d4ed8"></box-icon>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
