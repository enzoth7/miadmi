"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PremiumBadge from "./PremiumBadge";
import { useSessionInfo } from "./SessionProvider";
import { supabaseBrowser } from "../lib/supabaseBrowser";
import BrandLogo from "./BrandLogo";
import { Home, CalendarRange, Calculator, User } from "lucide-react";


export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, plan, premiumUntil, refresh } = useSessionInfo();

  const isPremium =
    plan === "premium" &&
    (!premiumUntil || new Date(premiumUntil).getTime() > Date.now());

  async function handleSignOut() {
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      await fetch("/api/signout", { method: "POST" });
      await refresh();
      router.push("/login?mode=login");
    } catch (err) {
      console.error("Sign out failed", err);
    }
  }

  const paywallMenuItem = {
    href: "/paywall",
    label: "SUSCRIPCIONES",
  }; // Abre el paywall

  const navItems = [
    { id: "home", href: "/home", label: "INICIO" },
    {
      id: "estimacion",
      href: "/estimacion",
      label: "ESTIMACIONES",
      menu: [
        { href: "/estimacion/egresos-estimables", label: "EGRESOS ESTIMABLES" },
        { href: "/estimacion/ahorros", label: "AHORROS" },
      ],
    },
    {
      id: "control-mensual",
      href: "/control-mensual",
      label: "CONTROL MENSUAL",
    },
    {
      id: "objetivos-logros",
      href: "/objetivos-logros",
      label: "OBJETIVOS Y LOGROS",
    },
    {
      id: "herramientas",
      href: "/herramientas",
      label: "HERRAMIENTAS",
      menu: [
        { label: "DESCUENTOS DEL SALARIO", href: "/herramientas/calcular-descuentos-salarios" },
        { label: "AGUINALDO", href: "/herramientas/aguinaldo" },
        { label: "DESPIDO Y RENUNCIA", href: "/herramientas/despido-renuncia" },
        { label: "SEGURO DE DESEMPLEO", href: "/herramientas/seguro-desempleo" },
        { label: "INVERSIONES", href: "/herramientas/inversiones" },
      ],
    },
    {
      id: "perfil",
      href: "/perfil",
      label: "PERFIL",
      menu: user
        ? [paywallMenuItem, { label: "CERRAR SESIÓN", action: handleSignOut }]
        : [paywallMenuItem, { href: "/login?mode=login", label: "Iniciar sesion" }],
    },
  ];

  const isActive = (item) => {
    if (item.href && pathname?.startsWith(item.href)) return true;
    return item.menu?.some(
      (child) => child.href && pathname?.startsWith(child.href)
    );
  };

  const navLinkBase =
    "inline-flex items-center border-b-2 border-transparent px-3 py-2 text-sm font-semibold uppercase tracking-wide transition";

  const renderDropdownItem = (child, index) => {
    const baseClass = [
      "block w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition",
      child.primary ? "bg-white/5 text-white" : "text-white/80 hover:bg-white/10",
    ].join(" ");

    if (child.action) {
      return (
        <button
          key={`action-${index}`}
          type="button"
          onClick={child.action}
          className={baseClass}
        >
          {child.label}
        </button>
      );
    }

    return (
      <Link key={child.href ?? index} href={child.href ?? "#"} className={baseClass}>
        {child.label}
      </Link>
    );
  };

  return (
    <>
    <header className="hidden md:block w-full">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 text-[#0b1e3a]">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-9 sm:h-10" />
        </div>

        <nav className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider lg:justify-center">
          {navItems.map((item) => {
            if (item.menu?.length) {
              return (
                <div key={item.id} className="relative group">
                  <Link href={item.href} className="px-3 py-1.5 text-[#0b1e3a] hover:text-blue-700 transition-colors">
                    {item.label}
                  </Link>
                  <div className="invisible absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-xl border border-gray-200 bg-white p-1.5 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
                    {item.menu.map((subItem, index) => {
                      if (subItem.action) {
                        return (
                          <button key={index} type="button" onClick={subItem.action} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-[#0b1e3a] hover:bg-gray-100 transition-colors">
                            {subItem.label}
                          </button>
                        );
                      }
                      return (
                        <Link key={index} href={subItem.href ?? "#"} className="block w-full rounded-lg px-3 py-2 text-xs font-medium text-[#0b1e3a] hover:bg-gray-100 transition-colors">
                          {subItem.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return (
              <Link key={item.id} href={item.href} className="px-3 py-1.5 text-[#0b1e3a] hover:text-blue-700 transition-colors">
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <PremiumBadge />
          {!loading && user && !isPremium && (
            <Link href="/paywall" className="rounded-full bg-[#FACC15] px-4 py-1.5 text-xs font-bold text-[#0b1e3a] hover:bg-yellow-300 transition-colors shadow-sm">
              Mejorar a Premium
            </Link>
          )}
        </div>
      </div>
    </header>


  </>




);
}
