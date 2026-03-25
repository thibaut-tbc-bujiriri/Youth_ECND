import { supabase } from "./supabase";

async function getMainSettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("contact_email, email_notifications")
    .eq("slug", "main")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function queueEmailNotification({ type, subject, message, recipient = null, payload = {} }) {
  try {
    const settings = await getMainSettings();
    if (!settings || !settings.email_notifications) return false;

    const destination = recipient || settings.contact_email || null;
    if (!destination) return false;

    const { error } = await supabase.from("email_notification_queue").insert([
      {
        type,
        recipient: destination,
        subject,
        message,
        payload,
        status: "pending",
      },
    ]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("[EMAIL_QUEUE] skipped:", err?.message || err);
    return false;
  }
}
