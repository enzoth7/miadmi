"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "./BrandLogo";
import { useSession } from "./SessionProvider";

const navItems = [
  { href: "/", label: "INICIO", exact: true },
  { href: "/estima-tu-mes", label: "ESTIMAR MI MES" },
  { href: "/home", label: "DASHBOARD" },
  { href: "/estimacion", label: "ESTIMACIONES", exact: true },
  { href: "/estimacion/ahorros", label: "AHORROS" },
  {
    href: "/herramientas",
    label: "HERRAMIENTAS",
    menu: [
      { href: "/herramientas/calcular-descuentos-salarios", label: "SUELDO" },
      { href: "/herramientas/aguinaldo", label: "AGUINALDO" },
      { href: "/herramientas/despido-renuncia", label: "DESPIDO Y RENUNCIA" },
      { href: "/herramientas/seguro-desempleo", label: "SEGURO DE DESEMPLEO" },
    ],
  },
];

export default function Header() {
  const pathname = usePathname() || "/";
  const { status, signOut } = useSession();

  return (
    <header className="hidden w-full md:block">
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-6 px-4 text-[#0b1e3a] sm:px-6 lg:px-8">
        <BrandLogo className="h-10 shrink-0" />
        <nav aria-label="Navegación principal" className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-0.5 text-[10px] font-semibold tracking-normal lg:gap-1 lg:text-[11px]">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const triggerClassName = [
              "inline-flex min-h-9 cursor-pointer list-none items-center rounded-lg px-1.5 py-1.5 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:px-2 [&::-webkit-details-marker]:hidden",
              isActive ? "bg-slate-100 text-blue-700" : "",
            ].join(" ");

            if (item.menu) {
              return (
                <details key={item.href} className="group relative">
                  <summary className={triggerClassName}>
                    {item.label}
                    <span aria-hidden="true" className="ml-1 text-[9px] transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="invisible absolute left-0 top-full z-40 min-w-60 pt-2 opacity-0 transition group-open:visible group-open:opacity-100 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
                      {[{ href: item.href, label: "TODAS LAS HERRAMIENTAS" }, ...item.menu].map((menuItem) => (
                        <Link
                          key={menuItem.href}
                          href={menuItem.href}
                          className="flex min-h-11 items-center rounded-lg px-3 py-2 text-[11px] text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          {menuItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </details>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={triggerClassName}>
                {item.label}
              </Link>
            );
          })}
          {status === "authenticated" ? (
            <button
              type="button"
              onClick={signOut}
              className="ml-2 inline-flex min-h-9 items-center rounded-lg bg-rose-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              CERRAR SESIÓN
            </button>
          ) : (
            <Link
              href="/acceder"
              className="ml-2 inline-flex min-h-9 items-center rounded-lg bg-black px-4 py-2 text-[11px] font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Acceder
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
