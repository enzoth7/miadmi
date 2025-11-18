import { getAdminSupabase } from "./supabaseAdmin";

export type MessageRecord = {
  id: string;
  text: string;
  user_id: string | null;
  created_at: string | null;
};

function ensureAdmin() {
  try {
    return getAdminSupabase();
  } catch (error) {
    console.error("[messages] failed to init supabase admin client", error);
    throw error;
  }
}

export async function listMessages(): Promise<MessageRecord[]> {
  const admin = ensureAdmin();
  const { data, error } = await admin
    .from("mp_messages")
    .select("id,text,user_id,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[messages] list failed", error);
    throw error;
  }

  return data ?? [];
}

export async function addMessage(params: {
  id: string;
  text: string;
  userId?: string | null;
}): Promise<void> {
  const { id, text, userId = null } = params;
  if (!id) throw new Error("message id is required");
  if (!text) throw new Error("message text is required");

  const admin = ensureAdmin();

  const { data: existing, error: existingError } = await admin
    .from("mp_messages")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    console.error("[messages] check existing failed", existingError, { id });
    throw existingError;
  }

  if (existing) {
    throw new Error("Message already added");
  }

  const payload = {
    id,
    text,
    user_id: userId,
  };

  const { error } = await admin.from("mp_messages").insert(payload);

  if (error) {
    console.error("[messages] add failed", error, { id });
    throw error;
  }
}
