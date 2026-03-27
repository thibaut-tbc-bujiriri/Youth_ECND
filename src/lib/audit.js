import { supabase } from "./supabase";

let cachedActor = null;
let cacheUntil = 0;
const ACTOR_CACHE_MS = 60 * 1000;

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
    const resolvedEntityId = entity_id ?? entityId ?? null;
    const payload = {
      ...actor,
      action: normalizedAction,
      entity,
      entity_id: resolvedEntityId ? String(resolvedEntityId) : null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      details: {
        original_action: rawAction,
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
