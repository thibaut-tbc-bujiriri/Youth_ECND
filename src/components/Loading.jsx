import "boxicons";

export default function Loading({ message = "Chargement..." }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-5 px-4 py-8 text-slate-700">
      <div className="relative h-28 w-28">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-300/80 border-t-emerald-600"></div>
        <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <box-icon name="church" type="solid" color="#2f6b47" size="sm"></box-icon>
          <span className="mt-1 text-xs font-extrabold tracking-[0.25em] text-slate-800">ECND</span>
        </div>
      </div>
      <p className="text-base font-semibold text-slate-600">{message}</p>
    </div>
  );
}
