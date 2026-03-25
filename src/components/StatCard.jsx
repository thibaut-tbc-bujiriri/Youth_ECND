export default function StatCard({ title, value, subtitle, className }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-md border border-slate-200 ${className || ""}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
