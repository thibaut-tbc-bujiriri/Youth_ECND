import { Link } from "react-router-dom";
import "boxicons";
import logoEcnd from "../image/logo_ecnd.jpg";
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
      <header className="mx-auto flex max-w-7xl items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src={logoEcnd}
            alt="Logo ECND"
            className="h-10 w-10 rounded-full border-2 border-cyan-300/70 object-cover sm:h-12 sm:w-12"
          />
          <h1 className="text-base font-bold tracking-wide sm:text-xl">Eglise Chretienne pour le nouveau depart</h1>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-6xl">
          YOUTH ECND : BATIR L'AVENIR ENSEMBLE
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-200 sm:text-xl md:text-2xl">
          Plateforme de gestion de la jeunesse chretienne
        </p>
        <p className="mx-auto mt-3 max-w-3xl text-base text-cyan-200 sm:text-lg md:text-xl">
          Votre bien etre, notre preoccupation.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <Link
            className="rounded-lg bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 sm:px-8 sm:text-base"
            to="/register"
          >
            Commencer
          </Link>
          <Link
            className="rounded-lg border border-white/40 px-6 py-3 text-sm transition hover:bg-white/10 sm:px-8 sm:text-base"
            to="/login"
          >
            Se connecter
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12" id="features">
        <h3 className="mb-6 text-center text-2xl font-bold sm:mb-8 sm:text-3xl">Fonctionnalites</h3>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {features.map((item) => (
            <article key={item.title} className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur sm:p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 sm:mb-4 sm:h-12 sm:w-12">
                <box-icon name={item.icon} type="solid" color="#67e8f9"></box-icon>
              </div>
              <h4 className="text-lg font-semibold sm:text-xl">{item.title}</h4>
              <p className="mt-2 text-sm text-slate-200 sm:text-base">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16" id="about">
        <h3 className="mb-4 text-center text-2xl font-bold sm:text-3xl">A propos de YOUTH ECND</h3>
        <p className="mx-auto max-w-3xl text-center text-sm text-slate-100 sm:text-base">
          Plateforme pensee pour les equipes de jeunesse chretienne qui souhaitent centraliser le suivi des
          participants, gerer les contributions, organiser les activites et disposer de statistiques en temps reel.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16" id="galerie">
        <h3 className="mb-6 text-center text-2xl font-bold sm:mb-8 sm:text-3xl">Notre jeunesse en action</h3>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          <article className="overflow-hidden rounded-xl border border-white/20 bg-white/5">
            <img
              src={youthImage1}
              alt="Equipe de jeunes en reunion de travail"
              className="h-56 w-full object-cover sm:h-64 md:h-80"
              loading="lazy"
            />
          </article>
          <article className="overflow-hidden rounded-xl border border-white/20 bg-white/5">
            <img
              src={youthImage2}
              alt="Jeunes en collaboration sur le terrain"
              className="h-56 w-full object-cover sm:h-64 md:h-80"
              loading="lazy"
            />
          </article>
        </div>
      </section>

      <footer className="mt-6 bg-slate-950 py-8 sm:mt-8">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 text-slate-300 sm:px-6 lg:grid-cols-3">
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
          </div>
        </div>
      </footer>
    </div>
  );
}
