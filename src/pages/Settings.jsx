import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import Loading from "../components/Loading";

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setProfile(data.user);
      setLoading(false);
    }
    loadUser();
  }, []);

  if (loading) {
    return <DashboardLayout><Loading message="Chargement..." /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Paramètres</h2>
        <p>Email: {profile?.email}</p>
        <p>ID utilisateur: {profile?.id}</p>
      </div>
    </DashboardLayout>
  );
}
