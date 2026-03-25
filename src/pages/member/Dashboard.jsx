import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  if (value.includes("pay")) return "paid";
  return "other";
}

export default function MemberDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publicUser, setPublicUser] = useState(null);
  const [jeune, setJeune] = useState(null);
  const [contributions, setContributions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const context = await getMemberContext();
      const rows = await getMemberContributions(context.jeune?.id);
      setPublicUser(context.publicUser);
      setJeune(context.jeune || null);
      setContributions(rows);
    } catch (err) {
      console.error("[MEMBER_DASHBOARD] load:", err);
      setError(err.message || "Impossible de charger le dashboard membre.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const approvedRows = contributions.filter((item) => statusKey(item.status) === "paid");
    const total = approvedRows.reduce((sum, item) => sum + Number(item.amount ?? item.montant ?? 0), 0);
    const currentMonthTag = new Date().toISOString().slice(0, 7);
    const currentMonth = approvedRows
      .filter((item) => item.date?.slice(0, 7) === currentMonthTag)
      .reduce((sum, item) => sum + Number(item.amount ?? item.montant ?? 0), 0);
    const paidCount = approvedRows.length;
    const pendingCount = contributions.filter((item) => statusKey(item.status) === "pending").length;
    return { total, currentMonth, paidCount, pendingCount };
  }, [contributions]);

  if (loading) return <div className="rounded-xl bg-white p-6 shadow-sm">Chargement...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!jeune?.id && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Votre fiche membre n'est pas encore complete. Ouvrez{" "}
          <Link to="/member/profile" className="font-semibold underline">Mon profil</Link> pour la finaliser.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <p className="text-slate-600 text-sm font-medium">Paye ce mois</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(stats.currentMonth)}</p>
          <p className="text-xs text-slate-500 mt-2">Contributions valides</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <p className="text-slate-600 text-sm font-medium">Total paye</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(stats.total)}</p>
          <p className="text-xs text-slate-500 mt-2">Depuis inscription</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <p className="text-slate-600 text-sm font-medium">En attente</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{stats.pendingCount}</p>
          <p className="text-xs text-slate-500 mt-2">Approuvees: {stats.paidCount}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3">
          <box-icon name="hand" type="solid" color="#ffffff"></box-icon>
          <h1 className="text-3xl font-bold">Bienvenue</h1>
        </div>
        <p className="text-blue-100 mt-2">
          Vos contributions sont d'abord en attente, puis valides quand un admin les approuve.
        </p>
        <p className="text-blue-100 text-sm mt-2">{publicUser?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/member/contributions" className="p-6 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <box-icon name="credit-card" type="solid"></box-icon>
            <p className="font-bold text-lg text-slate-900">Mes Contributions</p>
          </div>
          <p className="text-slate-600 text-sm">Voir l'historique et ajouter une nouvelle contribution</p>
        </Link>

        <Link to="/member/profile" className="p-6 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <box-icon name="user-circle" type="solid"></box-icon>
            <p className="font-bold text-lg text-slate-900">Mon Profil</p>
          </div>
          <p className="text-slate-600 text-sm">Gerer vos informations personnelles</p>
        </Link>

        <Link to="/member/stats" className="p-6 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <box-icon name="line-chart" type="solid"></box-icon>
            <p className="font-bold text-lg text-slate-900">Statistiques</p>
          </div>
          <p className="text-slate-600 text-sm">Voir vos statistiques de participation</p>
        </Link>

        <Link to="/member/profile#settings" className="p-6 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <box-icon name="cog" type="solid"></box-icon>
            <p className="font-bold text-lg text-slate-900">Parametres</p>
          </div>
          <p className="text-slate-600 text-sm">Gerer vos preferences et securite</p>
        </Link>
      </div>
    </div>
  );
}
