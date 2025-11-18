import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient<any, any, any>;

let adminClient: AdminClient | null = null;

export function getAdminSupabase(): AdminClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin configuration");
  }

  adminClient = createClient<any, any, any>(url, serviceKey, {
    auth: { persistSession: false },
  });

  return adminClient;
}
