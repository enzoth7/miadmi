"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ESTIMATION_MODE,
  fetchEstimacionEspecifica,
  fetchEstimacionGeneral,
  fetchEstimablesGrouped,
  fetchEstimationMode,
  getSupabaseSession,
  type EstimacionEspecifica,
  type EstimacionGeneral,
  type EstimablesGrouped,
} from "../../../lib/app-data";
import { buildDashboardSummary, type DashboardSummary } from "../../../lib/summary";
import { LS_ESPECIFICA, LS_ESTIMABLES } from "../especifica/constants";
import { AhorrosOnboardingTour } from "../../../components/onboarding/AhorrosOnboardingTour";

const LS_GENERAL = "miadmi:estimacion_general";
const MODE_KEY = "miadmi:estimacion_mode";

const safeParseNumber = (value: unknown): number => {
  const numeric = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
};

const readGeneralFromStorage = (): EstimacionGeneral | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_GENERAL);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const egresos = Array.isArray((parsed as any)?.egresos)
      ? ((parsed as any).egresos as Array<any>).map((item) => ({
          id: item?.id,
          nombre: item?.nombre ?? "",
          monto: safeParseNumber(item?.monto),
        }))
      : [];
    return {
      id: (parsed as any)?.id ?? null,
      sueldos: safeParseNumber((parsed as any)?.sueldos),
      otrosIngresos: safeParseNumber((parsed as any)?.otrosIngresos),
      ahorroDeseado: safeParseNumber(
        (parsed as any)?.ahorroDeseado ?? (parsed as any)?.ahorro
      ),
      saldoInicial: safeParseNumber((parsed as any)?.saldoInicial),
      egresos,
    };
  } catch {
    return null;
  }
};

const readEspecificaFromStorage = (): EstimacionEspecifica | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_ESPECIFICA);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      id: (parsed as any)?.id ?? null,
      ingresos: (parsed as any)?.ingresos ?? {},
      egresos: (parsed as any)?.egresos ?? {},
    };
  } catch {
    return null;
  }
};

const readEstimablesFromStorage = (): EstimablesGrouped | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_ESTIMABLES);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      prestamos: Array.isArray((parsed as any)?.prestamos)
        ? ((parsed as any).prestamos as Array<any>)
        : [],
      tarjetas: Array.isArray((parsed as any)?.tarjetas)
        ? ((parsed as any).tarjetas as Array<any>)
        : [],
      compras: Array.isArray((parsed as any)?.compras)
        ? ((parsed as any).compras as Array<any>)
        : [],
    };
  } catch {
    return null;
  }
};

const hasAnyEstimaciones = (
  general: EstimacionGeneral | null,
  especifica: EstimacionEspecifica | null,
  estimables: EstimablesGrouped | null
): boolean => {
  if (general) return true;
  if (especifica) return true;
  return Boolean(
    estimables &&
      ((Array.isArray(estimables.prestamos) && estimables.prestamos.length > 0) ||
        (Array.isArray(estimables.tarjetas) && estimables.tarjetas.length > 0) ||
        (Array.isArray(estimables.compras) && estimables.compras.length > 0))
  );
};

export default function AhorrosPage() {
  const [ahorroActual, setAhorroActual] = useState("");
  const [ahorroActualUsd, setAhorroActualUsd] = useState("");
  const [tipoCambio, setTipoCambio] = useState("40");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [hasEstimacionesData, setHasEstimacionesData] = useState(false);
  const [loadingEstimaciones, setLoadingEstimaciones] = useState(true);
  const [showTourAhorros, setShowTourAhorros] = useState(false);

  useEffect(() => {
    let active = true;

    const loadEstimaciones = async () => {
      setLoadingEstimaciones(true);
      try {
        const { supabase, userId } = await getSupabaseSession();
        let general: EstimacionGeneral | null = null;
        let especifica: EstimacionEspecifica | null = null;
        let estimables: EstimablesGrouped | null = null;
        let mode = DEFAULT_ESTIMATION_MODE;
        let hasRemoteMode = false;

        if (userId && supabase) {
          try {
            general = await fetchEstimacionGeneral(supabase, userId);
          } catch {
            general = null;
          }
          try {
            especifica = await fetchEstimacionEspecifica(supabase, userId);
          } catch {
            especifica = null;
          }
          try {
            estimables = await fetchEstimablesGrouped(supabase, userId);
          } catch {
            estimables = null;
          }
          try {
            mode = await fetchEstimationMode(supabase, userId);
            hasRemoteMode = true;
          } catch {
            mode = DEFAULT_ESTIMATION_MODE;
          }
        }

        if (typeof window !== "undefined") {
          if (!general) general = readGeneralFromStorage();
          if (!especifica) especifica = readEspecificaFromStorage();
          if (!estimables) estimables = readEstimablesFromStorage();
          if (!hasRemoteMode) {
            try {
              const stored = window.localStorage.getItem(MODE_KEY);
              if (stored === "general" || stored === "especifica") {
                mode = stored;
              }
            } catch {
              // ignore storage errors
            }
          }
        }

        const nextSummary = buildDashboardSummary({
          general: general ?? undefined,
          especifica: especifica ?? undefined,
          estimables: estimables ?? undefined,
          activeMode: mode ?? DEFAULT_ESTIMATION_MODE,
        });

        if (!active) return;
        setSummary(nextSummary);
        setHasEstimacionesData(hasAnyEstimaciones(general, especifica, estimables));
      } catch {
        if (!active) return;
        setSummary(null);
        setHasEstimacionesData(false);
      } finally {
        if (active) setLoadingEstimaciones(false);
      }
    };

    loadEstimaciones();
    return () => {
      active = false;
    };
  }, []);

useEffect(() => {
  if (typeof window === "undefined") return;

  const key = "miadmi:tour-ahorros";

  try {
    const stored = window.localStorage.getItem(key);

    if (!stored) {
      // primera vez que entra
      window.localStorage.setItem(key, "pending");
    }

    if (window.localStorage.getItem(key) === "pending") {
      setShowTourAhorros(true);
      window.localStorage.setItem(key, "done");
    }
  } catch {
    // ignore storage issues
  }
}, []);


  const ahorroActualNum = useMemo(() => safeParseNumber(ahorroActual), [ahorroActual]);
  const ahorroActualUsdNum = useMemo(() => safeParseNumber(ahorroActualUsd), [ahorroActualUsd]);
  const tipoCambioNum = useMemo(() => safeParseNumber(tipoCambio), [tipoCambio]);

  const capacidadMensual = useMemo(() => {
    const value = summary?.totals?.resultado;
    return Number.isFinite(value) ? Number(value) : 0;
  }, [summary]);
  const debugData = useMemo(
    () => ({
      totals: {
        ingresos: summary?.totals?.ingresos ?? 0,
        egresos: summary?.totals?.egresos ?? 0,
        egresosFijos: summary?.totals?.egresosFijos ?? 0,
        egresosVariables: summary?.totals?.egresosVariables ?? 0,
        estimables: summary?.estimables?.total ?? 0,
        ahorroDeseado: summary?.general?.ahorroDeseado ?? 0,
        resultado: summary?.totals?.resultado ?? 0,
        capacidadMensual: summary?.totals?.capacidadMensual ?? 0,
        saldoProyectado: summary?.totals?.saldoProyectado ?? 0,
      },
      activeMode: summary?.activeMode ?? null,
    }),
    [summary]
  );

  const ahorroProyectado12Meses = capacidadMensual * 12;
  const totalAhorrosEnUyu =
    ahorroActualNum + (tipoCambioNum > 0 ? ahorroActualUsdNum * tipoCambioNum : 0);
  const totalAhorrosEnUsd =
    ahorroActualUsdNum + (tipoCambioNum > 0 ? ahorroActualNum / tipoCambioNum : 0);

  const ahorroProyectado12MesesUsd =
    tipoCambioNum > 0 ? ahorroProyectado12Meses / tipoCambioNum : null;

const hasCapacidadEstimacion = Number.isFinite(summary?.totals?.resultado);
  const canShowEstimacion = Boolean(hasEstimacionesData && hasCapacidadEstimacion);
  const showFallback = !loadingEstimaciones && !canShowEstimacion;

  const capacityDescription =
    capacidadMensual > 0
      ? "Ingresos - egresos segun tu Estimacion. Es el maximo que podrias ahorrar cada mes sin quedar en negativo."
      : "Ingresos - egresos segun tu Estimacion. Si es negativo, estas gastando mas de lo que entra y no es sostenible ahorrar asi.";

  const handleAhorroActualChange = (value: string) => {
    setAhorroActual(value);
  };

  const handleAhorroActualUsdChange = (value: string) => {
    setAhorroActualUsd(value);
  };

  const handleTipoCambioChange = (value: string) => {
    setTipoCambio(value);
  };

  const formatUYU = (value: number) =>
    new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "UYU",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value || 0);

  const monthLabels = useMemo(() => {
    const base = new Date();
    const formatter = new Intl.DateTimeFormat("es-UY", {
      month: "short",
      year: "numeric",
    });
    return Array.from({ length: 12 }, (_, idx) => {
      const d = new Date(base.getFullYear(), base.getMonth() + idx, 1);
      return formatter.format(d);
    });
  }, []);

  const projectionRows = useMemo(() => {
    const rows: { monthIndex: number; saldoUyu: number; saldoUsd: number }[] = [];
    let saldoUyu = totalAhorrosEnUyu;
    let saldoUsd = totalAhorrosEnUsd;
    for (let i = 0; i < 12; i++) {
      const capacidadUsd = tipoCambioNum > 0 ? capacidadMensual / tipoCambioNum : 0;
      saldoUyu += capacidadMensual;
      saldoUsd += capacidadUsd;
      rows.push({
        monthIndex: i,
        saldoUyu,
        saldoUsd,
      });
    }
    return rows;
  }, [totalAhorrosEnUyu, totalAhorrosEnUsd, capacidadMensual, tipoCambioNum]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">Ahorros</h1>
        <p className="text-sm text-white/70">
          Calculamos tu capacidad de ahorro mensual segun la estimacion activa (simple o avanzada).
          Completa tus ahorros actuales y el tipo de cambio para ver el impacto a 12 meses.
        </p>
      </header>

      <div className="space-y-5">
        <section
          id="ahorros-inputs"
          className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5"
        >
          <div>
            <p className="text-sm font-semibold text-white">Ingresa tus datos</p>
            <p className="text-xs text-white/70">
              Ajusta tus ahorros actuales y el tipo de cambio para ver las proyecciones.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-white/70">
                Ahorros actuales (UYU)
              </label>
              <input
                type="number"
                inputMode="decimal"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                placeholder="Ej: 50.000"
                value={ahorroActual}
                onChange={(e) => handleAhorroActualChange(e.target.value)}
              />
              <p className="text-xs text-white/60">
                Es el total que tenes hoy entre cuentas, efectivo, fondos, etc.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-white/70">
                  Tipo de cambio (UYU {">"} USD)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Ej: 40"
                  value={tipoCambio}
                  onChange={(e) => handleTipoCambioChange(e.target.value)}
                />
                <p className="text-xs text-white/60">Solo se usa para la conversion a dolares.</p>
              </div>
              
            </div>
            <div className="space-y-2">
                <label className="block text-xs font-medium text-white/70">
                  Ahorros actuales (USD, opcional)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Ej: 1.000"
                  value={ahorroActualUsd}
                  onChange={(e) => handleAhorroActualUsdChange(e.target.value)}
                />
                <p className="text-xs text-white/60">
                  Los calculos principales quedan en pesos; este valor es para convertir a USD.
                </p>
              </div>
          </div>
        </section>

        <section className="space-y-3">
          <div
            className={[
              "rounded-2xl border px-5 py-4 bg-white/5",
              capacidadMensual > 0 ? "border-emerald-400/60" : "border-rose-400/60",
            ].join(" ")}
          >
            <p className="text-sm font-semibold text-white">Capacidad de ahorro mensual</p>
            <p
              className={[
                "mt-2 text-3xl font-semibold",
                capacidadMensual > 0 ? "text-emerald-200" : "text-rose-200",
              ].join(" ")}
            >
              {canShowEstimacion ? formatUYU(capacidadMensual) : "-"}
            </p>
            {tipoCambioNum > 0 && canShowEstimacion ? (
              <p className="text-xs text-white/70">~ {formatUSD(capacidadMensual / tipoCambioNum)}</p>
            ) : null}
            <p className="mt-2 text-sm text-white/80">{capacityDescription}</p>
          </div>

          <div id="ahorros-totales" className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="text-xs text-white/60">Total ahorros en UYU</p>
              <p className="mt-2 text-xl font-semibold">{formatUYU(totalAhorrosEnUyu)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="text-xs text-white/60">Total ahorros en USD</p>
              <p className="mt-2 text-xl font-semibold">{formatUSD(totalAhorrosEnUsd)}</p>
            </div>
          </div>

          <section className="text-sm text-white/80">
            <p>
              Estos ahorros que ya tenes, sumados a tu capacidad de ahorro mensual, te dan la siguiente
              proyeccion a 12 meses.
            </p>
          </section>

          <section
            id="ahorros-proyeccion"
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg space-y-3"
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Proyeccion de ahorros (12 meses)</p>
                <p className="text-xs text-white/70">
                  Partimos de tus ahorros actuales y sumamos tu capacidad mensual cada mes.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#050B18]">
              <table className="min-w-full text-sm text-right text-white/80">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                  <tr>
                    <th className="px-3 py-2 text-left">Moneda</th>
                    {monthLabels.map((label, idx) => (
                      <th key={idx} className="px-3 py-2">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-white/10">
                    <td className="px-3 py-2 text-left text-xs font-semibold text-white/80">UYU</td>
                    {projectionRows.map((row) => (
                      <td key={`uyu-${row.monthIndex}`} className="px-3 py-2 tabular-nums">
                        {formatUYU(row.saldoUyu)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="px-3 py-2 text-left text-xs font-semibold text-white/80">USD</td>
                    {projectionRows.map((row) => (
                      <td key={`usd-${row.monthIndex}`} className="px-3 py-2 tabular-nums">
                        {formatUSD(row.saldoUsd)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {showFallback ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              <p className="font-semibold text-white">No pudimos calcular tu capacidad de ahorro.</p>
              <p className="mt-1">
                Configura primero tus Estimaciones (ingresos y egresos, en modo simple o avanzado) para
                que Mi Admi pueda estimar tu capacidad mensual.
              </p>
            </div>
          ) : null}
        </section>
        {showTourAhorros ? (
          <AhorrosOnboardingTour onClose={() => setShowTourAhorros(false)} />
        ) : null}
      </div>
    </div>
  );
}
