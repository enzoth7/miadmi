"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "miadmi:tour-herramientas";
const NEXT_TOUR_KEY = "miadmi:tour-herramienta-aguinaldo";
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
    id: "herramientas",
    targetId: "herramientas-grid",
    title: "Todas tus herramientas en un solo lugar",
    body: "Acá encontrás varias herramientas pensadas para el público uruguayo. Cada una está explicada en detalle para ayudarte a calcular cosas como sueldo, aguinaldo, despido, seguro de desempleo e inversiones según tu caso.",
  },
];

type Props = {
  onClose: () => void;
};

export function HerramientasOnboardingTour({ onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
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
        window.localStorage.setItem(NEXT_TOUR_KEY, "pending");
      } catch {
        // ignore
      }
    }
    onClose();
    router.push("/herramientas/aguinaldo");
  };

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, "done");
      } catch {
        // ignore
      }
    }
    onClose();
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
                onClick={finishTour}
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
