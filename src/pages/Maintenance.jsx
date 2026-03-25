export default function Maintenance() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
        <h1 className="text-4xl font-bold">Mode maintenance</h1>
        <p className="mt-4 text-slate-300">
          La plateforme est temporairement indisponible pour maintenance. Merci de revenir plus tard.
        </p>
      </section>
    </main>
  );
}
