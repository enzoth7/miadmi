"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import Header from "./Header";
import FooterBanner from "./FooterBanner";
import MobileTopBar from "./MobileTopBar";
import {
  Home,
  Calculator,
  MoreHorizontal,
  LineChart,
  PiggyBank,
  BadgeDollarSign,
  Gift,
  BriefcaseBusiness,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useSession } from "./SessionProvider";

export default function AppChrome({ children }) {
  const pathname = usePathname() || "/";
  const isLanding = pathname === "/";
  const headerShellClass =
    "sticky top-0 z-30 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-md";

  return (
    <>
      <a href="#contenido-principal" className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg transition focus:translate-y-0">
        Saltar al contenido
      </a>
      <div className="flex min-h-dvh flex-col bg-[#0b1e3a]">
        <div className={headerShellClass}><Header /></div>
        <MobileTopBar />
        <main id="contenido-principal" tabIndex={-1} className={isLanding ? "flex-1 pb-24 md:pb-0" : "flex-1 px-4 py-6 pb-24 md:pb-6 lg:px-8"}>
          <div className={isLanding ? "" : "mx-auto w-full max-w-[1440px]"}>
            {children}
          </div>
        </main>
        <FooterBanner />
      </div>
      <MobileNav pathname={pathname} />
    </>
  );
}

function MobileNav({ pathname }) {
  const [open, setOpen] = useState(false);
  const { status, signOut } = useSession();
  const isActive = (href) => pathname?.startsWith(href);
  const MenuLink = ({ href, label, Icon }) => (
    <Link href={href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/80 hover:bg-white/10">
      <Icon className="h-4 w-4 text-white/70" />
      <span>{label}</span>
    </Link>
  );
  const Item = ({ href, label, Icon, onClick }) => {
    const Comp = href ? Link : "button";
    const props = href ? { href } : { type: "button", onClick };
    return (
      <Comp {...props} aria-label={label} className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition ${href && isActive(href) ? "bg-white/5 text-yellow-400" : "text-white/70 hover:text-white"}`}>
        <Icon className="h-6 w-6" />
        <span className="text-[10px] leading-none">{label}</span>
      </Comp>
    );
  };

  return (
    <>
      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/10 bg-[#050B18]/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <Item href="/home" label="Dashboard" Icon={Home} />
        <Item href="/estimacion" label="Estimar" Icon={LineChart} />
        <Item href="/herramientas" label="Herramientas" Icon={Calculator} />
        <Item label="Más" Icon={MoreHorizontal} onClick={() => setOpen(true)} />
      </nav>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-black/60" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-white/10 bg-[#050B18] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Más herramientas</p>
              <button onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10">Cerrar</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MenuLink href="/estimacion" label="Estimar mi mes" Icon={Sparkles} />
              <MenuLink href="/estimacion/ahorros" label="Ahorros" Icon={PiggyBank} />
              <MenuLink href="/herramientas/calcular-descuentos-salarios" label="Sueldo" Icon={BadgeDollarSign} />
              <MenuLink href="/herramientas/aguinaldo" label="Aguinaldo" Icon={Gift} />
              <MenuLink href="/herramientas/despido-renuncia" label="Despido y renuncia" Icon={BriefcaseBusiness} />
              <MenuLink href="/herramientas/seguro-desempleo" label="Seguro de desempleo" Icon={ShieldCheck} />
              {status === "authenticated" ? (
                <button
                  type="button"
                  onClick={async () => { await signOut(); setOpen(false); }}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-3 text-sm text-rose-200 hover:bg-rose-500/20"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesión</span>
                </button>
              ) : (
                <MenuLink href="/acceder" label="Acceder" Icon={LogIn} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
