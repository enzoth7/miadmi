import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTE_PREFIXES = [
  "/",
  "/login",
  "/como-funciona",
  "/sobre-nosotros",
  "/contacto",
  "/terminos-condiciones",
  "/politica-de-privacidad",
  "/status",
  "/aviso-legal",
  "/cookies",
  "/faq",
  "/bloqueos",
];

const PREMIUM_ROUTE_PREFIXES = ["/premium", "/export"];

const ASSET_EXTENSION_REGEX =
  /\.(?:png|jpg|jpeg|gif|svg|ico|txt|xml|json|webmanifest|css|js|map|woff|woff2|ttf|otf)$/i;

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTE_PREFIXES.some((publicPath) => {
    if (publicPath === "/") {
      return pathname === "/";
    }
    return pathname === publicPath || pathname.startsWith(`${publicPath}/`);
  });
}

function requiresPremium(pathname: string) {
  return PREMIUM_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function shouldSkip(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/public") ||
    pathname === "/favicon.ico" ||
    ASSET_EXTENSION_REGEX.test(pathname)
  );
}

export async function proxy(req: NextRequest) {
  const url = new URL(req.url);
  const { pathname } = url;

  if (shouldSkip(pathname) || isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("mode", "login");
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

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
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("mode", "login");
    const search = req.nextUrl.search;
    const redirectTo = `${pathname}${search ?? ""}`;
    loginUrl.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(loginUrl);
  }

  if (requiresPremium(pathname)) {
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
      const paywallUrl = req.nextUrl.clone();
      paywallUrl.pathname = "/paywall";
      return NextResponse.redirect(paywallUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
