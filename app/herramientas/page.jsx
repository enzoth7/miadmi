"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HerramientasOnboardingTour } from "../../components/onboarding/HerramientasOnboardingTour";

const tools = [
   {
    id: "salario",
    title: "Cálculo de descuentos del salario",
    description:
      "Calculá rápidamente tu salario proyectado y comparalo contra lo que esperás cobrar.",
    href: "/herramientas/calcular-descuentos-salarios",
  },
  {
    id: "aguinaldo",
    title: "Cálculo de aguinaldo",
    description:
      "Calculá rápidamente tu aguinaldo proyectado y comparalo contra lo que esperás cobrar.",
    href: "/herramientas/aguinaldo",
  },
  {
    id: "despidoyrenuncia",
    title: "Cálculo de despido y renuncia",
    description:
      "Simulá cuánto te corresponde en caso de despido o renuncia según antigüedad y condiciones laborales.",
    href: "/herramientas/despido-renuncia",
  },
  {
    id: "seguro",
    title: "Seguro de desempleo (BPS)",
    description:
      "Conocé qué monto podrías recibir por seguro de desempleo y los requisitos vigentes.",
    href: "/herramientas/seguro-desempleo",
  },
  {
    id: "inversiones",
    title: "Herramienta de inversiones",
    description:
      "Proyectá rendimientos potenciales y analizá escenarios de inversión a tu medida.",
    href: "/herramientas/inversiones",
  },
];

export default function HerramientasPage() {
  const [showTour, setShowTour] = useState(false);

useEffect(() => {
  if (typeof window === "undefined") return;

  const key = "miadmi:tour-herramientas";

  try {
    const stored = window.localStorage.getItem(key);

    if (!stored) {
      // primera vez que entra a Herramientas
      window.localStorage.setItem(key, "pending");
    }

    if (window.localStorage.getItem(key) === "pending") {
      setShowTour(true);
      window.localStorage.setItem(key, "done");
    }
  } catch {
    // ignore storage issues
  }
}, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8 text-white">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">Herramientas</h1>
        <p className="text-base text-white/70">
          Usá estas herramientas para hacer cálculos rápidos y tomar mejores decisiones.
        </p>
      </header>

      <section id="herramientas-grid" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">{tool.title}</h3>
              <p className="text-sm leading-relaxed text-white/70">{tool.description}</p>
            </div>
            <div className="mt-6">
              <Link
                href={tool.href}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200 hover:text-emerald-50"
              >
                Abrir herramienta
                <span aria-hidden="true" className="text-lg leading-none">
                  →
                </span>
              </Link>
            </div>
          </div>
        ))}
      </section>
      {showTour ? (
        <HerramientasOnboardingTour onClose={() => setShowTour(false)} />
      ) : null}
    </div>
  );
}
