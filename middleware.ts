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
  "/paywall",
  "/estima-tu-mes",
  "/herramientas",
];

const PREMIUM_ROUTE_PREFIXES = ["/premium", "/export"];
const ASSET_EXTENSION_REGEX =
  /\.(?:png|jpg|jpeg|gif|svg|ico|txt|xml|json|webmanifest|css|js|map|woff|woff2|ttf|otf)$/i;

function isMobile(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  // iPhone/Android/mobile browsers
  return /Android|iPhone|iPod|Mobile/i.test(ua);
}


function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTE_PREFIXES.some((publicPath) => {
    if (publicPath === "/") return pathname === "/";
    return pathname === publicPath || pathname.startsWith(`${publicPath}/`);
  });
}

function isPremiumRoute(pathname: string) {
  return PREMIUM_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function shouldSkip(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return true;
  }
  return ASSET_EXTENSION_REGEX.test(pathname);
}

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const { pathname } = url;

  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

// ✅ Mobile: si estás logueado y entrás a "/", arrancá en /home (no mostrar landing)
if (pathname === "/" && isMobile(req)) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // si falta config, no hacemos nada raro
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next();
  }

  // importante: usamos una respuesta de redirect para que Supabase pueda setear cookies si hace refresh
  const redirectResponse = NextResponse.redirect(new URL("/home", req.url));

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        redirectResponse.cookies.set(name, value, options);
      },
      remove(name: string, options: any) {
        redirectResponse.cookies.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });

const {
  data: { user },
} = await supabase.auth.getUser();

// si hay user -> redirect a /home (y si hubo refresh, cookies quedan seteadas en redirectResponse)
if (user) return redirectResponse;


  // si NO hay sesión -> dejá la landing
  return NextResponse.next();
}






  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    const loginUrl = new URL("/login", req.url);
    const nextPath = url.search ? `${pathname}${url.search}` : pathname;
    loginUrl.searchParams.set("mode", "login");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
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
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  const loginUrl = new URL("/login", req.url);
  const nextPath = url.search ? `${pathname}${url.search}` : pathname;
  loginUrl.searchParams.set("mode", "login");
  loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl);
}


  if (isPremiumRoute(pathname)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("plan,premium_until")
.eq("id", user.id)
      .maybeSingle();

    const plan = error ? "free" : data?.plan || "free";
    const premiumUntil = error ? null : data?.premium_until ?? null;
  const isPremium =
  plan === "premium" &&
  premiumUntil &&
  new Date(premiumUntil).getTime() > Date.now();


    if (!isPremium) {
      const paywallUrl = new URL("/paywall", req.url);
      return NextResponse.redirect(paywallUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)"],
};

// Tests manuales sugeridos:
// 1) Incognito -> /estimacion => redirect login
// 2) Incognito -> / => ok
// 3) Logueado free -> /estimacion => ok
// 4) Logueado free -> /premium/export => paywall
// 5) Logueado premium -> /premium/export => ok
// 6) /api/* sigue funcionando sin middleware
