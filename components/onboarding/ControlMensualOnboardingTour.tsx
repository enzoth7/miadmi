"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "miadmi:tour-control-mensual";
const HIGHLIGHT_CLASSES = [
  "relative",
  "z-40",
  "ring-4",
  "ring-emerald-300/80",
  "ring-offset-2",
  "ring-offset-white",
  "shadow-xl",
  "shadow-emerald-500/40",
];

type OnboardingStep = {
  id: string;
  targetId: string;
  title: string;
  body: string;
};

const STEPS: OnboardingStep[] = [
  {
    id: "conciliacion",
    targetId: "control-conciliacion-card",
    title: "Conciliá todo tu dinero",
    body: "Acá cargás cuánto dinero tenés hoy entre efectivo y tarjetas. La suma se compara con lo que está registrado en Control mensual y te muestra si te sobra o te falta plata, para detectar si hay movimientos sin cargar o diferencias en el día a día.",
  },
  {
    id: "movimientos",
    targetId: "control-movimientos-card",
    title: "Gestioná tus movimientos",
    body: "En este bloque vas agregando todos los movimientos del mes y podés verlos en vista de lista o calendario. A medida que sumás movimientos, se actualiza también la gráfica de arriba para que veas el impacto en tu mes.",
  },
];

type Props = {
  onClose: () => void;
};

export function ControlMensualOnboardingTour({ onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const step = STEPS[currentIndex];

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!step?.targetId) return;
    const element = document.getElementById(step.targetId);
    if (!element) return;
    HIGHLIGHT_CLASSES.forEach((cls) => element.classList.add(cls));
    return () => {
      HIGHLIGHT_CLASSES.forEach((cls) => element.classList.remove(cls));
    };
  }, [step?.targetId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!step?.targetId) return;
    const element = document.getElementById(step.targetId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [step?.targetId]);

  const finishTour = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, "done");
      } catch {
        // ignore storage issues
      }
    }
    onClose();
  };

  const handleNext = () => {
    if (currentIndex >= STEPS.length - 1) {
      finishTour();
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSkip = () => {
    finishTour();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30 pointer-events-none" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:pb-6">
        <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-4 shadow-2xl sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Paso {currentIndex + 1} de {STEPS.length}
              </p>
              <h4 className="mt-1 text-sm font-semibold text-white sm:text-base">
                {step?.title}
              </h4>
              <p className="mt-1 text-xs text-white/80 sm:text-sm">{step?.body}</p>
            </div>
            <div className="flex gap-2 sm:items-center sm:self-center">
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800 sm:text-sm"
              >
                Saltar
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-emerald-400 sm:text-sm"
              >
                {currentIndex >= STEPS.length - 1 ? "Cerrar" : "Siguiente"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
