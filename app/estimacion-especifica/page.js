"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  LS_ESPECIFICA,
  LS_ESTIMABLES,
  MONTH_NAMES,
  ensureMonthArray,
} from "./constants";
import {
  getSupabaseSession,
  fetchEstimacionEspecifica,
  upsertEstimacionEspecifica,
} from "../../lib/app-data";

const manualExpenseCategories = EXPENSE_CATEGORIES.filter((cat) => cat.source !== "estimables");

const INCOME_ORDER = [
  "sueldos",
  "extraordinarios",
  "devolucion",
  "prestamosIngresos",
  "familia",
  "otros",
];
const EXPENSE_ORDER = [
  "super",
  "alquiler",
  "gastosFijos",
  "gym",
  "otrasActividades",
  "salud",
  "transporte",
  "generales",
  "ropa",
  "entretenimiento",
  "viajes",
  "educacion",
  "adquisiciones",
  "reparaciones",
  "prestamos",
  "tarjetas",
];

const orderedIncomeCategories = INCOME_ORDER.map((id) =>
  INCOME_CATEGORIES.find((cat) => cat.id === id)
).filter(Boolean);

const orderedExpenseCategories = EXPENSE_ORDER.map((id) =>
  EXPENSE_CATEGORIES.find((cat) => cat.id === id)
).filter(Boolean);

export default function EstimacionEspecificaPage() {
  const [ingresos, setIngresos] = useState(() => buildEmptyState(INCOME_CATEGORIES));
  const [egresos, setEgresos] = useState(() => buildEmptyState(manualExpenseCategories));
  const [saldoInicial, setSaldoInicial] = useState("");
  const [ahorroMensual, setAhorroMensual] = useState("");
  const [session, setSession] = useState({ supabase: null, userId: null });
  const [recordId, setRecordId] = useState(null);
  const [projection, setProjection] = useState(null);
  const [legacyDetalles, setLegacyDetalles] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [estimablesTotals, setEstimablesTotals] = useState({
    prestamos: 0,
    tarjetas: 0,
    comprasMes: 0,
  });
  const hydratingRef = useRef(false);

  const markDirty = () => {
    if (!loaded || hydratingRef.current) return;
    setDirty(true);
    setSaveError("");
    setSaveSuccess("");
  };

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const clearProjectionOverrides = useCallback((section, id) => {
    setProjection((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      if (section === "ahorro") {
        if (Array.isArray(next.ahorro)) {
          delete next.ahorro;
        } else {
          return prev;
        }
      } else {
        const sectionData = { ...(next[section] ?? {}) };
        if (!Object.prototype.hasOwnProperty.call(sectionData, id)) {
          return prev;
        }
        delete sectionData[id];
        if (Object.keys(sectionData).length > 0) {
          next[section] = sectionData;
        } else {
          delete next[section];
        }
      }
      const hasIngresos = next.ingresos && Object.keys(next.ingresos).length > 0;
      const hasEgresos = next.egresos && Object.keys(next.egresos).length > 0;
      const hasAhorro = Array.isArray(next.ahorro) && next.ahorro.length > 0;
      if (!hasIngresos && !hasEgresos && !hasAhorro) {
        return null;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_ESTIMABLES);
      if (!raw) return;
      const cached = JSON.parse(raw) ?? {};
      const prestamos = Array.isArray(cached.prestamos)
        ? cached.prestamos.reduce(
            (acc, item) => acc + (n(item?.cuotas) > 0 ? n(item?.montoCuota) : 0),
            0
          )
        : 0;
      const tarjetas = Array.isArray(cached.tarjetas)
        ? cached.tarjetas.reduce(
            (acc, item) => acc + (n(item?.cuotas) > 0 ? n(item?.montoCuota) : 0),
            0
          )
        : 0;
      const comprasMes = Array.isArray(cached.compras)
        ? cached.compras.reduce(
            (acc, item) => (String(item?.mes ?? "") === currentMonthKey ? acc + n(item?.valor) : acc),
            0
          )
        : 0;
      setEstimablesTotals({ prestamos, tarjetas, comprasMes });
    } catch {
      // ignore storage issues
    }
  }, [currentMonthKey]);

  const applySnapshot = (snapshot) => {
    setRecordId(snapshot.id ?? null);
    setIngresos(buildStateFromSnapshot(INCOME_CATEGORIES, snapshot.ingresos));
    setEgresos(buildStateFromSnapshot(manualExpenseCategories, snapshot.egresos));
    setSaldoInicial(snapshot.saldoInicial != null ? String(snapshot.saldoInicial) : "");
    if (snapshot.ahorroMensual != null) {
      setAhorroMensual(String(snapshot.ahorroMensual));
    } else if (snapshot.ahorroDeseado != null) {
      setAhorroMensual(String(snapshot.ahorroDeseado));
    } else {
      setAhorroMensual("");
    }
    setLegacyDetalles(snapshot.detalles ?? null);
    setProjection(snapshot.projection ?? null);
  };

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      hydratingRef.current = true;
      try {
        const ctx = await getSupabaseSession();
        if (!active) return;
        setSession(ctx);

        let remote = null;
        if (ctx.supabase && ctx.userId) {
          try {
            remote = await fetchEstimacionEspecifica(ctx.supabase, ctx.userId);
          } catch {
            // ignore remote errors
          }
        }

        let cached = null;
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(LS_ESPECIFICA);
            if (raw) cached = JSON.parse(raw) ?? null;
          } catch {
            // ignore
          }
        }

        const snapshot = {
          id: remote?.id ?? cached?.id ?? null,
          ingresos: remote?.ingresos ?? cached?.ingresos ?? {},
          egresos: remote?.egresos ?? cached?.egresos ?? {},
          saldoInicial: cached?.saldoInicial ?? "",
          ahorroMensual: cached?.ahorroMensual ?? cached?.ahorroDeseado ?? "",
          detalles: cached?.detalles ?? null,
          projection: cached?.projection ?? null,
        };

        applySnapshot(snapshot);
      } finally {
        hydratingRef.current = false;
        if (active) setLoaded(true);
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  const buildSnapshot = () => ({
    id: recordId ?? null,
    ingresos: INCOME_CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = n(ingresos[cat.id]);
      return acc;
    }, {}),
    egresos: EXPENSE_CATEGORIES.reduce((acc, cat) => {
      if (cat.source === "estimables") {
        acc[cat.id] =
          cat.id === "prestamos"
            ? estimablesTotals.prestamos
            : cat.id === "tarjetas"
            ? estimablesTotals.tarjetas
            : 0;
      } else if (cat.id === "adquisiciones") {
        acc[cat.id] = n(egresos[cat.id]) + estimablesTotals.comprasMes;
      } else {
        acc[cat.id] = n(egresos[cat.id]);
      }
      return acc;
    }, {}),
    saldoInicial: n(saldoInicial),
    ahorroMensual: n(ahorroMensual),
    detalles: legacyDetalles ?? undefined,
    projection: projection ?? undefined,
  });

  useEffect(() => {
    if (!loaded || hydratingRef.current) return;
    const snapshot = buildSnapshot();
    try {
      window.localStorage.setItem(LS_ESPECIFICA, JSON.stringify(snapshot));
    } catch {
      // ignore storage errors
    }
  }, [loaded, ingresos, egresos, saldoInicial, ahorroMensual, recordId, projection, estimablesTotals]);

  useEffect(() => {
    if (!loaded) return;
    setDirty(false);
  }, [loaded]);

  const ingresosNumbers = useMemo(() => {
    const map = {};
    INCOME_CATEGORIES.forEach((cat) => {
      map[cat.id] = n(ingresos[cat.id]);
    });
    return map;
  }, [ingresos]);

  const egresosFull = useMemo(() => {
    const map = {};
    manualExpenseCategories.forEach((cat) => {
      let value = n(egresos[cat.id]);
      if (cat.id === "adquisiciones") value += estimablesTotals.comprasMes;
      map[cat.id] = value;
    });
    EXPENSE_CATEGORIES.forEach((cat) => {
      if (cat.source === "estimables") {
        if (cat.id === "prestamos") map[cat.id] = estimablesTotals.prestamos;
        if (cat.id === "tarjetas") map[cat.id] = estimablesTotals.tarjetas;
      }
    });
    return map;
  }, [egresos, estimablesTotals]);

  const totalIngresos = useMemo(
    () => Object.values(ingresosNumbers).reduce((acc, value) => acc + value, 0),
    [ingresosNumbers]
  );

  const totalEgresos = useMemo(
    () => Object.values(egresosFull).reduce((acc, value) => acc + value, 0),
    [egresosFull]
  );

  const saldoInicialNumber = n(saldoInicial);
  const ahorroMensualNumber = n(ahorroMensual);
  const resultadoMes = totalIngresos - totalEgresos;
  const saldoFinalDisplay = saldoInicialNumber + resultadoMes - ahorroMensualNumber;

  const monthLabels = useMemo(buildMonthLabels, []);

  const projectionData = useMemo(() => {
    const ingresosSeries = INCOME_CATEGORIES.map((cat) =>
      buildSeries(cat, ingresosNumbers[cat.id] ?? 0, projection?.ingresos?.[cat.id])
    );
    const egresosSeries = EXPENSE_CATEGORIES.map((cat) =>
      buildSeries(cat, egresosFull[cat.id] ?? 0, projection?.egresos?.[cat.id])
    );
    const resumenIngresos = sumSeriesValues(ingresosSeries);
    const resumenEgresos = sumSeriesValues(egresosSeries);
    const ahorroSeries = buildSeries(
      { id: "ahorro", label: "Ahorro mensual" },
      ahorroMensualNumber,
      projection?.ahorro
    );
    const resultadoSeries = resumenIngresos.map(
      (value, idx) => value - resumenEgresos[idx]
    );
    const saldoSeries = [];
    let saldoPrev = saldoInicialNumber;
    for (let i = 0; i < 12; i++) {
      const saldoMes = saldoPrev + resultadoSeries[i] - ahorroSeries.values[i];
      saldoSeries.push(saldoMes);
      saldoPrev = saldoMes;
    }
    return {
      ingresosSeries,
      egresosSeries,
      resumen: {
        ingresos: resumenIngresos,
        egresos: resumenEgresos,
        resultado: resultadoSeries,
        ahorro: ahorroSeries.values,
        saldo: saldoSeries,
      },
    };
  }, [
    ingresosNumbers,
    egresosFull,
    projection,
    ahorroMensualNumber,
    saldoInicialNumber,
  ]);

  const incomeSeriesMap = useMemo(() => {
    const map = new Map();
    projectionData.ingresosSeries.forEach((row) => map.set(row.id, row.values));
    return map;
  }, [projectionData.ingresosSeries]);

  const expenseSeriesMap = useMemo(() => {
    const map = new Map();
    projectionData.egresosSeries.forEach((row) => map.set(row.id, row.values));
    return map;
  }, [projectionData.egresosSeries]);

  const saldoInicialRow = useMemo(() => {
    return monthLabels.map((_, idx) => {
      if (idx === 0) return saldoInicialNumber;
      return projectionData.resumen.saldo[idx - 1] ?? 0;
    });
  }, [monthLabels, saldoInicialNumber, projectionData.resumen.saldo]);

  const resumenAcumulado = useMemo(() => {
    const ahorroTotal = projectionData.resumen.ahorro.reduce(
      (acc, value) => acc + (Number.isFinite(value) ? value : 0),
      0
    );
    const saldoFinal =
      projectionData.resumen.saldo.length > 0
        ? projectionData.resumen.saldo[projectionData.resumen.saldo.length - 1]
        : saldoInicialNumber;
    return { ahorroTotal, saldoFinal };
  }, [projectionData.resumen.ahorro, projectionData.resumen.saldo, saldoInicialNumber]);

  const handleSave = async () => {
    if (!loaded) return;
    setSaving(true);
    setSaveError("");
    try {
      const snapshot = buildSnapshot();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_ESPECIFICA, JSON.stringify(snapshot));
      }
      if (session.supabase && session.userId) {
        const newId = await upsertEstimacionEspecifica(session.supabase, session.userId, {
          id: snapshot.id,
          ingresos: snapshot.ingresos,
          egresos: snapshot.egresos,
        });
        setRecordId(newId ?? snapshot.id ?? null);
      }
      setDirty(false);
      setSaveSuccess(
        session.userId ? "Cambios guardados en la nube." : "Cambios guardados en este dispositivo."
      );
    } catch (error) {
      console.error(error);
      setSaveError("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = loaded && dirty && !saving;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Estimación específica
        </h1>
        <p className="text-sm text-white/80 md:text-base">
          Trabajá tus ingresos y egresos puntuales, revisá la proyección y haz ajustes premium cuando
          lo necesites.
        </p>
      </header>

      <section>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sky-900 shadow-sm">
          <p className="text-base font-semibold">Saldo inicial del mes</p>
          <p className="text-xs text-sky-700">Cuánto traes del mes anterior.</p>
          <input
            className="mt-3 w-full rounded border border-sky-200 bg-white px-3 py-2 text-right text-sm outline-none transition focus:border-sky-400"
            value={saldoInicial}
            onChange={(e) => {
              setSaldoInicial(e.target.value);
              markDirty();
            }}
            inputMode="decimal"
            placeholder="0"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-emerald-900 shadow">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold md:text-xl">Ingresos</h2>
              <p className="text-sm text-emerald-700">Distribuí los ingresos según su origen.</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-emerald-700">Total</p>
              <p className="text-lg font-semibold tabular-nums">{formatUYU(totalIngresos)}</p>
            </div>
          </div>
          <ul className="space-y-3">
            {orderedIncomeCategories.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white/70 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-emerald-900">{cat.label}</p>
                </div>
                <input
                  className="w-28 rounded border border-emerald-200 bg-white px-3 py-1.5 text-right text-sm text-emerald-900 outline-none transition focus:border-emerald-400"
                  value={ingresos[cat.id]}
                  onChange={(e) => {
                    setIngresos((prev) => ({ ...prev, [cat.id]: e.target.value }));
                    clearProjectionOverrides("ingresos", cat.id);
                    markDirty();
                  }}
                  inputMode="decimal"
                  placeholder="0"
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-rose-900 shadow">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold md:text-xl">Egresos</h2>
              <p className="text-sm text-rose-700">Distribuí los egresos según su origen.</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-rose-700">Total</p>
              <p className="text-lg font-semibold tabular-nums">{formatUYU(totalEgresos)}</p>
            </div>
          </div>
          <ul className="space-y-3">
            {orderedExpenseCategories.map((cat) => {
              const isEstimable = cat.source === "estimables";
              let helper = null;
              if (cat.id === "adquisiciones" && estimablesTotals.comprasMes > 0) {
                helper = `Incluye ${formatUYU(estimablesTotals.comprasMes)} en compras del mes.`;
              }
              return (
                <li
                  key={cat.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-white/70 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-rose-900">{cat.label}</p>
                    {helper ? <p className="text-xs text-rose-600">{helper}</p> : null}
                  </div>
                  {isEstimable ? (
                    <p className="text-base font-semibold tabular-nums">
                      {formatUYU(
                        cat.id === "prestamos"
                          ? estimablesTotals.prestamos
                          : cat.id === "tarjetas"
                          ? estimablesTotals.tarjetas
                          : 0
                      )}
                    </p>
                  ) : (
                    <input
                      className="w-28 rounded border border-rose-200 bg-white px-3 py-1.5 text-right text-sm text-rose-900 outline-none transition focus:border-rose-400"
                      value={egresos[cat.id] ?? ""}
                      onChange={(e) => {
                        setEgresos((prev) => ({ ...prev, [cat.id]: e.target.value }));
                        clearProjectionOverrides("egresos", cat.id);
                        markDirty();
                      }}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-900 shadow flex h-full items-center justify-between">
          <div>
            <p className="text-base font-semibold">Resultado de mes</p>
            <p className="text-xs text-emerald-700">Ingresos - Egresos.</p>
          </div>
          <p
            className={[
              "text-2xl font-semibold tabular-nums",
              resultadoMes >= 0 ? "text-emerald-700" : "text-rose-600",
            ].join(" ")}
          >
            {formatUYU(resultadoMes)}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sky-900 shadow">
          <p className="text-base font-semibold">Ahorro mensual</p>
          <p className="text-xs text-sky-700">Cuánto querés reservar cada mes.</p>
          <input
            className="mt-3 w-full rounded border border-sky-200 bg-white px-3 py-2 text-right text-sm outline-none transition focus:border-sky-400"
            value={ahorroMensual}
            onChange={(e) => {
              setAhorroMensual(e.target.value);
              clearProjectionOverrides("ahorro");
              markDirty();
            }}
            inputMode="decimal"
            placeholder="0"
          />
          <p className="mt-2 text-xs text-sky-600">
            Podés ahorrar hasta <span className="font-semibold">{formatUYU(saldoFinalDisplay)}</span> este mes.
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 text-slate-900 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 md:text-xl">Proyección</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Premium
            </span>
            <Link
              href="/estimacion-especifica/ajustes"
              className="inline-flex items-center rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
            >
              Hacer ajustes
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full table-fixed border-collapse text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Concepto</th>
                {monthLabels.map((label, idx) => (
                  <th key={label + idx} className="px-3 py-2 text-right">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-blue-50 text-blue-900 font-semibold">
                <td className="px-3 py-2">Saldo inicial</td>
                {monthLabels.map((_, idx) => (
                  <td key={`saldo-inicial-${idx}`} className="px-3 py-2 text-right">
                    <span className="tabular-nums">{formatUYU(saldoInicialRow[idx])}</span>
                  </td>
                ))}
              </tr>

              <tr className="bg-emerald-200 text-emerald-950 font-semibold uppercase tracking-wide">
                <td className="px-3 py-2">Ingresos</td>
                {projectionData.resumen.ingresos.map((value, idx) => (
                  <td key={`ingresos-total-${idx}`} className="px-3 py-2 text-right">
                    {formatUYU(value)}
                  </td>
                ))}
              </tr>

              {orderedIncomeCategories.map((cat) => {
                const values = incomeSeriesMap.get(cat.id) ?? Array(monthLabels.length).fill(0);
                return (
                  <tr key={cat.id} className="bg-white">
                    <td className="px-3 py-2 text-sm font-medium text-emerald-900">{cat.label}</td>
                    {monthLabels.map((_, idx) => (
                      <td key={`${cat.id}-${idx}`} className="px-3 py-2 text-right">
                        <span className="tabular-nums">{formatUYU(values[idx] ?? 0)}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}

              <tr className="bg-rose-200 text-rose-950 font-semibold uppercase tracking-wide">
                <td className="px-3 py-2">Egresos</td>
                {projectionData.resumen.egresos.map((value, idx) => (
                  <td key={`egresos-total-${idx}`} className="px-3 py-2 text-right">
                    {formatUYU(value)}
                  </td>
                ))}
              </tr>

              {orderedExpenseCategories.map((cat) => {
                const values = expenseSeriesMap.get(cat.id) ?? Array(monthLabels.length).fill(0);
                return (
                  <tr key={cat.id} className="bg-white">
                    <td className="px-3 py-2 text-sm font-medium text-rose-900">{cat.label}</td>
                    {monthLabels.map((_, idx) => (
                      <td key={`${cat.id}-${idx}`} className="px-3 py-2 text-right">
                        <span className="tabular-nums">{formatUYU(values[idx] ?? 0)}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}

              <tr className="bg-blue-50 text-blue-900 font-semibold">
                <td className="px-3 py-2">Ahorro</td>
                {monthLabels.map((_, idx) => (
                  <td key={`ahorro-row-${idx}`} className="px-3 py-2 text-right">
                    <span className="tabular-nums">
                      {formatUYU(projectionData.resumen.ahorro[idx] ?? 0)}
                    </span>
                  </td>
                ))}
              </tr>

              <tr className="bg-blue-100 text-blue-950 font-semibold uppercase tracking-wide">
                <td className="px-3 py-2">Saldo final</td>
                {projectionData.resumen.saldo.map((value, idx) => (
                  <td
                    key={`saldo-final-${idx}`}
                    className={["px-3 py-2 text-right", value < 0 ? "text-rose-600" : ""].join(" ")}
                  >
                    {formatUYU(value)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
          <p className="text-lg font-semibold">Ahorro acumulado</p>
          <p className="text-2xl font-semibold">{formatUYU(resumenAcumulado.ahorroTotal)}</p>
        </div>
      </section>

      <div className="sticky bottom-0 left-0 right-0 mt-6 flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          {!loaded
            ? "Cargando datos..."
            : dirty
            ? "Tienes cambios sin guardar."
            : saveSuccess
            ? saveSuccess
            : "Últimos cambios guardados."}
          {saveError ? <span className="ml-2 text-rose-600">{saveError}</span> : null}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={[
            "inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition",
            canSave
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "cursor-not-allowed bg-slate-300 text-slate-600",
          ].join(" ")}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function buildEmptyState(categories) {
  return categories.reduce((acc, cat) => {
    acc[cat.id] = "";
    return acc;
  }, {});
}

function buildStateFromSnapshot(categories, source) {
  const next = buildEmptyState(categories);
  if (!source || typeof source !== "object") return next;
  categories.forEach((cat) => {
    const value = source[cat.id];
    if (value !== undefined && value !== null) {
      next[cat.id] = String(value);
    }
  });
  return next;
}

function buildMonthLabels() {
  const base = new Date();
  return Array.from({ length: 12 }, (_, idx) => {
    const date = new Date(base.getFullYear(), base.getMonth() + idx, 1);
    return MONTH_NAMES[date.getMonth()];
  });
}

function buildSeries(cat, baseValue, overrides) {
  const list = overrides ? ensureMonthArray(overrides) : null;
  return {
    id: cat.id,
    label: cat.label,
    values: Array.from({ length: 12 }, (_, idx) => {
      if (list && list[idx] !== "") return n(list[idx]);
      return Number.isFinite(baseValue) ? baseValue : 0;
    }),
  };
}

function sumSeriesValues(series) {
  return Array.from({ length: 12 }, (_, idx) =>
    series.reduce((acc, row) => acc + (row.values[idx] ?? 0), 0)
  );
}

function n(value) {
  const numeric = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatUYU(value) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value || 0);
}
