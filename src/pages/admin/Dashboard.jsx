import { useEffect, useMemo, useState } from "react";
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

function lastSixMonths() {
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("fr-FR", { month: "short" }),
    });
  }
  return result;
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
  const [charts, setCharts] = useState({
    monthlyContributions: [],
    contributionByStatus: [],
    spiritualByStatus: [],
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
        supabase.from("jeunes").select("*"),
        supabase.from("contributions").select("*"),
        supabase.from("users").select("*"),
        supabase.from("activities").select("*"),
      ]);

      const jeunes = jeunesData || [];
      const contributions = contributionsData || [];
      const monthlySlots = lastSixMonths();

      const monthlyContributions = monthlySlots.map((slot) => {
        const total = contributions
          .filter((item) => (item.date || "").slice(0, 7) === slot.key)
          .reduce((sum, item) => sum + Number(item.amount ?? item.montant ?? 0), 0);
        return { ...slot, value: total };
      });

      const contributionStatusOrder = ["payé", "en attente", "partiel", "non payé"];
      const contributionByStatus = contributionStatusOrder.map((status) => ({
        label: status,
        value: contributions.filter((item) => (item.status || "").toLowerCase() === status).length,
      }));

      const spiritualLabels = ["nouveau", "chrétien", "païen", "engagé", "inactif"];
      const spiritualByStatus = spiritualLabels.map((label) => ({
        label,
        value: jeunes.filter((item) => (item.etat_spirituel || "").toLowerCase() === label).length,
      }));

      setStats({
        totalJeunes: jeunes.length,
        activesJeunes: jeunes.filter((item) => (item.status || item.statut) === "actif").length,
        totalContributions: contributions.reduce((sum, item) => sum + Number(item.amount ?? item.montant ?? 0), 0),
        totalUtilisateurs: usersData?.length || 0,
        totalActivites: activitiesError ? 0 : activitiesData?.length || 0,
      });

      setCharts({ monthlyContributions, contributionByStatus, spiritualByStatus });
    } catch (err) {
      console.error("Erreur lors du chargement des stats:", err);
    } finally {
      setLoading(false);
    }
  }

  const monthlyMax = useMemo(
    () => Math.max(1, ...charts.monthlyContributions.map((item) => item.value || 0)),
    [charts.monthlyContributions],
  );
  const contributionMax = useMemo(
    () => Math.max(1, ...charts.contributionByStatus.map((item) => item.value || 0)),
    [charts.contributionByStatus],
  );
  const spiritualMax = useMemo(
    () => Math.max(1, ...charts.spiritualByStatus.map((item) => item.value || 0)),
    [charts.spiritualByStatus],
  );

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

      <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <box-icon name="badge-check" type="solid" size="lg" class="text-white"></box-icon>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Bienvenue, Admin</h1>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="text-lg font-bold text-slate-900">Evolution des contributions (6 mois)</h2>
          <div className="mt-4 space-y-3">
            {charts.monthlyContributions.map((item) => (
              <div key={item.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-slate-500">{currency(item.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${Math.max(6, Math.round((item.value / monthlyMax) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="text-lg font-bold text-slate-900">Contributions par statut</h2>
          <div className="mt-4 space-y-3">
            {charts.contributionByStatus.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-slate-500">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${Math.max(6, Math.round((item.value / contributionMax) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="rounded-2xl bg-white p-6 shadow-md">
        <h2 className="text-lg font-bold text-slate-900">Etat spirituel des jeunes</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {charts.spiritualByStatus.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="text-slate-500">{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-purple-500"
                  style={{ width: `${Math.max(6, Math.round((item.value / spiritualMax) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>

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
