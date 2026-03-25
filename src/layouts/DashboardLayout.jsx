import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />
      <div className="ml-64 md:ml-72">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <span className="text-md font-semibold">YOUTH ECND Dashboard</span>
          <div className="space-x-3">
            <Link to="/dashboard/settings" className="text-sm text-slate-600 hover:text-slate-900">Paramètres</Link>
            <button onClick={signOut} className="bg-red-500 hover:bg-red-400 text-white text-sm px-3 py-1.5 rounded">Déconnexion</button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
