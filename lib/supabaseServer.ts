import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CookieOptions } from "@supabase/ssr";

type ServerClient = SupabaseClient<any, any, any>;

async function createClient(accessToken?: string): Promise<ServerClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing Supabase environment configuration");
  }

  const cookieStore = await cookies();

  return createServerClient<any, any, any>(url, anon, {
    cookies: {
      get(name) {
        if (!cookieStore || typeof (cookieStore as any).get !== "function") {
          return undefined;
        }
        const value = (cookieStore as any).get(name);
        if (!value) return undefined;
        if (typeof value === "string") return value;
        return value?.value;
      },
      set(name, value, options: CookieOptions) {
        if (!cookieStore || typeof (cookieStore as any).set !== "function") {
          return;
        }

        const opts = { sameSite: "lax", ...options };
        try {
          (cookieStore as any).set({ name, value, ...opts });
        } catch {
          (cookieStore as any).set(name, value, opts);
        }
      },
      remove(name, options: CookieOptions) {
        if (!cookieStore || typeof (cookieStore as any).set !== "function") {
          return;
        }

        const opts = { sameSite: "lax", ...options, maxAge: 0 };
        try {
          (cookieStore as any).set({ name, value: "", ...opts });
        } catch {
          (cookieStore as any).set(name, "", opts);
        }
      },
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export async function getServerClient(accessToken?: string): Promise<ServerClient> {
  return createClient(accessToken);
}

export const supabaseServer = getServerClient;
