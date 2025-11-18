import { createBrowserClient } from "@supabase/ssr";

let _client;
export function supabaseBrowser() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.warn("Supabase env vars faltan (URL/ANON). Revisá .env.local");
  }
  _client = createBrowserClient(url, anon);
  return _client;
}
