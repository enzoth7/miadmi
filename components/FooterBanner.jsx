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

// No social links needed
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

        </div>

        <p className="mt-4 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Mi Admi. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}