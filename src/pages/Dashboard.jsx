import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [jeunes, setJeunes] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: jeunesData } = await supabase.from("jeunes").select("*");
      const { data: contributionsData } = await supabase.from("contributions").select("*");
      setJeunes(jeunesData || []);
      setContributions(contributionsData || []);
      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const total = jeunes.length;
    const actifs = jeunes.filter((j) => j.status !== "inactif").length;
    const inactifs = total - actifs;
    const contributionMensuelle = contributions
      .filter((c) => new Date(c.date).getMonth() === new Date().getMonth())
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    return { total, actifs, inactifs, contributionMensuelle };
  }, [jeunes, contributions]);

  const chartSeries = useMemo(() => {
    const bills = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    return bills.map((m, idx) => ({ month: m, amount: contributions.filter((c) => new Date(c.date).getMonth() === idx).reduce((a, c) => a + Number(c.amount || 0), 0) }));
  }, [contributions]);

  if (loading) return <DashboardLayout><Loading message="Chargement du dashboard..." /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold mb-4">Bienvenue dans YOUTH ECND</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total jeunes" value={stats.total} />
          <StatCard title="Jeunes actifs" value={stats.actifs} className="bg-slate-50" />
          <StatCard title="Jeunes inactifs" value={stats.inactifs} className="bg-slate-50" />
          <StatCard title="Contributions mensuelles" value={`${stats.contributionMensuelle} €`} />
        </div>

        <section className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Graphique des contributions</h2>
          <div className="grid grid-cols-12 gap-2 h-40 items-end">
            {chartSeries.map((point) => {
              const max = Math.max(...chartSeries.map((p) => p.amount), 10);
              const height = max > 0 ? (point.amount / max) * 100 : 5;
              return (
                <div key={point.month} className="col-span-1 flex flex-col items-center">
                  <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(height, 6)}%` }}></div>
                  <span className="text-xs mt-2">{point.month}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
