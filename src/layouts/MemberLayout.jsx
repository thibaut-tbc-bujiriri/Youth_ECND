import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMemberContext } from "../lib/memberData";
import { logAuditEvent } from "../lib/audit";
import "boxicons";

const MemberLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");

  useEffect(() => {
    logAuditEvent({
      action: "PAGE_VIEW",
      entity: "navigation",
      details: { area: "member", path: location.pathname },
    });
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    async function loadPhoto() {
      try {
        const context = await getMemberContext();
        if (!active) return;
        setProfilePhoto(context.jeune?.photo_url || "");
      } catch {
        if (!active) return;
        setProfilePhoto("");
      }
    }
    loadPhoto();
    return () => {
      active = false;
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    await logAuditEvent({
      action: "LOGOUT",
      entity: "auth",
      details: { area: "member" },
    });
    await logout();
    navigate("/");
  };

  const menuItems = [
    { label: "Mon profil", path: "/member/profile", icon: "user-circle" },
    { label: "Mes contributions", path: "/member/contributions", icon: "credit-card" },
    { label: "Statistiques", path: "/member/stats", icon: "bar-chart-alt" },
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
        className={`fixed z-50 h-full bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-lg transition-all duration-300
          ${sidebarOpen ? "w-64" : "w-20"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        <div className="flex items-center justify-between border-b border-blue-700 p-6">
          {sidebarOpen && <h1 className="text-xl font-bold">YOUTH ECND</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-blue-300 transition hover:text-white">
            {sidebarOpen ? (
              <box-icon name="chevron-left" type="solid" class="text-xl"></box-icon>
            ) : (
              <box-icon name="chevron-right" type="solid" class="text-xl"></box-icon>
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition ${
                isActive(item.path) ? "bg-cyan-500 text-white" : "text-blue-200 hover:bg-blue-700"
              }`}
              title={!sidebarOpen ? item.label : ""}
            >
              <box-icon name={item.icon} type="solid" class="text-lg"></box-icon>
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="border-t border-blue-700 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium transition hover:bg-red-700"
          >
            <box-icon name="log-out" type="solid" class="text-lg"></box-icon>
            {sidebarOpen && <span>Deconnexion</span>}
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
            <h2 className="text-lg font-bold text-slate-800 sm:text-2xl">Mon Espace</h2>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <span className="hidden text-sm text-slate-600 sm:block">{user?.email}</span>
            {profilePhoto ? (
              <img src={profilePhoto} alt="Photo profil" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
                {user?.email?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
};

export default MemberLayout;
