"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Header from "./Header";
import FooterBanner from "./FooterBanner";
import PremiumBlocker from "./PremiumBlocker";
import BrandLogo from "./BrandLogo";
import { useSessionInfo } from "./SessionProvider";
import InactivityGuard from "./InactivityGuard";
import MobileTopBar from "./MobileTopBar";
import {
  Home,
  CalendarRange,
  Calculator,
  Target,
  User,
  MoreHorizontal,
  Wrench,
  LineChart,
  PiggyBank,
  BadgePercent,
  Gift,
  LogOut,
  BriefcaseBusiness,
  ShieldCheck,
  CreditCard,
  TrendingUp,
} from "lucide-react";

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
  "/estima-tu-mes",
  "/herramientas",
];

function isPublicRoute(pathname) {
  return PUBLIC_ROUTE_PREFIXES.some((publicPath) => {
    if (publicPath === "/") return pathname === "/";
    return pathname === publicPath || pathname.startsWith(`${publicPath}/`);
  });
}

export default function AppChrome({ children }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const { user } = useSessionInfo();
  const isLanding = pathname === "/";
  const isPublic = isPublicRoute(pathname);
  const isTools = pathname === "/herramientas" || pathname.startsWith("/herramientas/");
  const showInternalChrome = Boolean(user) && (!isPublic || isLanding || isTools);
  const shouldMountInactivityGuard = Boolean(user) && !isPublic && !isTools;


  const currentPath = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

const headerShellClass =
  "sticky top-0 z-30 md:border-b md:border-white/10 md:bg-[#0b1e3a]/90 md:backdrop-blur";

  const publicHeader = (
    <div className={headerShellClass}>
      <div className="px-4 py-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <BrandLogo />
          <div className="flex items-center gap-3 text-sm font-semibold text-white">
            <Link
              href="/login?mode=login"
              className="text-white/80 transition hover:text-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-full bg-white px-4 py-1.5 text-gray-900 shadow transition hover:bg-white/90"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  const privateHeader = (
    <div className={headerShellClass}>
      <div className="px-4 py-4 lg:px-8">
        <Header />
      </div>
    </div>
  );

  return (
    <>
      <div className="flex min-h-screen flex-col bg-[#0b1e3a]">
        {showInternalChrome ? privateHeader : publicHeader}
        {showInternalChrome ? <MobileTopBar /> : null}


        <main
          className={
            isLanding
              ? "flex-1 pb-24 md:pb-0"
              : "flex-1 px-4 py-6 pb-24 md:pb-6 lg:px-8"
          }
        >
<div
  className={
    isLanding
      ? ""
      : [
          "mx-auto w-full max-w-5xl",
          pathname?.startsWith("/home") ? "lg:max-w-7xl" : "",
        ].join(" ")
  }
>
  {children}
</div>

        </main>

        <FooterBanner />
      </div>

      {showInternalChrome ? (
        <>
          <MobileNav pathname={pathname} user={user} />
          <PremiumBlocker />
        </>
      ) : null}

      {shouldMountInactivityGuard ? (
        <InactivityGuard currentPath={currentPath} />
      ) : null}
    </>
  );
}

function MobileNav({ pathname, user }) {
  const [open, setOpen] = useState(false);

const MenuLink = ({ href, label, Icon }) => (
  <Link
    href={href}
    onClick={() => setOpen(false)}
    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/80 hover:bg-white/10"
  >
    <Icon className="h-4 w-4 text-white/70" />
    <span className="leading-none">{label}</span>
  </Link>
);


  const isActive = (href) => pathname?.startsWith(href);

  const Item = ({ href, label, Icon, onClick }) => {
    const active = href ? isActive(href) : false;
    const Comp = href ? Link : "button";
    const props = href ? { href } : { type: "button", onClick };



    return (
      <Comp
        {...props}
        aria-label={label}
        className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition ${
          active
            ? "bg-white/5 text-emerald-300"
            : "text-white/70 hover:text-white"
        }`}
      >
        <Icon className="h-6 w-6" />
        <span className="text-[10px] leading-none">{label}</span>
      </Comp>
    );
  };

  return (
    <>
<nav className="fixed inset-x-0 bottom-0 z-30 flex md:hidden items-center justify-around border-t border-white/10 bg-[#050B18]/95 backdrop-blur px-2 py-2">
        <Item href="/home" label="Inicio" Icon={Home} />
        <Item href="/estimacion" label="Estimar" Icon={LineChart} />
        <Item href="/control-mensual" label="Control" Icon={CalendarRange} />
        <Item href="/herramientas" label="Herramientas" Icon={Calculator} />
        <Item label="Más" Icon={MoreHorizontal} onClick={() => setOpen(true)} />
      </nav>

      {open ? (
        <div className="fixed inset-0 z-[10000] md:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-white/10 bg-[#050B18] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Menú</p>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1 text-sm text-white/70 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              
              <MenuLink
    href="/estimacion/egresos-estimables"
    label="Egresos estimables"
    Icon={TrendingUp}
  />

            <MenuLink
    href="/estimacion/ahorros"
    label="Ahorros"
    Icon={PiggyBank}
  />


        <MenuLink
    href="/objetivos-logros"
    label="Objetivos y logros"
    Icon={Target}
  />

  <MenuLink href="/perfil" label="Perfil" Icon={User} />


   <MenuLink href="/paywall" label="Suscripciones" Icon={CreditCard} />


            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
