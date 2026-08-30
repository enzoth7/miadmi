"use client";

import Link from "next/link";
import { BriefcaseBusiness, Calculator, Gift, ShieldCheck } from "lucide-react";
import { PageSurface, StaggerGrid, StaggerItem } from "../../components/financial/FinancialPrimitives";

const tools = [
   {
    id: "salario",
    title: "Cálculo de descuentos del salario",
    description:
      "Calculá rápidamente tu salario proyectado y comparalo contra lo que esperás cobrar.",
    href: "/herramientas/calcular-descuentos-salarios",
    icon: Calculator,
  },
  {
    id: "aguinaldo",
    title: "Cálculo de aguinaldo",
    description:
      "Calculá rápidamente tu aguinaldo proyectado y comparalo contra lo que esperás cobrar.",
    href: "/herramientas/aguinaldo",
    icon: Gift,
  },
  {
    id: "despidoyrenuncia",
    title: "Cálculo de despido y renuncia",
    description:
      "Simulá cuánto te corresponde en caso de despido o renuncia según antigüedad y condiciones laborales.",
    href: "/herramientas/despido-renuncia",
    icon: BriefcaseBusiness,
  },
  {
    id: "seguro",
    title: "Seguro de desempleo (BPS)",
    description:
      "Conocé qué monto podrías recibir por seguro de desempleo y los requisitos vigentes.",
    href: "/herramientas/seguro-desempleo",
    icon: ShieldCheck,
  },
];

export default function HerramientasPage() {
  return (
    <PageSurface>
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">Herramientas Gratuitas</h1>
        <p className="max-w-3xl text-base text-slate-600">
          Calculadoras y simuladores financieros adaptados a la normativa vigente en Uruguay.
        </p>
      </header>

      <StaggerGrid as="section" id="herramientas-grid" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => (
          <StaggerItem key={tool.id} interactive className="h-full">
          <article className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-brand-navy shadow-sm transition-shadow hover:shadow-md">
            <div className="space-y-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-brand-blue"><tool.icon aria-hidden="true" className="h-5 w-5" /></span>
              <h2 className="text-xl font-bold text-brand-navy">{tool.title}</h2>
              <p className="text-sm leading-relaxed text-slate-600">{tool.description}</p>
            </div>
            <div className="mt-6 flex flex-col items-stretch gap-3 border-t border-gray-100 pt-4">
              <Link
                href={tool.href}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-bold text-brand-navy transition-colors hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
              >
                Abrir calculadora
              </Link>
            </div>
          </article>
          </StaggerItem>
        ))}
      </StaggerGrid>
    </div>
    </PageSurface>
  );
}
