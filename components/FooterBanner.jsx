"use client";

import Link from "next/link";
import Image from "next/image";

const FOOTER_LINKS = [
  { href: "/politica-de-privacidad", label: "Política de privacidad" },
  { href: "/terminos-condiciones", label: "Términos y Condiciones" },
];

// No social links needed
export default function FooterBanner() {
  return (
    <footer className="border-t border-white/10 bg-[#0b1e3a] px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-sm text-white/80 md:py-6 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <nav aria-label="Enlaces legales" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1e3a]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-center text-xs text-white/50 sm:text-left">
            &copy; {new Date().getFullYear()} Mi Admi. Todos los derechos reservados.
          </p>
        </div>

        <a
          href="https://www.enzothome.com/"
          target="_blank"
          rel="noreferrer"
          aria-label="Página hecha por Enzo Thome, abrir sitio web"
          className="group inline-flex min-h-11 items-center gap-2 rounded-lg px-1.5 py-1 text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          <Image
            src="/LogoET.png"
            alt="Logo de Enzo Thome"
            width={28}
            height={28}
            className="h-7 w-7 rounded-md object-cover opacity-75"
          />
          <span className="text-xs underline decoration-white/30 underline-offset-4 transition-colors group-hover:text-white/90">
            Página hecha por Enzo Thome
          </span>
        </a>
      </div>
    </footer>
  );
}
