import { supabase } from "./supabase";

let cachedActor = null;
let cacheUntil = 0;
const ACTOR_CACHE_MS = 60 * 1000;
let cachedClientMeta = null;
let clientMetaCacheUntil = 0;
const CLIENT_META_CACHE_MS = 5 * 60 * 1000;
const AUTH_RETRY_DELAY_MS = 250;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveAuthUserWithRetry() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser?.id) return authUser;

    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user ?? null;
    if (sessionUser?.id) return sessionUser;

    if (attempt < 2) await sleep(AUTH_RETRY_DELAY_MS);
  }
  return null;
}

function resolveRoleFromUserRow(userRow) {
  const roles = Array.isArray(userRow?.user_roles) ? userRow.user_roles : [];
  const names = roles
    .map((item) => {
      const roleNode = item?.roles;
      if (Array.isArray(roleNode)) return roleNode[0]?.name;
      return roleNode?.name;
    })
    .filter(Boolean)
    .map((name) => name.toString().toLowerCase());

  if (names.includes("admin")) return "admin";
  if (names.includes("membre")) return "membre";
  return "unknown";
}

function detectOs(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return "Inconnu";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os")) return "macOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
  if (ua.includes("linux")) return "Linux";
  return "Inconnu";
}

function detectBrowser(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return "Navigateur";
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("chrome/") && !ua.includes("edg/") && !ua.includes("opr/")) return "Chrome";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  return "Navigateur";
}

function detectDeviceType(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return "Desktop";
  if (ua.includes("android") || ua.includes("iphone") || ua.includes("ipad") || ua.includes("mobile")) return "Mobile";
  if (ua.includes("tablet")) return "Tablette";
  return "Desktop";
}

async function resolvePublicIp() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.ip || null;
  } catch {
    return null;
  }
}

async function getClientMeta() {
  const now = Date.now();
  if (cachedClientMeta && now < clientMetaCacheUntil) return cachedClientMeta;

  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
  const clientMeta = {
    ip_address: await resolvePublicIp(),
    device_type: detectDeviceType(userAgent),
    os: detectOs(userAgent),
    browser: detectBrowser(userAgent),
  };

  cachedClientMeta = clientMeta;
  clientMetaCacheUntil = now + CLIENT_META_CACHE_MS;
  return clientMeta;
}

async function getCurrentActor() {
  const now = Date.now();
  if (cachedActor && now < cacheUntil) return cachedActor;

  const authUser = await resolveAuthUserWithRetry();

  if (!authUser?.id) {
    cachedActor = {
      actor_auth_id: null,
      actor_user_id: null,
      actor_email: null,
      actor_role: "anonymous",
    };
    cacheUntil = now + ACTOR_CACHE_MS;
    return cachedActor;
  }

  let userRow = null;
  try {
    const { data } = await supabase
      .from("users")
      .select(`
        id,
        email,
        user_roles (
          roles ( name )
        )
      `)
      .eq("auth_id", authUser.id)
      .maybeSingle();
    userRow = data || null;
  } catch {
    userRow = null;
  }

  cachedActor = {
    actor_auth_id: authUser.id,
    actor_user_id: userRow?.id || null,
    actor_email: userRow?.email || authUser.email || null,
    actor_role: userRow ? resolveRoleFromUserRow(userRow) : "unknown",
  };
  cacheUntil = now + ACTOR_CACHE_MS;
  return cachedActor;
}

export function invalidateAuditActorCache() {
  cachedActor = null;
  cacheUntil = 0;
}

export async function logAuditEvent({
  action,
  entity = null,
  entity_id = null,
  entityId = null,
  details = null,
  success = true,
}) {
  if (!action) return;
  const rawAction = String(action).toUpperCase();
  let normalizedAction = null;
  if (rawAction.includes("LOGIN") || rawAction.includes("CONNECT")) normalizedAction = "LOGIN";
  else if (rawAction.includes("LOGOUT") || rawAction.includes("DISCONNECT") || rawAction.includes("DECONN")) normalizedAction = "LOGOUT";
  else if (rawAction.includes("DELETE") || rawAction.includes("REMOVE") || rawAction.includes("SUPPR")) normalizedAction = "DELETE";
  else if (rawAction.includes("UPDATE") || rawAction.includes("EDIT") || rawAction.includes("MODIF")) normalizedAction = "UPDATE";
  else if (
    rawAction.includes("CREATE") ||
    rawAction.includes("INSERT") ||
    rawAction.includes("ADD") ||
    rawAction.includes("AJOUT") ||
    rawAction.includes("UPLOAD")
  ) normalizedAction = "INSERT";
  if (!normalizedAction) return;

  try {
    const actor = await getCurrentActor();
    if (!actor.actor_auth_id) {
      console.warn("[AUDIT] skipped: no authenticated actor resolved");
      return;
    }
    const clientMeta = await getClientMeta();
    const resolvedEntityId = entity_id ?? entityId ?? null;
    const payload = {
      ...actor,
      action: normalizedAction,
      entity,
      entity_id: resolvedEntityId ? String(resolvedEntityId) : null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      details: {
        original_action: rawAction,
        ip_address: clientMeta.ip_address,
        device_type: clientMeta.device_type,
        os: clientMeta.os,
        browser: clientMeta.browser,
        ...(details || {}),
      },
      success: Boolean(success),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    };

    const { error } = await supabase.from("audit_logs").insert([payload]);
    if (error) {
      // Silencieux: l'audit ne doit jamais casser le flux applicatif.
      console.warn("[AUDIT] insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[AUDIT] log failed:", err?.message || err);
  }
}
