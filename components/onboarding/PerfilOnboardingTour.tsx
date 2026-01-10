"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "miadmi:tour-perfil";
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
    id: "header",
    targetId: "perfil-header",
    title: "Tu perfil, configuración y suscripciones",
    body: "Acá ves tus datos personales y los accesos rápidos para ajustar cómo usás la app. Desde Configuración podés actualizar información de tu cuenta, y en Suscripciones gestionás tu plan activo.",
  },
  {
    id: "balance",
    targetId: "perfil-balance-card",
    title: "Resumen de tu mes según el modo activo",
    body: "Este recuadro muestra cómo viene tu mes según el modo de estimación que tengas activado. Es una vista rápida para saber si vas quedando en positivo y seguirle el pulso al balance mensual.",
  },
  {
    id: "historial",
    targetId: "perfil-historial-section",
    title: "Historial de meses anteriores",
    body: "En esta sección podés revisar tu historial mensual. Elegís si querés ver estimaciones, egresos estimables o control mensual, y abrís los meses disponibles para comparar cómo fuiste cambiando.",
  },
];

type Props = {
  onClose: () => void;
};

export function PerfilOnboardingTour({ onClose }: Props) {
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

  const markDone = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, "done");
      } catch {
        // ignore
      }
    }
  };

  const handleSkip = () => {
    markDone();
    onClose();
  };

  const handleNext = () => {
    if (currentIndex >= STEPS.length - 1) {
      markDone();
      onClose();
      return;
    }
    setCurrentIndex((prev) => prev + 1);
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
