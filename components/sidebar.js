"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Home,
  Calculator,
  ListChecks,
  Wallet,
  ClipboardList,
  Target,
  User,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

const navigationItems = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/estimacion-general", label: "Estimación general", icon: Calculator },
  {
    href: "/estimacion-especifica",
    label: "Estimación específica",
    icon: ListChecks,
    children: [
      { href: "/egresos-estimables", label: "Egresos estimables", icon: Wallet },
    ],
  },
  { href: "/control-mensual", label: "Control mensual", icon: ClipboardList },
  { href: "/objetivos-logros", label: "Objetivos y logros", icon: Target },
  { href: "/perfil", label: "Perfil", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();

  const collapsibleEntries = useMemo(
    () =>
      navigationItems.filter(
        (item) => Array.isArray(item.children) && item.children.length > 0
      ),
    []
  );

  const [openSections, setOpenSections] = useState(() => {
    const initial = {};
    collapsibleEntries.forEach((item) => {
      initial[item.href] =
        item.children?.some((child) => pathname?.startsWith(child.href)) ?? false;
    });
    return initial;
  });

  useEffect(() => {
    setOpenSections((prev) => {
      let changed = false;
      const next = { ...prev };

      collapsibleEntries.forEach((item) => {
        const shouldBeOpen =
          item.children?.some((child) => pathname?.startsWith(child.href)) ?? false;
        if (shouldBeOpen && !next[item.href]) {
          next[item.href] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [pathname, collapsibleEntries]);

  const toggleSection = (href) => {
    setOpenSections((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  return (
    <aside className="fixed left-0 top-14 h-[calc(100vh-56px)] w-60 overflow-y-auto border-r border-white/10 bg-[#0b1e3a] p-4">
      <nav className="flex flex-col gap-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isParentActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const isOpen = item.children ? openSections[item.href] : false;

          if (!item.children?.length) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-2 rounded px-3 py-2 transition",
                  isParentActive ? "bg-white/15" : "hover:bg-white/10",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <div key={item.href} className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Link
                  href={item.href}
                  className={[
                    "flex flex-1 items-center gap-2 rounded px-3 py-2 transition",
                    isParentActive ? "bg-white/15" : "hover:bg-white/10",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleSection(item.href)}
                  className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/10"
                  aria-label={isOpen ? "Cerrar sección" : "Abrir sección"}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
              {isOpen && (
                <div className="ml-6 flex flex-col gap-1 border-l border-white/10 pl-3">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isActive =
                      pathname === child.href ||
                      pathname?.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={[
                          "flex items-center gap-2 rounded px-3 py-2 text-sm transition",
                          isActive ? "bg-white/15" : "hover:bg-white/10",
                        ].join(" ")}
                      >
                        <ChildIcon className="h-4 w-4" />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
