import { Link } from "react-router-dom";
import "boxicons";
import youthImage1 from "../image/Ynd (1).jpeg";
import youthImage2 from "../image/Ynd (2).jpeg";

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
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-900 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
        <h1 className="text-xl font-bold tracking-wide">YOUTH ECND</h1>
        <nav className="flex items-center gap-4">
          <Link to="/" className="text-sm hover:text-cyan-300">
            Accueil
          </Link>
          <Link to="/login" className="text-sm hover:text-cyan-300">
            Se connecter
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="text-4xl font-extrabold leading-tight md:text-6xl">
          YOUTH ECND : BATIR L'AVENIR ENSEMBLE
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-xl text-slate-200 md:text-2xl">
          Plateforme de gestion de la jeunesse chretienne
        </p>
        <p className="mx-auto mt-3 max-w-3xl text-lg text-cyan-200 md:text-xl">
          Votre bien etre, notre preoccupation.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            className="rounded-lg bg-cyan-500 px-8 py-3 font-bold text-slate-900 hover:bg-cyan-400"
            to="/register"
          >
            Commencer
          </Link>
          <Link className="rounded-lg border border-white/40 px-8 py-3 hover:bg-white/10" to="/login">
            Se connecter
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12" id="features">
        <h3 className="mb-8 text-center text-3xl font-bold">Fonctionnalites</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((item) => (
            <article key={item.title} className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/15">
                <box-icon name={item.icon} type="solid" color="#67e8f9"></box-icon>
              </div>
              <h4 className="text-xl font-semibold">{item.title}</h4>
              <p className="mt-2 text-slate-200">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16" id="about">
        <h3 className="mb-4 text-center text-3xl font-bold">A propos de YOUTH ECND</h3>
        <p className="mx-auto max-w-3xl text-center text-slate-100">
          Plateforme pensee pour les equipes de jeunesse chretienne qui souhaitent centraliser le suivi des
          participants, gerer les contributions, organiser les activites et disposer de statistiques en temps reel.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16" id="galerie">
        <h3 className="mb-8 text-center text-3xl font-bold">Notre jeunesse en action</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <article className="overflow-hidden rounded-xl border border-white/20 bg-white/5">
            <img
              src={youthImage1}
              alt="Equipe de jeunes en reunion de travail"
              className="h-72 w-full object-cover md:h-80"
              loading="lazy"
            />
          </article>
          <article className="overflow-hidden rounded-xl border border-white/20 bg-white/5">
            <img
              src={youthImage2}
              alt="Jeunes en collaboration sur le terrain"
              className="h-72 w-full object-cover md:h-80"
              loading="lazy"
            />
          </article>
        </div>
      </section>

      <footer className="mt-8 bg-slate-950 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 text-slate-300 lg:grid-cols-3">
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
          <div className="text-right lg:text-left">
            <p>© {new Date().getFullYear()} YOUTH ECND. Tous droits reserves.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
