import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getMemberContext } from "../lib/memberData";
import { logAuditEvent } from "../lib/audit";
import "boxicons";

const MemberLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    let active = true;
    async function loadPhoto() {
      try {
        const context = await getMemberContext();
        if (!active) return;
        setProfilePhoto(context.jeune?.photo_url || "");
        const name = [context.jeune?.nom, context.jeune?.postnom, context.jeune?.prenom]
          .filter(Boolean)
          .join(" ")
          .trim();
        setProfileName(name);
      } catch {
        if (!active) return;
        setProfilePhoto("");
        setProfileName("");
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

  const dashboardItem = { label: "Tableau de bord", path: "/member/dashboard", icon: "grid-alt" };
  const groupedMenus = [
    {
      id: "espace",
      title: "Mon espace",
      icon: "grid-alt",
      items: [
        { label: "Statistiques", path: "/member/stats", icon: "bar-chart-alt-2" },
      ],
    },
    {
      id: "dossier",
      title: "Mon dossier",
      icon: "folder-open",
      items: [
        { label: "Mon profil", path: "/member/profile", icon: "user-circle" },
        { label: "Mes contributions", path: "/member/contributions", icon: "money" },
        { label: "CV", path: "/member/cv", icon: "file" },
      ],
    },
  ];

  const isActive = (path) => location.pathname === path;
  const displayName = profileName || (user?.email ? user.email.split("@")[0] : "Utilisateur");

  function toggleSection(sectionId) {
    setOpenSection((current) => (current === sectionId ? "" : sectionId));
  }

  return (
    <div className="member-shell flex min-h-screen bg-slate-50">
      {mobileMenuOpen && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`fixed z-50 h-full bg-gradient-to-b from-emerald-900 to-emerald-800 text-white shadow-lg transition-all duration-300
          ${sidebarOpen ? "w-64 lg:w-64" : "w-64 lg:w-20"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 flex flex-col`}
      >
        <div className="flex items-center justify-between border-b border-emerald-700 p-6">
          {sidebarOpen && <h1 className="text-xl font-bold">YOUTH ECND</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-emerald-200 transition hover:text-white">
            <box-icon name={sidebarOpen ? "chevron-left" : "chevron-right"} color="#cbd5e1" size="sm"></box-icon>
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-4">
          {sidebarOpen ? (
            <>
              <Link
                to={dashboardItem.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition ${
                  isActive(dashboardItem.path) ? "bg-emerald-600 text-white" : "text-emerald-100 hover:bg-emerald-700"
                }`}
              >
                <box-icon name={dashboardItem.icon} type="solid" color="currentColor" size="sm"></box-icon>
                <span className="font-medium">{dashboardItem.label}</span>
              </Link>

              {groupedMenus.map((section) => {
                const expanded = openSection === section.id;
                return (
                  <div key={section.id} className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide transition ${
                        expanded ? "bg-emerald-700 text-white" : "text-emerald-200/90 hover:bg-emerald-800/60"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <box-icon name={section.icon} color="currentColor" size="xs"></box-icon>
                        <span>{section.title}</span>
                      </span>
                      <box-icon name={expanded ? "chevron-up" : "chevron-down"} color="currentColor" size="xs"></box-icon>
                    </button>

                    {expanded && (
                      <div className="space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition ${
                              isActive(item.path) ? "bg-emerald-600 text-white" : "text-emerald-100 hover:bg-emerald-700"
                            }`}
                          >
                            <box-icon name={item.icon} type="solid" color="currentColor" size="sm"></box-icon>
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="space-y-1">
              {[dashboardItem, ...groupedMenus.flatMap((section) => section.items)].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-center rounded-lg px-2 py-2.5 transition ${
                    isActive(item.path) ? "bg-emerald-600 text-white" : "text-emerald-100 hover:bg-emerald-700"
                  }`}
                  title={item.label}
                >
                  <box-icon name={item.icon} type="solid" color="currentColor" size="sm"></box-icon>
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-emerald-700 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-red-600/20 hover:text-red-400"
          >
            <box-icon name="log-out" color="currentColor" size="sm"></box-icon>
            {sidebarOpen && <span>Deconnexion</span>}
          </button>
        </div>
      </aside>

      <main className={`flex flex-1 flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              className={`rounded-lg border p-2 lg:hidden ${
                theme === "dark" ? "border-slate-500 bg-slate-800 text-slate-100" : "border-slate-300 bg-white text-slate-800"
              }`}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Ouvrir le menu"
            >
              <box-icon name="menu" color={theme === "dark" ? "#ffffff" : "#0f172a"} size="sm"></box-icon>
            </button>
            <h2 className="text-base font-bold text-slate-800 sm:text-2xl">Mon Espace</h2>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={toggleTheme}
              className="text-amber-400 transition hover:text-amber-300 sm:hidden"
              aria-label="Changer le theme"
              title="Changer le theme"
            >
              <box-icon name={theme === "dark" ? "sun" : "moon"} color={theme === "dark" ? "#f5d06f" : "#475569"} size="sm"></box-icon>
            </button>
            <button
              onClick={toggleTheme}
              className="hidden text-amber-400 transition hover:text-amber-300 sm:inline-flex"
              aria-label="Changer le theme"
              title="Changer le theme"
            >
              <box-icon name={theme === "dark" ? "sun" : "moon"} color={theme === "dark" ? "#f5d06f" : "#475569"} size="sm"></box-icon>
            </button>
            <div className="hidden max-w-[260px] sm:block">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-600">{user?.email}</p>
            </div>
            {profilePhoto ? (
              <img src={profilePhoto} alt="Photo profil" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
                {user?.email?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-3 sm:p-5 lg:p-6">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default MemberLayout;
