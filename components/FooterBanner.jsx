"use client";

import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
  { href: "/contacto", label: "Contacto" },
  { href: "/faq", label: "FAQ" },
  { href: "/politica-de-privacidad", label: "Política de privacidad" },
  { href: "/terminos-condiciones", label: "Términos y Condiciones" },
  { href: "/cookies", label: "Cookies" },
  { href: "/aviso-legal", label: "Aviso legal" },
];

// ✅ Poné acá tus URLs reales
const IG_URL = "https://instagram.com/miadmiuy";
const LINKEDIN_URL = "https://www.linkedin.com/company/miadmi"; // o tu perfil

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4Zm-4.5 3.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm6.1-2.35a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z" />
    </svg>
  );
}

function LinkedInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5ZM.5 23.5h4V7.98h-4V23.5ZM8.5 7.98h3.83v2.12h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.78 2.65 4.78 6.09v9.37h-4v-8.3c0-1.98-.04-4.52-2.75-4.52-2.75 0-3.17 2.15-3.17 4.37v8.45h-4V7.98Z" />
    </svg>
  );
}

export default function FooterBanner() {
  return (
    <footer className="border-t border-white/5 bg-white/5 px-4 py-6 text-sm text-white/80 shadow-inner shadow-black/20 lg:px-8">
      {/* ✅ contenedor relativo para centrar links y “pegar” iconos a la derecha */}
      <div className="mx-auto max-w-5xl">
        <div className="relative flex items-center">
          {/* Links centrados */}
          <div className="flex w-full flex-wrap items-center justify-center gap-4 text-center">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Iconos separados a la derecha */}
          <div className="absolute right-0 hidden items-center gap-2 md:flex">
            <a
              href={IG_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Mi Admi"
              className="inline-flex items-center justify-center rounded-md p-2 text-white/70 transition hover:text-white hover:bg-white/10"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>

            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn de Mi Admi"
              className="inline-flex items-center justify-center rounded-md p-2 text-white/70 transition hover:text-white hover:bg-white/10"
            >
              <LinkedInIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* ✅ en mobile (md para abajo) los iconos van debajo y centrados */}
        <div className="mt-2 flex items-center justify-center gap-2 md:hidden">
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram de Mi Admi"
            className="inline-flex items-center justify-center rounded-md p-2 text-white/70 transition hover:text-white hover:bg-white/10"
          >
            <InstagramIcon className="h-5 w-5" />
          </a>

          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn de Mi Admi"
            className="inline-flex items-center justify-center rounded-md p-2 text-white/70 transition hover:text-white hover:bg-white/10"
          >
            <LinkedInIcon className="h-5 w-5" />
          </a>
        </div>

        <p className="mt-4 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Mi Admi. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}