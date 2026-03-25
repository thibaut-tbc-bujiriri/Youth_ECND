import { NavLink } from "react-router-dom";
import "boxicons";

const menu = [
  { label: "Dashboard", path: "/admin/dashboard", icon: "grid-alt" },
  { label: "Utilisateurs", path: "/admin/utilisateurs", icon: "user-check" },
  { label: "Jeunes", path: "/admin/jeunes", icon: "group" },
  { label: "Contributions", path: "/admin/contributions", icon: "money" },
  { label: "Activités", path: "/admin/activites", icon: "calendar-event" },
  { label: "Paramètres", path: "/admin/settings", icon: "cog" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-20 h-screen w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-2xl">
      {/* Logo Section */}
      <div className="p-5 border-b border-blue-700 flex items-center gap-3">
        <box-icon name="leaf" type="solid" size="lg" theme="light"></box-icon>
        <div>
          <h2 className="text-xl font-bold">YOUTH ECND</h2>
          <p className="text-xs text-blue-200 mt-1">Vision 26-27</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-1 mt-4">
        {menu.map(({ label, path, icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive 
                  ? "bg-blue-700 shadow-lg text-white" 
                  : "hover:bg-blue-700 text-blue-100"
              }`
            }
          >
            <box-icon name={icon} type="solid" class="text-lg"></box-icon>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-700 bg-blue-900">
        <div className="flex items-center gap-2 text-xs text-blue-200">
          <box-icon name="info-circle" type="solid"></box-icon>
          <span>V1.0 - Admin Panel</span>
        </div>
      </div>
    </aside>
  );
}
