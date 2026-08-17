import type { Metadata } from "next";
import Link from "next/link";

export const metadata = {
  title: "Herramientas financieras para Uruguay | Mi Admi",
  description: "Calculadoras simples: aguinaldo, descuentos de sueldo, seguro de desempleo, despido y renuncia y más.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b1e3a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Barra superior con botón Volver al inicio */}
        <div className="mb-6 flex items-center">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-white px-5 py-2 text-xs sm:text-sm font-bold text-black shadow-md transition-all hover:bg-yellow-400 hover:text-black"
          >
            Volver al inicio
          </Link>
        </div>

        {/* Contenido */}
        {children}
      </div>
    </div>
  );
}
