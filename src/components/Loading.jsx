export default function Loading({ message = "Chargement..." }) {
  return (
    <div className="flex items-center justify-center h-32 text-slate-700">
      <div className="animate-pulse text-lg font-medium">{message}</div>
    </div>
  );
}
