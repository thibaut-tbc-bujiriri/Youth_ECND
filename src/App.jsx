import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SystemSettingsProvider, useSystemSettings } from "./context/SystemSettingsContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import Loading from "./components/Loading";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Maintenance from "./pages/Maintenance";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUtilisateurs from "./pages/admin/Utilisateurs";
import AdminJeunes from "./pages/admin/Jeunes";
import AdminContributions from "./pages/admin/Contributions";
import AdminCV from "./pages/admin/CV";
import AdminActivites from "./pages/admin/Activites";
import AdminAudit from "./pages/admin/Audit";
import AdminSettings from "./pages/admin/Settings";
import AdminHelp from "./pages/admin/Help";

import MemberLayout from "./layouts/MemberLayout";
import MemberDashboard from "./pages/member/Dashboard";
import MemberProfile from "./pages/member/Profile";
import MemberContributions from "./pages/member/Contributions";
import MemberCV from "./pages/member/CV";
import MemberStats from "./pages/member/Stats";

function SessionTimeoutGuard() {
  const { user, logout } = useAuth();
  const { settings } = useSystemSettings();

  useEffect(() => {
    if (!user) return undefined;

    const minutes = Number(settings.session_duration_minutes || 120);
    const timeoutMs = Math.max(5, minutes) * 60 * 1000;
    let timer = null;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        await logout();
        localStorage.removeItem("role");
        window.location.href = "/login";
      }, timeoutMs);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [logout, settings.session_duration_minutes, user]);

  return null;
}

function MaintenanceGate({ children, allowDuringMaintenance = false }) {
  const { role, logout } = useAuth();
  const { settings, loading } = useSystemSettings();
  const localRole = localStorage.getItem("role");
  const currentRole = role || localRole;

  useEffect(() => {
    if (!settings.maintenance_mode) return;
    if (currentRole === "admin") return;
    if (allowDuringMaintenance) return;
    logout();
    localStorage.removeItem("role");
  }, [allowDuringMaintenance, currentRole, logout, settings.maintenance_mode]);

  if (loading) return <Loading message="Chargement du systeme..." />;
  if (!settings.maintenance_mode) return children;
  if (currentRole === "admin") return children;
  if (allowDuringMaintenance) return children;
  return <Navigate to="/maintenance" replace />;
}

function RoleGate({ allow, children }) {
  const { loading, role, user } = useAuth();
  const localRole = localStorage.getItem("role");
  const currentRole = role || localRole;

  if (loading) return <Loading message="Chargement du profil..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(currentRole)) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { loading, role } = useAuth();
  const { settings, loading: settingsLoading } = useSystemSettings();
  const localRole = localStorage.getItem("role");
  const currentRole = role || localRole;

  if (settingsLoading) {
    return <Loading message="Chargement des parametres..." />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <MaintenanceGate>
            <Landing />
          </MaintenanceGate>
        }
      />
      <Route
        path="/login"
        element={
          <MaintenanceGate allowDuringMaintenance>
            <Login />
          </MaintenanceGate>
        }
      />
      <Route
        path="/register"
        element={
          settings.registrations_open ? (
            <MaintenanceGate>
              <Register />
            </MaintenanceGate>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/maintenance" element={<Maintenance />} />

      <Route
        path="/dashboard"
        element={
          loading ? (
            <Loading message="Chargement du profil..." />
          ) : settings.maintenance_mode && currentRole !== "admin" ? (
            <Navigate to="/maintenance" replace />
          ) : (
            <Navigate to={currentRole === "admin" ? "/admin/dashboard" : "/member/dashboard"} replace />
          )
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <RoleGate allow={["admin"]}>
            <MaintenanceGate allowDuringMaintenance>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/admin/utilisateurs"
        element={
          <RoleGate allow={["admin"]}>
            <MaintenanceGate allowDuringMaintenance>
              <AdminLayout>
                <AdminUtilisateurs />
              </AdminLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/admin/jeunes"
        element={
          <RoleGate allow={["admin"]}>
            <MaintenanceGate allowDuringMaintenance>
              <AdminLayout>
                <AdminJeunes />
              </AdminLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/admin/contributions"
        element={
          <RoleGate allow={["admin"]}>
            <MaintenanceGate allowDuringMaintenance>
              <AdminLayout>
                <AdminContributions />
              </AdminLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/admin/cv"
        element={
          <RoleGate allow={["admin"]}>
            <MaintenanceGate allowDuringMaintenance>
              <AdminLayout>
                <AdminCV />
              </AdminLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/admin/activites"
        element={
          <RoleGate allow={["admin"]}>
            <MaintenanceGate allowDuringMaintenance>
              <AdminLayout>
                <AdminActivites />
              </AdminLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <RoleGate allow={["admin"]}>
            <MaintenanceGate allowDuringMaintenance>
              <AdminLayout>
                <AdminAudit />
              </AdminLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RoleGate allow={["admin"]}>
            <MaintenanceGate allowDuringMaintenance>
              <AdminLayout>
                <AdminSettings />
              </AdminLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/admin/aide"
        element={
          <RoleGate allow={["admin"]}>
            <MaintenanceGate allowDuringMaintenance>
              <AdminLayout>
                <AdminHelp />
              </AdminLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />

      <Route
        path="/member/dashboard"
        element={
          <RoleGate allow={["membre"]}>
            <MaintenanceGate>
              <MemberLayout>
                <MemberDashboard />
              </MemberLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/member/profile"
        element={
          <RoleGate allow={["membre"]}>
            <MaintenanceGate>
              <MemberLayout>
                <MemberProfile />
              </MemberLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/member/contributions"
        element={
          <RoleGate allow={["membre"]}>
            <MaintenanceGate>
              <MemberLayout>
                <MemberContributions />
              </MemberLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/member/cv"
        element={
          <RoleGate allow={["membre"]}>
            <MaintenanceGate>
              <MemberLayout>
                <MemberCV />
              </MemberLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />
      <Route
        path="/member/stats"
        element={
          <RoleGate allow={["membre"]}>
            <MaintenanceGate>
              <MemberLayout>
                <MemberStats />
              </MemberLayout>
            </MaintenanceGate>
          </RoleGate>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SystemSettingsProvider>
          <SessionTimeoutGuard />
          <ConfirmProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ConfirmProvider>
        </SystemSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
