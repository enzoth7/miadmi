import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Rutas que requieren premium (podǸs agregar mǭs prefijos despuǸs)
const PROTECTED_PREFIXES = ["/premium", "/export"];

export async function proxy(req: NextRequest) {
  const url = new URL(req.url);
  const { pathname, search } = url;

  console.log("[middleware] incoming", url.toString());

  // ignorar estǭticos y api
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/public") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // si no es ruta protegida, seguir
  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // verificar sesi��n + plan
  const response = NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    const redirectUrl = new URL("/paywall", req.url);
    if (search) redirectUrl.search = search;
    console.log("[middleware] redirect missing env", redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        response.cookies.set(name, value, options);
      },
      remove(name: string, options: any) {
        response.cookies.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // sin sesi��n -> a /login, preservando query
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    if (search) {
      const incoming = new URLSearchParams(search);
      for (const [key, value] of incoming.entries()) {
        loginUrl.searchParams.set(key, value);
      }
    }
    console.log("[middleware] redirect no session", loginUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("plan,premium_until")
    .eq("id", session.user.id)
    .single();

  const plan = error ? "free" : data?.plan || "free";
  const premiumUntil = error ? null : data?.premium_until ?? null;
  const isPremium =
    plan === "premium" &&
    (!premiumUntil || new Date(premiumUntil).getTime() > Date.now());

  if (!isPremium) {
    const paywallUrl = new URL("/paywall", req.url);
    if (search) paywallUrl.search = search;
    console.log("[middleware] redirect not premium", paywallUrl.toString());
    return NextResponse.redirect(paywallUrl);
  }

  return response;
}

export const config = {
  matcher: ["/premium/:path*", "/export/:path*"],
};
