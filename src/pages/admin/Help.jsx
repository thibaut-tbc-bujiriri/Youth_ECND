export default function AdminHelp() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Aide utilisateur</h1>
        <p className="mt-2 text-slate-600">
          Guide rapide pour utiliser la plateforme YOUTH ECND du debut a la fin.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">1. Connexion et inscription</h2>
        <p className="mt-2 text-slate-600">
          L'utilisateur cree un compte, confirme son email, puis se connecte. Le role attribue definit l'acces
          (admin ou membre).
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">2. Gestion des membres</h2>
        <p className="mt-2 text-slate-600">
          Dans Utilisateurs et Jeunes, l'admin ajoute, modifie et supprime les fiches. Les informations doivent etre
          completes pour un meilleur suivi.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">3. Contributions et caisse</h2>
        <p className="mt-2 text-slate-600">
          Les membres soumettent des contributions, puis l'admin valide. Le rapport de caisse enregistre les depenses
          et calcule le solde reel.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">4. Activites et CV</h2>
        <p className="mt-2 text-slate-600">
          L'admin planifie les activites et consulte les CV televerses par les membres. Chaque fiche peut etre
          imprimee en rapport.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">5. Audit, maintenance, mises a jour</h2>
        <p className="mt-2 text-slate-600">
          L'audit enregistre uniquement les ajouts, modifications et suppressions. En mode maintenance, seuls les
          admins gardent l'acces. Les utilisateurs sont invites a appliquer les mises a jour apres redeploiement.
        </p>
      </section>
    </div>
  );
}

