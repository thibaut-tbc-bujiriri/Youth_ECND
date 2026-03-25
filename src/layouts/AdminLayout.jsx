import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logAuditEvent } from "../lib/audit";
import "boxicons";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    logAuditEvent({
      action: "PAGE_VIEW",
      entity: "navigation",
      details: { area: "admin", path: location.pathname },
    });
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logAuditEvent({
      action: "LOGOUT",
      entity: "auth",
      details: { area: "admin" },
    });
    await logout();
    navigate("/");
  };

  const menuItems = [
    { label: "Tableau de bord", path: "/admin/dashboard", icon: "grid-alt" },
    { label: "Utilisateurs", path: "/admin/utilisateurs", icon: "user-check" },
    { label: "Jeunes", path: "/admin/jeunes", icon: "group" },
    { label: "Contributions", path: "/admin/contributions", icon: "money" },
    { label: "Activites", path: "/admin/activites", icon: "calendar-event" },
    { label: "Audit", path: "/admin/audit", icon: "history" },
    { label: "Parametres", path: "/admin/settings", icon: "cog" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {mobileMenuOpen && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`fixed z-50 h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-lg transition-all duration-300
          ${sidebarOpen ? "w-64" : "w-20"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        <div className="flex items-center justify-between border-b border-slate-700 p-6">
          {sidebarOpen && <h1 className="text-xl font-bold">YOUTH ECND</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-300 transition hover:text-white">
            <box-icon name={sidebarOpen ? "chevron-left" : "chevron-right"} color="#cbd5e1" size="sm"></box-icon>
          </button>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 rounded-lg px-4 py-3 transition ${
                isActive(item.path) ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700"
              }`}
              title={!sidebarOpen ? item.label : ""}
            >
              <box-icon name={item.icon} type="solid" color="currentColor"></box-icon>
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium transition hover:bg-red-700"
          >
            <box-icon name="log-out" color="#ffffff" size="sm"></box-icon>
            {sidebarOpen && "Deconnexion"}
          </button>
        </div>
      </aside>

      <main className={`flex flex-1 flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-slate-300 p-2 lg:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Ouvrir le menu"
            >
              <box-icon name="menu" color="#0f172a" size="sm"></box-icon>
            </button>
            <h2 className="text-lg font-bold text-slate-800 sm:text-2xl">Admin Dashboard</h2>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <span className="hidden text-sm text-slate-600 sm:block">{user?.email}</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
