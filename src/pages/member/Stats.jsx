import { useEffect, useMemo, useState } from "react";
import { getMemberContext, getMemberContributions } from "../../lib/memberData";
import "boxicons";

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
  if (value.includes("pay") || value.includes("approuv") || value.includes("valid")) return "paid";
  return "other";
}

export default function MemberStats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contributions, setContributions] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError("");
      const context = await getMemberContext();
      const rows = await getMemberContributions(context.jeune?.id);
      setContributions(rows);
    } catch (err) {
      console.error("[MEMBER_STATS] load:", err);
      setError(err.message || "Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const approvedRows = contributions.filter((item) => statusKey(item.status) === "paid");
    const pendingRows = contributions.filter((item) => statusKey(item.status) === "pending");

    if (!approvedRows.length) {
      return {
        average: 0,
        max: 0,
        regularity: 0,
        participationCount: 0,
        pendingCount: pendingRows.length,
        monthly: [],
      };
    }

    const amounts = approvedRows.map((item) => Number(item.amount ?? item.montant ?? 0));
    const average = amounts.reduce((sum, amount) => sum + amount, 0) / approvedRows.length;
    const max = Math.max(...amounts);

    const monthlyMap = {};
    approvedRows.forEach((item) => {
      const key = item.date ? item.date.slice(0, 7) : "N/A";
      monthlyMap[key] = (monthlyMap[key] || 0) + Number(item.amount ?? item.montant ?? 0);
    });

    const monthly = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      average,
      max,
      regularity: contributions.length ? Math.round((approvedRows.length / contributions.length) * 100) : 0,
      participationCount: approvedRows.length,
      pendingCount: pendingRows.length,
      monthly,
    };
  }, [contributions]);

  const maxMonthlyAmount = useMemo(() => {
    if (!stats.monthly.length) return 0;
    return Math.max(...stats.monthly.map((item) => item.amount));
  }, [stats.monthly]);

  if (loading) {
    return <div className="rounded-xl bg-white p-6 shadow-sm">Chargement des statistiques...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Mes Statistiques</h1>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Contributions approuvees par mois</h2>
          {stats.monthly.length === 0 ? (
            <div className="h-64 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
              <p className="text-slate-600">Aucune contribution approuvee</p>
            </div>
          ) : (
            <div className="h-64 rounded-lg border border-slate-100 p-4">
              <div className="h-full flex items-end gap-2">
              {stats.monthly.map((item) => {
                const percent = maxMonthlyAmount > 0 ? Math.max((item.amount / maxMonthlyAmount) * 100, 5) : 5;
                return (
                  <div key={item.month} className="flex-1 h-full flex flex-col items-center justify-end gap-2">
                    <div className="w-full rounded-t-md bg-blue-500" style={{ height: `${percent}%` }}></div>
                    <p className="text-[11px] text-slate-500">{item.month}</p>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Evolution annuelle</h2>
          <div className="space-y-3">
            {stats.monthly.length === 0 ? (
              <div className="h-64 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                <p className="text-slate-600">Aucune donnee</p>
              </div>
            ) : (
              stats.monthly.map((item) => (
                <div key={item.month} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{item.month}</span>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg p-6">
          <p className="text-blue-600 text-sm font-medium">Contribution moyenne</p>
          <p className="text-2xl font-bold text-blue-900 mt-2">{formatCurrency(stats.average)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-lg p-6">
          <p className="text-green-600 text-sm font-medium">Contribution max</p>
          <p className="text-2xl font-bold text-green-900 mt-2">{formatCurrency(stats.max)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg p-6">
          <p className="text-purple-600 text-sm font-medium">Regularite</p>
          <p className="text-2xl font-bold text-purple-900 mt-2">{stats.regularity}%</p>
        </div>
        <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-6">
          <p className="text-orange-600 text-sm font-medium">Approuvees</p>
          <p className="text-2xl font-bold text-orange-900 mt-2">{stats.participationCount}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg p-6">
          <p className="text-amber-700 text-sm font-medium">En attente</p>
          <p className="text-2xl font-bold text-amber-900 mt-2">{stats.pendingCount}</p>
        </div>
      </div>
    </div>
  );
}
