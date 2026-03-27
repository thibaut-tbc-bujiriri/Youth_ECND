import { supabase } from "./supabase";

let cachedActor = null;
let cacheUntil = 0;
const ACTOR_CACHE_MS = 60 * 1000;
let cachedClientMeta = null;
let clientMetaCacheUntil = 0;
const CLIENT_META_CACHE_MS = 5 * 60 * 1000;

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

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

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

  const { data: userRow } = await supabase
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

  cachedActor = {
    actor_auth_id: authUser.id,
    actor_user_id: userRow?.id || null,
    actor_email: userRow?.email || authUser.email || null,
    actor_role: resolveRoleFromUserRow(userRow),
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
  const actionMap = [
    { keys: ["DELETE", "REMOVE", "SUPPR"], value: "DELETE" },
    { keys: ["UPDATE", "EDIT", "MODIF"], value: "UPDATE" },
    { keys: ["CREATE", "INSERT", "ADD", "AJOUT", "UPLOAD"], value: "INSERT" },
  ];
  const normalizedAction =
    actionMap.find((item) => item.keys.some((key) => rawAction.includes(key)))?.value || null;
  if (!normalizedAction) return;

  try {
    const actor = await getCurrentActor();
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
