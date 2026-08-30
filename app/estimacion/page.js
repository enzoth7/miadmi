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
import { PageSurface, Reveal } from "../../components/financial/FinancialPrimitives";

const MODE_KEY = "miadmi:estimacion_mode";

export default function EstimacionPage() {
  const [mode, setMode] = useState(DEFAULT_ESTIMATION_MODE);
  const [session, setSession] = useState({ supabase: null, userId: null });
  const [loadingMode, setLoadingMode] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [modeError, setModeError] = useState("");

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
  return (
    <PageSurface>
      <div className="space-y-7">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Estimaciones
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Elegí cuánto detalle necesitás para organizar tus ingresos, egresos y proyección de los
              próximos meses.
            </p>
          </div>

          <Reveal className="w-full lg:w-auto">
          <div id="estim-mode-toggle" className="w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:w-auto">
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
              {controls.map((item) => {
                const isActive = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleModeSelect(item.id)}
                    disabled={disableToggle}
                    aria-pressed={isActive}
                    className={[
                      "min-h-11 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2",
                      isActive
                        ? "bg-brand-yellow text-brand-navy shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-slate-950",
                      disableToggle ? "cursor-not-allowed opacity-60" : "",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            {savingMode ? (
              <p className="px-2 pt-2 text-xs text-slate-500">Guardando preferencia...</p>
            ) : null}
            {modeError ? (
              <p className="px-2 pt-2 text-xs text-rose-600">{modeError}</p>
            ) : null}
          </div>
          </Reveal>
        </header>

        {mode === "especifica" ? (
          <EstimacionEspecificaView key="advanced" modeOverride="especifica" hideModeToggle />
        ) : (
          <EstimacionGeneralView key="simple" modeOverride="general" hideModeToggle />
        )}
      </div>
    </PageSurface>
  );
}
