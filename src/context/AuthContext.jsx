import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);
const SESSION_TIMEOUT_MS = 5000;
const ROLE_TIMEOUT_MS = 7000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)),
  ]);
}

function extractRoleNames(data) {
  const mappings = Array.isArray(data?.user_roles) ? data.user_roles : [];
  return mappings
    .map((item) => {
      const roleNode = item?.roles;
      if (Array.isArray(roleNode)) return roleNode[0]?.name;
      return roleNode?.name;
    })
    .filter(Boolean)
    .map((name) => name.toString().trim().toLowerCase());
}

function resolveRole(data) {
  const roleNames = extractRoleNames(data);
  if (roleNames.includes("admin")) return "admin";
  if (roleNames.includes("membre")) return "membre";
  return null;
}

async function resolveRoleWithFallback(userData) {
  const nested = resolveRole(userData);
  if (nested) return nested;

  const userId = userData?.id;
  if (!userId) return null;

  const { data: roleRows, error } = await withTimeout(
    supabase
      .from("user_roles")
      .select(`
        roles ( name )
      `)
      .eq("user_id", userId),
    ROLE_TIMEOUT_MS,
    "role_fallback_query",
  );

  if (error) return null;

  const roleNames = (roleRows || [])
    .map((row) => {
      const node = row?.roles;
      if (Array.isArray(node)) return node[0]?.name;
      return node?.name;
    })
    .filter(Boolean)
    .map((name) => name.toString().trim().toLowerCase());

  if (roleNames.includes("admin")) return "admin";
  if (roleNames.includes("membre")) return "membre";
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const inFlightRef = useRef(null);
  const mountedRef = useRef(true);

  const setStateSafe = useCallback((nextUser, nextRole) => {
    if (!mountedRef.current) return;
    setUser(nextUser);
    setRole(nextRole);
    if (nextRole) localStorage.setItem("role", nextRole);
    else localStorage.removeItem("role");
  }, []);

  const loadAuthState = useCallback(
    async (sessionUserFromEvent = undefined, options = {}) => {
      const { showLoader = false } = options;
      if (inFlightRef.current) return inFlightRef.current;

      const task = (async () => {
        try {
          if (mountedRef.current && showLoader) {
            setLoading(true);
            setError(null);
          }

          let sessionUser = sessionUserFromEvent;
          if (sessionUser === undefined) {
            const { data, error: sessionError } = await withTimeout(
              supabase.auth.getSession(),
              SESSION_TIMEOUT_MS,
              "auth_getSession",
            );
            if (sessionError) throw sessionError;
            sessionUser = data?.session?.user ?? null;
          }

          if (!sessionUser) {
            setStateSafe(null, null);
            return;
          }

          const localRole = localStorage.getItem("role");
          setStateSafe(sessionUser, localRole || "membre");

          const { data: userData, error: roleError } = await withTimeout(
            supabase
              .from("users")
              .select(`
                id,
                user_roles (
                  roles ( name )
                )
              `)
              .eq("auth_id", sessionUser.id)
              .maybeSingle(),
            ROLE_TIMEOUT_MS,
            "role_query",
          );

          if (roleError || !userData) {
            return;
          }

          const resolvedRole = await resolveRoleWithFallback(userData);
          setStateSafe(sessionUser, resolvedRole || localRole || "membre");
        } catch (err) {
          console.error("[AUTH] loadAuthState:", err);
          if (mountedRef.current) {
            setError(err.message || "Erreur d'authentification");
          }
        } finally {
          inFlightRef.current = null;
          if (mountedRef.current) {
            setLoading(false);
          }
        }
      })();

      inFlightRef.current = task;
      return task;
    },
    [setStateSafe],
  );

  useEffect(() => {
    mountedRef.current = true;
    loadAuthState(undefined, { showLoader: true });

    const hardStop = setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 12000);

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await loadAuthState(session?.user ?? null, { showLoader: false });
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(hardStop);
      authListener.subscription.unsubscribe();
    };
  }, [loadAuthState]);

  const logout = useCallback(async () => {
    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
      const { error: signOutError } = await withTimeout(
        supabase.auth.signOut(),
        SESSION_TIMEOUT_MS,
        "auth_signOut",
      );
      if (signOutError) throw signOutError;
      setStateSafe(null, null);
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Erreur de deconnexion");
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [setStateSafe]);

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      error,
      logout,
      reloadAuth: loadAuthState,
    }),
    [user, role, loading, error, logout, loadAuthState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit etre utilise dans un AuthProvider");
  return context;
}
