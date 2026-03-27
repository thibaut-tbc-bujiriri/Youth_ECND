import { Link } from "react-router-dom";
import "boxicons";
import logoEcnd from "../image/logo_ecnd.jpg";
import youthImage1 from "../image/Ynd (1).jpeg";
import youthImage2 from "../image/Ynd (2).jpeg";
import { useTheme } from "../context/ThemeContext";

const features = [
  {
    title: "Gestion des jeunes",
    description: "Suivi complet des fiches, du statut et des informations de chaque jeune.",
    icon: "group",
  },
  {
    title: "Suivi des contributions",
    description: "Centralisation des cotisations, validations et historique des paiements.",
    icon: "money",
  },
  {
    title: "Statistiques en temps reel",
    description: "Indicateurs instantanes pour suivre la progression de la jeunesse.",
    icon: "bar-chart-alt-2",
  },
  {
    title: "Gestion des activites",
    description: "Planification, budget, rapport et strategie pour chaque activite.",
    icon: "calendar-event",
  },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-900 text-white"
          : "bg-gradient-to-br from-sky-100 via-blue-50 to-slate-100 text-slate-900"
      }`}
    >
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src={logoEcnd}
            alt="Logo ECND"
            className="h-10 w-10 rounded-full border-2 border-cyan-300/70 object-cover sm:h-12 sm:w-12"
          />
          <h1 className="text-base font-bold tracking-wide sm:text-xl">Eglise Chretienne pour le nouveau depart</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className={`p-1.5 transition ${isDark ? "text-slate-100 hover:text-amber-300" : "text-slate-500 hover:text-emerald-700"}`}
            aria-label="Changer le theme"
            title="Changer le theme"
          >
            <box-icon name={isDark ? "sun" : "moon"} color={isDark ? "#ffffff" : "#0f172a"} size="sm"></box-icon>
          </button>
          <Link
            to="/login"
            className="hidden rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 md:inline-flex"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <section className="surface-hero mx-auto max-w-6xl rounded-[28px] border px-4 py-12 text-center sm:px-6 sm:py-16">
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-6xl">
          YOUTH ECND : BATIR L'AVENIR ENSEMBLE
        </h2>
        <p className={`mx-auto mt-5 max-w-3xl text-lg sm:text-xl md:text-2xl ${isDark ? "text-slate-200" : "text-slate-700"}`}>
          Plateforme de gestion de la jeunesse chretienne
        </p>
        <p className={`mx-auto mt-3 max-w-3xl text-base sm:text-lg md:text-xl ${isDark ? "text-cyan-200" : "text-blue-700"}`}>
          Votre bien etre, notre preoccupation.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <Link
            className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 sm:px-8 sm:text-base"
            to="/register"
          >
            Commencer
          </Link>
          <Link
            className={`rounded-xl border px-6 py-3 text-sm transition sm:px-8 sm:text-base ${
              isDark ? "border-amber-300/50 bg-amber-400/90 text-slate-900 hover:bg-amber-300" : "border-slate-300 hover:bg-slate-200/70"
            }`}
            to="/login"
          >
            Acceder
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12" id="features">
        <h3 className="mb-6 text-center text-2xl font-bold sm:mb-8 sm:text-3xl">Fonctionnalites</h3>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {features.map((item) => (
            <article
              key={item.title}
              className={`rounded-xl border p-5 backdrop-blur sm:p-6 ${
                isDark ? "border-white/20 bg-white/10" : "border-slate-200 bg-white/80"
              }`}
            >
              <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-lg sm:mb-4 sm:h-12 sm:w-12 ${isDark ? "bg-white/15" : "bg-slate-100"}`}>
                <box-icon name={item.icon} type="solid" color="#67e8f9"></box-icon>
              </div>
              <h4 className="text-lg font-semibold sm:text-xl">{item.title}</h4>
              <p className={`mt-2 text-sm sm:text-base ${isDark ? "text-slate-200" : "text-slate-600"}`}>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16" id="about">
        <h3 className="mb-4 text-center text-2xl font-bold sm:text-3xl">A propos de YOUTH ECND</h3>
        <p className={`mx-auto max-w-3xl text-center text-sm sm:text-base ${isDark ? "text-slate-100" : "text-slate-700"}`}>
          Plateforme pensee pour les equipes de jeunesse chretienne qui souhaitent centraliser le suivi des
          participants, gerer les contributions, organiser les activites et disposer de statistiques en temps reel.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16" id="galerie">
        <h3 className="mb-6 text-center text-2xl font-bold sm:mb-8 sm:text-3xl">Notre jeunesse en action</h3>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          <article className={`overflow-hidden rounded-xl border ${isDark ? "border-white/20 bg-white/5" : "border-slate-200 bg-white/80"}`}>
            <img
              src={youthImage1}
              alt="Equipe de jeunes en reunion de travail"
              className="h-56 w-full object-cover sm:h-64 md:h-80"
              loading="lazy"
            />
          </article>
          <article className={`overflow-hidden rounded-xl border ${isDark ? "border-white/20 bg-white/5" : "border-slate-200 bg-white/80"}`}>
            <img
              src={youthImage2}
              alt="Jeunes en collaboration sur le terrain"
              className="h-56 w-full object-cover sm:h-64 md:h-80"
              loading="lazy"
            />
          </article>
        </div>
      </section>

      <footer className={`mt-6 py-8 sm:mt-8 ${isDark ? "bg-slate-950" : "bg-slate-200"}`}>
        <div className={`mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          <div>
            <h5 className="font-semibold">Contact</h5>
            <p className="mt-2 flex items-center gap-2">
              <box-icon name="envelope" color="#cbd5e1" size="sm"></box-icon>
              youthecnd2026@gmail.com
            </p>
            <p className="mt-1 flex items-center gap-2">
              <box-icon name="phone" color="#cbd5e1" size="sm"></box-icon>
              +243 99174450
            </p>
          </div>
          <div>
            <h5 className="font-semibold">Church</h5>
            <p className="mt-2 flex items-center gap-2">
              <box-icon name="church" color="#cbd5e1" size="sm"></box-icon>
              ECND Goma Youth
            </p>
            <p className="mt-1 flex items-center gap-2">
              <box-icon name="target-lock" color="#cbd5e1" size="sm"></box-icon>
              Vision 26-27
            </p>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-sm sm:text-base">(c) {new Date().getFullYear()} YOUTH ECND. Tous droits reserves.</p>
            <p className="mt-1 text-sm">
              Developpe par Tbc-Groupe :{" "}
              <a
                href="https://tbc-groupe.vercel.app"
                target="_blank"
                rel="noreferrer"
                className={`font-semibold underline ${isDark ? "text-emerald-300" : "text-emerald-700"}`}
              >
                https://tbc-groupe.vercel.app
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
