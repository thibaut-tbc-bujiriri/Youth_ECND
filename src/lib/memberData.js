import { supabase } from "./supabase";

export async function getMemberContext() {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!authUser?.id) {
    throw new Error("Session introuvable.");
  }

  const { data: publicUser, error: publicUserError } = await supabase
    .from("users")
    .select("id, auth_id, email, full_name, created_at")
    .eq("auth_id", authUser.id)
    .single();

  if (publicUserError || !publicUser) {
    throw new Error("Profil membre introuvable dans public.users.");
  }

  const { data: jeune } = await supabase
    .from("jeunes")
    .select("*")
    .eq("created_by", publicUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { authUser, publicUser, jeune };
}

export async function saveMemberJeune(publicUserId, payload, jeuneId = null) {
  const cleanPayload = {
    ...payload,
    created_by: publicUserId,
  };

  if (jeuneId) {
    const { data, error } = await supabase
      .from("jeunes")
      .update(cleanPayload)
      .eq("id", jeuneId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("jeunes")
    .insert([cleanPayload])
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getMemberContributions(jeuneId) {
  if (!jeuneId) return [];

  const { data, error } = await supabase
    .from("contributions")
    .select("*")
    .eq("jeune_id", jeuneId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data || [];
}
