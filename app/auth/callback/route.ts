import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/home";

const redirectWithoutCache = (destination: URL) => {
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectWithoutCache(new URL(next, url.origin));
  }

  const errorUrl = new URL("/acceder", url.origin);
  errorUrl.searchParams.set("error", "oauth_callback");
  return redirectWithoutCache(errorUrl);
}
