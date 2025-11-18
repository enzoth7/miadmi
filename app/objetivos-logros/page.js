"use client";

import { useEffect, useMemo, useState } from "react";
import { Trophy, Award, Lock } from "lucide-react";
import {
  buildInstallmentSeries,
  getCurrentMonthKey,
} from "../../lib/installments";

const LS_GEN = "miadmi:estimacion_general";
const LS_ESP = "miadmi:estimacion_especifica";
const LS_ESTIMABLES = "miadmi:egresos_estimables";
const LS_CTRL = "miadmi:control_mensual";

const n = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};
const fmtUYU = (v) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(v || 0);

function strip(s) {
  try {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  } catch {
    return String(s || "").toLowerCase();
  }
}
const keyEquals = (a, b) => strip(a) === strip(b);

export default function ObjetivosLogrosPage() {
  // Objetivos provistos por la app (no editables)
  const APP_GOALS = [
    { id: "g1", titulo: "Supermercado ≤ 7.000 UYU", categoriaKey: "supermercado", limite: 7000 },
    { id: "g2", titulo: "Entretenimiento ≤ 2.000 UYU", categoriaKey: "entretenimiento", limite: 2000 },
    { id: "g3", titulo: "Tarjetas ≤ 5.000 UYU", categoriaKey: "tarjeta", limite: 5000 },
  ];

  // Datos actuales
  const general = useMemo(() => {
    try { const r = localStorage.getItem(LS_GEN); return r ? JSON.parse(r) : null; } catch { return null; }
  }, []);
  const especifica = useMemo(() => {
    try { const r = localStorage.getItem(LS_ESP); return r ? JSON.parse(r) : null; } catch { return null; }
  }, []);
  const estimables = useMemo(() => {
    try { const r = localStorage.getItem(LS_ESTIMABLES); return r ? JSON.parse(r) : {}; } catch { return {}; }
  }, []);
  const ctrl = useMemo(() => {
    try { const r = localStorage.getItem(LS_CTRL); return r ? JSON.parse(r) : {}; } catch { return {}; }
  }, []);

  // Ingresos/egresos para logros
  const ingresosGen = n(general?.sueldos) + n(general?.otrosIngresos);
  const egresosGen = (Array.isArray(general?.egresos) ? general.egresos : []).reduce((a, e) => a + n(e?.monto), 0);

  const ingresosEsp = especifica?.ingresos
    ? (Array.isArray(especifica.ingresos)
        ? especifica.ingresos.reduce((a, it) => a + n(it?.monto), 0)
        : Object.values(especifica.ingresos).reduce((a, v) => a + n(v), 0))
    : 0;
  const egrosObjEsp = especifica?.egresos && typeof especifica.egresos === "object" ? especifica.egresos : (especifica && !especifica.ingresos && !especifica.egresos && typeof especifica === "object" ? especifica : {});
  const egresosEsp = Object.values(egrosObjEsp).reduce((a, v) => a + n(v), 0);

  const currentMonthKey = getCurrentMonthKey();
  const prestamosSchedule = buildInstallmentSeries(
    Array.isArray(estimables?.prestamos) ? estimables.prestamos : [],
    currentMonthKey
  );
  const totalPrestamos = prestamosSchedule.currentTotal;
  const tarjetasSchedule = buildInstallmentSeries(
    Array.isArray(estimables?.tarjetas) ? estimables.tarjetas : [],
    currentMonthKey
  );
  const totalTarjetas = tarjetasSchedule.currentTotal;
  const totalComprasMes = (Array.isArray(estimables?.compras) ? estimables.compras : []).reduce(
    (a, c) => a + (String(c?.mes || "").startsWith(currentMonthKey) ? n(c?.valor) : 0),
    0
  );

  // Evitar duplicar categorías si están en Estimación específica
  const espKeys = Object.keys(egrosObjEsp || {});
  const hasPrest = espKeys.some((k) => keyEquals(k, "Préstamos"));
  const hasTarj = espKeys.some((k) => keyEquals(k, "Tarjetas"));
  const hasComp = espKeys.some((k) => keyEquals(k, "Posibles compras"));

  const effPrest = hasPrest ? 0 : totalPrestamos;
  const effTarj = hasTarj ? 0 : totalTarjetas;
  const effComp = hasComp ? 0 : totalComprasMes;

  const ingresos = Math.max(0, ingresosGen + ingresosEsp);
  const egresos = Math.max(0, egresosGen + egresosEsp + effPrest + effTarj + effComp);
  const saldo = ingresos - egresos;
  const capRatio = ingresos > 0 ? Math.max(0, saldo) / ingresos : 0;
  const balancePct = ingresos > 0 ? Math.round(((ingresos - egresos) / ingresos) * 1000) / 10 : 0;

  // Ranks (estimados, sin usuarios reales aún)
  const rankFromPct = (p) => (p >= 0.3 ? 10 : p >= 0.2 ? 20 : p >= 0.1 ? 35 : p >= 0 ? 60 : 85);
  const topBalanceRank = rankFromPct(capRatio);
  const topSavingRank = rankFromPct(capRatio);

  // Movimientos del mes (para medir objetivos por categoría)
  
  const movsMes = useMemo(
    () =>
      Array.isArray(ctrl?.movimientos)
        ? ctrl.movimientos.filter((m) =>
            String(m?.fecha || "").startsWith(currentMonthKey)
          )
        : [],
    [ctrl, currentMonthKey]
  );

  // Progreso por objetivo: suma de movimientos de la categoría comparado con límite
  const goalsComputed = APP_GOALS.map((g) => {
    const key = strip(g.categoriaKey);
    const spent = movsMes.reduce((a, m) => a + (strip(m?.categoria).includes(key) ? n(m?.monto) : 0), 0);
    const limit = n(g.limite);
    const pct = limit > 0 ? Math.max(0, Math.min(100, Math.round(((limit - spent) / limit) * 100))) : (spent === 0 ? 100 : 0);
    const completed = limit > 0 && spent <= limit;
    const saved = Math.max(0, limit - spent);
    return { ...g, spent, limit, pct, completed, saved };
  });

  // Logros a desbloquear (6)
  const achievements = useMemo(() => {
    const anyGoal = goalsComputed.some((g) => g.completed);
    const savedThousand = goalsComputed.some((g) => g.saved >= 1000);
    const threeGoals = goalsComputed.every((g) => g.completed);
    const balancePos = saldo > 0;
    const activeLog = Array.isArray(movsMes) && movsMes.length >= 10;
    const fiveStreak = false; // requiere historial de meses
    return [
      { id: "a1", label: "Completá tu primer objetivo mensual", unlocked: anyGoal },
      { id: "a2", label: "Felicitaciones por ahorrar 1000 pesos en una categoría", unlocked: savedThousand },
      { id: "a3", label: "Felicitaciones por lograr 5 objetivos seguidos", unlocked: fiveStreak },
      { id: "a4", label: "Balance positivo del mes", unlocked: balancePos },
      { id: "a5", label: "Registro activo (10+ movimientos este mes)", unlocked: activeLog },
      { id: "a6", label: "Capacidad de ahorro 20%+", unlocked: capRatio >= 0.2 },
    ];
  }, [goalsComputed, saldo, movsMes, capRatio]);

  // Handlers objetivos
  const addGoal = () => setGoals((p) => [...p, { id: rid(), nombre: "", categoria: "", limite: "", activo: true, done: false }]);
  const updGoal = (id, patch) => setGoals((p) => p.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const remGoal = (id) => setGoals((p) => p.filter((g) => g.id !== id));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Objetivos y logros</h1>
        <p className="text-white/80">Definí objetivos para reducir gastos hormiga y mirá tus logros.</p>
      </header>

      {/* KPI igual a Inicio (saldo y %) */}
      <section className="rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70">
        <div className={[
          "rounded-xl p-4 md:p-5 border shadow-sm flex items-center justify-between gap-4",
          saldo >= 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50",
        ].join(" ")}>
          <div>
            <div className="text-sm text-gray-600">Balance (ingresos − egresos)</div>
            <div className="text-2xl font-semibold leading-none">{balancePct}%</div>
            <div className="text-sm text-gray-600 mt-1">Saldo: <b>{fmtUYU(saldo)}</b></div>
          </div>
          <div className="text-right text-xs text-gray-600">
            Ingresos: <b>{fmtUYU(ingresos)}</b><br />
            Egresos: <b>{fmtUYU(egresos)}</b>
          </div>
        </div>
      </section>

      {/* Objetivos en curso (no editables) */}
      <section className="rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold">Objetivos en curso</h2>
        </div>
        <ul className="space-y-3">
          {goalsComputed.map((g) => (
            <li key={g.id} className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{g.titulo}</div>
                  <div className="text-[12px] text-gray-600">Límite: <b>{fmtUYU(g.limit || g.limite)}</b> · Gastado: <b>{fmtUYU(g.spent)}</b></div>
                </div>
                {g.completed ? (
                  <div className="inline-flex items-center gap-1 text-emerald-700 text-sm"><Award className="h-4 w-4 text-yellow-500" /> Completado</div>
                ) : (
                  <div className="text-sm text-gray-600">En curso</div>
                )}
              </div>
              <div className="mt-2 h-2 rounded bg-gray-100">
                <div className="h-2 rounded bg-emerald-500" style={{ width: `${g.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Logros */}
      <section className="rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5" />
          <h2 className="text-lg md:text-xl font-semibold">Logros</h2>
        </div>
        <ul className="space-y-2">
          {achievements.map((a) => (
            <li key={a.id} className={["rounded-lg border bg-white p-3 shadow-sm text-sm flex items-center gap-2",
              a.unlocked ? "border-emerald-300 text-emerald-700" : "text-gray-400"
            ].join(" ")}>
              {a.unlocked ? <Trophy className="h-4 w-4 text-yellow-500" /> : <Lock className="h-4 w-4" />}
              <span>{a.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// rid ya no es necesario (no hay edición de objetivos)
