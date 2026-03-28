import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);
const AUTH_TIMEOUT_MS = 12000;
const SIGN_IN_TIMEOUT_MS = 20000;
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

function resolveRoleFromUserData(userData) {
  const names = extractRoleNames(userData);
  if (names.includes("admin")) return "admin";
  if (names.includes("membre")) return "membre";
  return null;
}

async function resolveRoleWithFallback(userData) {
  const nestedRole = resolveRoleFromUserData(userData);
  if (nestedRole) return nestedRole;

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
    "auth_role_fallback",
  );

  if (error) return null;
  const names = (roleRows || [])
    .map((row) => {
      const roleNode = row?.roles;
      if (Array.isArray(roleNode)) return roleNode[0]?.name;
      return roleNode?.name;
    })
    .filter(Boolean)
    .map((name) => name.toString().trim().toLowerCase());

  if (names.includes("admin")) return "admin";
  if (names.includes("membre")) return "membre";
  return null;
}

async function fetchRoleFromAuthId(authId) {
  if (!authId) return null;
  const { data: userData, error } = await withTimeout(
    supabase
      .from("users")
      .select(`
        id,
        user_roles (
          roles ( name )
        )
      `)
      .eq("auth_id", authId)
      .maybeSingle(),
    ROLE_TIMEOUT_MS,
    "auth_role_query",
  );
  if (error || !userData) return null;
  return resolveRoleWithFallback(userData);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const syncIdRef = useRef(0);

  const applySession = useCallback(async (nextSession, options = {}) => {
    const { showLoader = false } = options;
    const syncId = ++syncIdRef.current;

    if (mountedRef.current && showLoader) {
      setLoading(true);
      setError(null);
    }

    try {
      const nextUser = nextSession?.user ?? null;
      if (!mountedRef.current || syncId !== syncIdRef.current) return { user: null, role: null };

      setSession(nextSession || null);
      setUser(nextUser);

      if (!nextUser) {
        setRole(null);
        localStorage.removeItem("role");
        return { user: null, role: null };
      }

      const cachedRole = localStorage.getItem("role");
      if (cachedRole) setRole(cachedRole);

      const resolvedRole = await fetchRoleFromAuthId(nextUser.id);
      const finalRole = resolvedRole || cachedRole || "membre";

      if (!mountedRef.current || syncId !== syncIdRef.current) return { user: nextUser, role: finalRole };
      setRole(finalRole);
      localStorage.setItem("role", finalRole);
      return { user: nextUser, role: finalRole };
    } catch (err) {
      if (mountedRef.current && syncId === syncIdRef.current) {
        setError(err?.message || "Erreur d'authentification");
      }
      return { user: nextSession?.user ?? null, role: localStorage.getItem("role") || null };
    } finally {
      if (mountedRef.current && syncId === syncIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const reloadAuth = useCallback(async (options = {}) => {
    const { showLoader = true } = options;
    if (mountedRef.current && showLoader) {
      setLoading(true);
      setError(null);
    }

    try {
      const { data: sessionData, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        "auth_getSession",
      );
      if (sessionError) throw sessionError;

      let nextSession = sessionData?.session ?? null;
      if (!nextSession) {
        const { data: userData, error: userError } = await withTimeout(
          supabase.auth.getUser(),
          AUTH_TIMEOUT_MS,
          "auth_getUser",
        );
        if (userError) throw userError;
        if (userData?.user) {
          nextSession = { user: userData.user };
        }
      }
      return applySession(nextSession, { showLoader: false });
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message || "Erreur d'authentification");
        setSession(null);
        setUser(null);
        setRole(null);
      }
      return { user: null, role: null };
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    mountedRef.current = true;
    reloadAuth({ showLoader: true });

    const { data: authSubscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      await applySession(nextSession, { showLoader: false });
    });

    return () => {
      mountedRef.current = false;
      authSubscription.subscription.unsubscribe();
    };
  }, [applySession, reloadAuth]);

  const signIn = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        SIGN_IN_TIMEOUT_MS,
        "auth_signInWithPassword",
      );
      if (signInError) throw signInError;

      let nextSession = data?.session ?? null;
      if (!nextSession) {
        const { data: sessionData, error: sessionError } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          "auth_post_signin_getSession",
        );
        if (sessionError) throw sessionError;
        nextSession = sessionData?.session ?? null;
      }

      const resolved = await applySession(nextSession, { showLoader: false });
      return resolved;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await withTimeout(
        supabase.auth.signOut(),
        AUTH_TIMEOUT_MS,
        "auth_signOut",
      );
      if (signOutError) throw signOutError;
      await applySession(null, { showLoader: false });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applySession]);

  const value = useMemo(
    () => ({
      session,
      user,
      role,
      loading,
      error,
      signIn,
      logout,
      reloadAuth,
    }),
    [session, user, role, loading, error, signIn, logout, reloadAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit etre utilise dans un AuthProvider");
  return context;
}
