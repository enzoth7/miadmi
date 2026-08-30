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
import { PageSurface, ResultPanel, Reveal } from "../../../components/financial/FinancialPrimitives";

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
    <PageSurface>
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">Ahorros</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          Calculamos tu capacidad de ahorro mensual según la estimación activa. Completá tus
          ahorros actuales y el tipo de cambio para ver el impacto a 12 meses.
        </p>

        <div className="mt-5 grid border-y border-slate-200 text-sm sm:grid-cols-2 sm:divide-x sm:divide-slate-200">
          <div className="py-4 sm:pr-6">
            <h2 className="text-sm font-bold text-brand-navy">Ahorros actuales</h2>
            <p className="mt-1 text-xs leading-snug text-gray-600">
              Sumá lo que ya tenés en pesos y dólares para partir de una base real.
            </p>
          </div>
          <div className="border-t border-slate-200 py-4 sm:border-t-0 sm:pl-6">
            <h2 className="text-sm font-bold text-brand-navy">Proyección mensual</h2>
            <p className="mt-1 text-xs leading-snug text-gray-600">
              Usamos el resultado de tu estimación para proyectar los próximos 12 meses.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-5">
        <section
          id="ahorros-inputs"
          className="space-y-5 pt-2"
        >
          <div>
            <h2 className="text-base font-bold text-[#0b1e3a]">Ingresá tus datos</h2>
            <p className="mt-1 text-xs text-gray-600">
              Ajustá tus ahorros actuales y el tipo de cambio para ver las proyecciones.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="ahorro-actual-uyu" className="block text-xs font-bold text-gray-700">
                Ahorros actuales (UYU)
              </label>
              <input
                id="ahorro-actual-uyu"
                type="number"
                inputMode="decimal"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                placeholder="Ej: 50.000"
                value={ahorroActual}
                onChange={(e) => handleAhorroActualChange(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Es el total que tenés hoy entre cuentas, efectivo y fondos.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="ahorro-actual-usd" className="block text-xs font-bold text-gray-700">
                Ahorros actuales (USD, opcional)
              </label>
              <input
                id="ahorro-actual-usd"
                type="number"
                inputMode="decimal"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                placeholder="Ej: 1.000"
                value={ahorroActualUsd}
                onChange={(e) => handleAhorroActualUsdChange(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Este valor se convierte a pesos para calcular el total.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="tipo-cambio" className="block text-xs font-bold text-gray-700">
                Tipo de cambio (UYU {">"} USD)
              </label>
              <input
                id="tipo-cambio"
                type="number"
                inputMode="decimal"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                placeholder="Ej: 40"
                value={tipoCambio}
                onChange={(e) => handleTipoCambioChange(e.target.value)}
              />
              <p className="text-xs text-gray-500">Se usa solamente para la conversión entre monedas.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-2">
          <ResultPanel
            eyebrow="Resultado proyectado"
            className={[
              "p-6",
              capacidadMensual > 0 ? "" : "ring-1 ring-rose-300/50",
            ].join(" ")}
          >
            <p className="mt-5 text-sm font-semibold text-white">Capacidad de ahorro mensual</p>
            <p
              className={[
                "mt-2 text-3xl font-extrabold tabular-nums sm:text-4xl",
                capacidadMensual > 0 ? "text-emerald-300" : "text-rose-300",
              ].join(" ")}
            >
              {canShowEstimacion ? formatUYU(capacidadMensual) : "-"}
            </p>
            {tipoCambioNum > 0 && canShowEstimacion ? (
              <p className="text-xs text-gray-300">~ {formatUSD(capacidadMensual / tipoCambioNum)}</p>
            ) : null}
            <p className="mt-2 max-w-3xl text-sm text-gray-300">{capacityDescription}</p>


          <div id="ahorros-totales" className="mt-6 grid border-y border-white/15 md:grid-cols-2 md:divide-x md:divide-white/15">
            <div className="py-4 md:pr-5">
              <p className="text-xs font-medium text-slate-300">Total ahorros en UYU</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-white">{formatUYU(totalAhorrosEnUyu)}</p>
            </div>

            <div className="border-t border-white/15 py-4 md:border-t-0 md:pl-5">
              <p className="text-xs font-medium text-slate-300">Total ahorros en USD</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-white">{formatUSD(totalAhorrosEnUsd)}</p>
            </div>
          </div>
          </ResultPanel>

          <section className="text-sm text-gray-600">
            <p>
              Tus ahorros actuales, sumados a tu capacidad mensual, dan la siguiente proyección a 12
              meses.
            </p>
          </section>

          <Reveal><section
            id="ahorros-proyeccion"
            className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0b1e3a]">Proyección de ahorros (12 meses)</h2>
                <p className="text-xs text-gray-600">
                  Partimos de tus ahorros actuales y sumamos tu capacidad mensual cada mes.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border-y border-slate-200 bg-white">
              <table className="min-w-full text-right text-sm text-slate-700">
                <thead className="bg-gray-100 text-xs uppercase tracking-wide text-slate-600">
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
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 text-left text-xs font-bold text-[#0b1e3a]">UYU</td>
                    {projectionRows.map((row) => (
                      <td key={`uyu-${row.monthIndex}`} className="px-3 py-2 tabular-nums">
                        {formatUYU(row.saldoUyu)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-gray-200 bg-gray-50/70">
                    <td className="px-3 py-2 text-left text-xs font-bold text-[#0b1e3a]">USD</td>
                    {projectionRows.map((row) => (
                      <td key={`usd-${row.monthIndex}`} className="px-3 py-2 tabular-nums">
                        {formatUSD(row.saldoUsd)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section></Reveal>

          {showFallback ? (
            <div className="rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-brand-navy">
              <p className="font-bold">No pudimos calcular tu capacidad de ahorro.</p>
              <p className="mt-1 text-slate-700">
                Configurá primero tus estimaciones de ingresos y egresos para
                que Mi Admi pueda estimar tu capacidad mensual.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
    </PageSurface>
  );
}
