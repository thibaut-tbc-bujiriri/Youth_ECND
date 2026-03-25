import DashboardLayout from "../layouts/DashboardLayout";

const sampleActivities = [
  { id: "1", title: "Rencontre Mardi", date: "2026-05-05", status: "Planifié" },
  { id: "2", title: "Retraite spirituelle", date: "2026-06-20", status: "En préparation" },
  { id: "3", title: "Camp d'été", date: "2026-07-12", status: "Publié" },
];

export default function Activites() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Activités</h2>
        <p className="text-slate-500">Planification et gestion des événements de la jeunesse.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sampleActivities.map((activity) => (
            <article key={activity.id} className="rounded-xl border p-4 bg-white shadow-sm">
              <h3 className="font-semibold">{activity.title}</h3>
              <p className="text-sm text-slate-500">{activity.date}</p>
              <span className="inline-block mt-2 text-xs px-2 py-1 bg-cyan-100 text-cyan-700 rounded">{activity.status}</span>
            </article>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
