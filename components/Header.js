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
    <header className="hidden md:block py-1">
      <div className="flex flex-wrap items-center justify-center gap-4 lg:flex-nowrap">
        <div className="flex items-center gap-3">
          <BrandLogo />
        </div>

        <div className="flex items-center gap-2">
          <PremiumBadge />
          {!loading && user && !isPremium ? (
            <Link
              href="/paywall"
              className="rounded-full bg-emerald-400 px-4 py-1 text-sm font-semibold text-gray-900 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300"

            >
              Mejorar a Premium
            </Link>
          ) : null}
        </div>

        <nav className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-1 text-base font-semibold text-white/80 lg:justify-end lg:pl-8">
          {navItems.map((item) => {
            const baseItemClasses =
              "inline-flex items-center px-6 py-7 text-sm font-semibold tracking-wide rounded-[2px] transition-colors transition-transform duration-150";

            if (item.menu?.length) {
              const activeClasses = isActive(item)
                ? "bg-white/5 text-white"
                : "text-white/80 hover:text-white hover:bg-white/5 hover:-translate-y-px";
              return (
                <div key={item.id} className="relative group">
                  <Link
                    href={item.href}
                    className={[baseItemClasses, activeClasses].join(" ")}
                  >
                    {item.label}
                  </Link>
                  <div
  className="invisible absolute left-0 top-full z-20 mt-0 min-w-[220px] rounded-[2px]
             border border-white/10 bg-[#050B18] opacity-0 shadow-lg transition
             group-hover:visible group-hover:opacity-100"
>
  {item.menu.map((subItem, index) => {
    if (subItem.action) {
      return (
        <button
          key={`action-${item.id}-${index}`}
          type="button"
          onClick={subItem.action}
          className="block w-full px-4 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
        >
          {subItem.label}
        </button>
      );
    }
    return (
      <Link
        key={subItem.href ?? index}
        href={subItem.href ?? "#"}
        className="block w-full px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
      >
        {subItem.label}
      </Link>
    );
  })}
</div>
                </div>
              );
            }

            const activeClasses = isActive(item)
              ? "bg-white/5 text-white"
              : "text-white/80 hover:text-white hover:bg-white/5 hover:-translate-y-px";
            return (
              <Link
                key={item.id}
                href={item.href}
                className={[baseItemClasses, activeClasses].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

      </div>
    </header>


  </>




);
}
