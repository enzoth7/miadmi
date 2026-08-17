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
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Herramientas Gratuitas</h1>
        <p className="text-base text-gray-300">
          Calculadoras y simuladores financieros adaptados a la normativa vigente en Uruguay.
        </p>
      </header>

      <section id="herramientas-grid" className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="group flex h-full flex-col justify-between rounded-3xl bg-white p-7 text-[#0b1e3a] shadow-xl border border-gray-100 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-[#0b1e3a]">{tool.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{tool.description}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <Link
                href={tool.href}
                className="inline-flex items-center justify-center rounded-xl bg-[#FACC15] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#0b1e3a] hover:bg-yellow-400 transition-all shadow-sm"
              >
                Abrir calculadora
              </Link>
              <span className="text-xs font-semibold text-gray-400">Uruguay 🇺🇾</span>
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
