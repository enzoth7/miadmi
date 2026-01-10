"use client";

import { useEffect, useMemo, useState } from "react";
import EstimacionGeneralView from "./EstimacionGeneralView";
import EstimacionEspecificaView from "./EstimacionEspecificaView";
import {
  DEFAULT_ESTIMATION_MODE,
  fetchEstimationMode,
  getSupabaseSession,
  saveEstimationMode,
} from "../../lib/app-data";

const MODE_KEY = "miadmi:estimacion_mode";

const ESTIM_TOUR_STEPS = [
  {
    id: 1,
    target: "#estim-general-inputs",
    title: "Ajusta tus ingresos y egresos base",
    body: "Aqui es donde definis cuanto ganas y cuanto gastas por mes en las categorias principales. Estos valores son la base de todas tus estimaciones.",
  },
  {
    id: 2,
    target: "#estim-general-proyeccion",
    title: "Como se ve tu mes con estos numeros",
    body: "En esta proyeccion ves como se combinan tus ingresos y egresos estimados. Te ayuda a anticipar si el mes tiende a cerrar mas holgado o mas ajustado.",
  },
  {
    id: 3,
    target: "#estim-mode-toggle",
    title: "Modo simple o avanzado",
    body: "Si queres mas detalle, aca podes cambiar de modo y, con la version premium, ajustar o agregar categorias para que tu estimacion se parezca mas a tu dia a dia.",
  },
  {
    id: 4,
    target: "#estim-specific-adjust",
    title: "Ajustar meses y exportar",
    body: "Con estos botones, las personas con version premium pueden editar mes a mes los valores estimados. Asi pueden planear cambios puntuales en el futuro en lugar de repetir siempre el mismo monto. Todos los usuarios pueden Exportar en CSV",
  },
];

export default function EstimacionPage() {
  const [mode, setMode] = useState(DEFAULT_ESTIMATION_MODE);
  const [session, setSession] = useState({ supabase: null, userId: null });
  const [loadingMode, setLoadingMode] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [modeError, setModeError] = useState("");
  const [showTourEstim, setShowTourEstim] = useState(false);
  const [estimStep, setEstimStep] = useState(1);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const ctx = await getSupabaseSession();
        if (!active) return;
        setSession(ctx);
        let resolved = DEFAULT_ESTIMATION_MODE;
        let hasRemoteMode = false;

        if (ctx.userId && ctx.supabase) {
          try {
            resolved = await fetchEstimationMode(ctx.supabase, ctx.userId);
            hasRemoteMode = true;
          } catch {
            resolved = DEFAULT_ESTIMATION_MODE;
          }
        }

        if (!hasRemoteMode && typeof window !== "undefined") {
          try {
            const stored = window.localStorage.getItem(MODE_KEY);
            if (stored === "general" || stored === "especifica") {
              resolved = stored;
            }
          } catch {
            // ignore storage errors
          }
        }

        if (!active) return;
        setMode(resolved === "especifica" ? "especifica" : "general");
      } finally {
        if (active) setLoadingMode(false);
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loadingMode || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(MODE_KEY, mode);
    } catch {
      // ignore persistence issues
    }
  }, [mode, loadingMode]);

useEffect(() => {
  if (typeof window === "undefined") return;
  const key = "miadmi:tour-estimaciones";

  try {
    const stored = window.localStorage.getItem(key);

    if (!stored) {
      // primera vez que entra a esta pantalla
      window.localStorage.setItem(key, "pending");
    }

    if (window.localStorage.getItem(key) === "pending") {
      setShowTourEstim(true);
      setEstimStep(1);
      window.localStorage.setItem(key, "done");
    }
  } catch {
    // ignore storage issues
  }
}, []);


  const handleModeSelect = async (nextMode) => {
    if (nextMode === mode) return;
    const previousMode = mode;
    setMode(nextMode);
    setModeError("");

    if (session.userId && session.supabase) {
      setSavingMode(true);
      try {
        await saveEstimationMode(session.supabase, session.userId, nextMode);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("miadmi:data-updated"));
        }
      } catch (err) {
        setModeError(err?.message ?? "No se pudo actualizar el modo. Intenta nuevamente.");
        setMode(previousMode);
      } finally {
        setSavingMode(false);
      }
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("miadmi:data-updated"));
    }
  };

  const controls = useMemo(
    () => [
      { id: "general", label: "Modo simple" },
      { id: "especifica", label: "Modo avanzado" },
    ],
    []
  );

  const disableToggle = loadingMode || savingMode;
  const activeEstimStep = showTourEstim
    ? ESTIM_TOUR_STEPS.find((step) => step.id === estimStep)
    : null;
  const estimTarget = activeEstimStep?.target ?? null;

  const highlightEstimGeneralInputs = estimTarget === "#estim-general-inputs";
  const highlightEstimGeneralProyeccion = estimTarget === "#estim-general-proyeccion";
  const highlightEstimModeToggle = estimTarget === "#estim-mode-toggle";
  const highlightEstimSpecificAdjust = estimTarget === "#estim-specific-adjust";

  useEffect(() => {
    if (!showTourEstim || !estimTarget) return;
    const el = document.querySelector(estimTarget);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showTourEstim, estimTarget]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Planifica tu mes</h1>
          <p className="mt-2 text-white/70">
            Elegí entre un modo simple o avanzado para trabajar la proyección que mejor se adapta a tu
            nivel de detalle.
          </p>
        </div>

        <div
          id="estim-mode-toggle"
          className={[
            "flex flex-wrap items-center gap-3",
            highlightEstimModeToggle
              ? "relative z-40 rounded-2xl ring-4 ring-emerald-300/80 ring-offset-2 ring-offset-white shadow-xl shadow-emerald-500/40"
              : "",
          ].join(" ")}
        >
          <div className="inline-flex items-center rounded-full bg-white/5 p-1 text-sm font-medium">
            {controls.map((item) => {
              const isActive = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModeSelect(item.id)}
                  disabled={disableToggle}
                  className={[
                    "rounded-full px-4 py-1.5 text-sm font-medium transition",
                    isActive
                      ? "bg-emerald-500 text-slate-900 shadow"
                      : "text-white/70 hover:text-white",
                    disableToggle ? "cursor-not-allowed opacity-70" : "",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          {savingMode ? (
            <span className="text-xs text-white/70">Guardando preferencia...</span>
          ) : null}
          {modeError ? (
            <span className="text-xs text-rose-200">{modeError}</span>
          ) : null}
        </div>
      </header>

      <div>
        {mode === "especifica" ? (
          <EstimacionEspecificaView
            key="advanced"
            modeOverride="especifica"
            hideModeToggle
            highlightSpecificAdjust={highlightEstimSpecificAdjust}
          />
        ) : (
          <EstimacionGeneralView
            key="simple"
            modeOverride="general"
            hideModeToggle
            highlightInputs={highlightEstimGeneralInputs}
            highlightProyeccion={highlightEstimGeneralProyeccion}
          />
        )}
      </div>

      {showTourEstim ? (
        <div className="fixed inset-0 z-30 bg-black/40 pointer-events-none" />
      ) : null}

      {showTourEstim ? (
        <EstimOnboardingTour
          steps={ESTIM_TOUR_STEPS}
          currentStep={estimStep}
          onNext={() => {
            const next = estimStep + 1;
            if (next > ESTIM_TOUR_STEPS.length) {
              setShowTourEstim(false);
              return;
            }

            const nextStep = ESTIM_TOUR_STEPS.find((step) => step.id === next);
            if (nextStep?.target === "#estim-specific-adjust") {
              setMode("especifica");
            }

            setEstimStep(next);
          }}
          onSkip={() => setShowTourEstim(false)}
        />
      ) : null}
    </div>
  );
}

function EstimOnboardingTour({ steps, currentStep, onNext, onSkip }) {
  const step = steps.find((item) => item.id === currentStep);
  if (!step) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:pb-6">
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-4 shadow-2xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Paso {currentStep} de {steps.length}
            </p>
            <h4 className="mt-1 text-sm font-semibold text-white sm:text-base">{step.title}</h4>
            <p className="mt-1 text-xs text-white/80 sm:text-sm">{step.body}</p>
          </div>
          <div className="flex gap-2 sm:items-center sm:self-center">
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800 sm:text-sm"
            >
              Saltar
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-emerald-400 sm:text-sm"
            >
              {currentStep >= steps.length ? "Cerrar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

