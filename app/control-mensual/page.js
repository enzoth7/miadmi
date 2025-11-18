"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSupabaseSession,
  fetchControlMensual,
  saveControlMensual,
} from "../../lib/app-data";

const LS_CTRL = "miadmi:control_mensual";
const LS_GEN = "miadmi:estimacion_general";
const LS_ESP = "miadmi:estimacion_especifica";

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

const normalizeMovimientos = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => ({
    id: item?.id ?? rid(),
    fecha: item?.fecha ?? "",
    categoria: item?.categoria ?? "Otros",
    desc: item?.desc ?? "",
    monto: item?.monto != null ? String(item.monto) : "",
    medio: item?.medio ?? "cash",
  }));
};

export default function ControlMensualPage() {
  const [inicialCash, setInicialCash] = useState("");
  const [inicialTarj, setInicialTarj] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [actualTarj, setActualTarj] = useState("");
  const [movs, setMovs] = useState([]); // {id, fecha, categoria, desc, monto, medio}

  const [catsPlan, setCatsPlan] = useState([]);
  const [session, setSession] = useState({ supabase: null, userId: null });
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const hydratingRef = useRef(false);

  const ymNow = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  // Cargar categorías desde Estimación General + Específica
  useEffect(() => {
    const out = new Set();
    try {
      const rawG = localStorage.getItem(LS_GEN);
      if (rawG) {
        const g = JSON.parse(rawG);
        const arr = Array.isArray(g?.egresos) ? g.egresos : [];
        arr.forEach((e) => {
          const name = String(e?.nombre || "").trim();
          if (name) out.add(name);
        });
      }
    } catch {}
    try {
      const rawE = localStorage.getItem(LS_ESP);
      if (rawE) {
        const s = JSON.parse(rawE);
        if (s?.egresos && typeof s.egresos === "object") {
          Object.keys(s.egresos).forEach((k) => out.add(k));
        }
      }
    } catch {}
    ["Préstamos", "Tarjetas", "Posibles compras"].forEach((k) => out.add(k));
    setCatsPlan(Array.from(out).sort());
  }, []);

  // Cargar estado de control mensual
  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      hydratingRef.current = true;
      const ctx = await getSupabaseSession();
      if (!active) return;
      setSession(ctx);

      let synced = false;

      if (ctx.supabase && ctx.userId) {
        try {
          const remote = await fetchControlMensual(ctx.supabase, ctx.userId);
          if (remote && active) {
            setInicialCash(String(remote.inicial?.cash ?? ""));
            setInicialTarj(String(remote.inicial?.tarjetas ?? ""));
            setActualCash(String(remote.actual?.cash ?? ""));
            setActualTarj(String(remote.actual?.tarjetas ?? ""));
            const normalized = normalizeMovimientos(remote.movimientos ?? []);
            setMovs(normalized);
            try {
              localStorage.setItem(
                LS_CTRL,
                JSON.stringify({
                  inicial: remote.inicial ?? { cash: "", tarjetas: "" },
                  actual: remote.actual ?? { cash: "", tarjetas: "" },
                  movimientos: normalized,
                })
              );
            } catch {}
            synced = true;
          }
        } catch {
          // ignore fallback
        }
      }

      if (!synced) {
        try {
          const raw = localStorage.getItem(LS_CTRL);
          if (raw) {
            const s = JSON.parse(raw);
            setInicialCash(String(s?.inicial?.cash ?? ""));
            setInicialTarj(String(s?.inicial?.tarjetas ?? ""));
            setActualCash(String(s?.actual?.cash ?? ""));
            setActualTarj(String(s?.actual?.tarjetas ?? ""));
            setMovs(normalizeMovimientos(s?.movimientos ?? []));
          }
        } catch {}
      }

      if (active) {
        setLoaded(true);
        setDirty(false);
        hydratingRef.current = false;
      }
    };

    hydrate();

    return () => {
      active = false;
      hydratingRef.current = false;
    };
  }, []);

  const buildSnapshot = () => ({
    inicial: { cash: String(inicialCash ?? ""), tarjetas: String(inicialTarj ?? "") },
    actual: { cash: String(actualCash ?? ""), tarjetas: String(actualTarj ?? "") },
    movimientos: normalizeMovimientos(movs),
  });

  const markDirty = () => {
    if (!hydratingRef.current) {
      setDirty(true);
      setSaveSuccess("");
      setSaveError("");
    }
  };

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = setTimeout(() => setSaveSuccess(""), 2500);
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  const handleSave = async () => {
    if (!session.userId || !session.supabase) {
      setSaveError("Necesitas iniciar sesión para guardar.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    const snapshot = buildSnapshot();
    try {
      await saveControlMensual(session.supabase, session.userId, snapshot);
      try {
        localStorage.setItem(LS_CTRL, JSON.stringify(snapshot));
      } catch {
        // ignore
      }
      setDirty(false);
      setSaveSuccess("Cambios guardados");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("miadmi:data-updated"));
      }
    } catch (error) {
      const message =
        error?.message || "No se pudieron guardar los cambios. Intenta nuevamente.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const canSave = dirty && !saving && !!session.userId;

  // Guardar cache local
  useEffect(() => {
    if (!loaded) return;
    const snapshot = buildSnapshot();
    try {
      localStorage.setItem(LS_CTRL, JSON.stringify(snapshot));
    } catch {}
  }, [loaded, inicialCash, inicialTarj, actualCash, actualTarj, movs]);

  // Filtrar movimientos del mes actual
  const movsMes = useMemo(() => {
    return movs.filter((m) => String(m?.fecha || "").startsWith(ymNow));
  }, [movs, ymNow]);

  // Totales
  const totalCash = useMemo(
    () => movsMes.reduce((a, m) => a + (String(m?.medio) === "cash" ? n(m?.monto) : 0), 0),
    [movsMes]
  );
  const totalTarj = useMemo(
    () => movsMes.reduce((a, m) => a + (String(m?.medio) === "tarjeta" ? n(m?.monto) : 0), 0),
    [movsMes]
  );

  const esperadoCash = Math.max(0, n(inicialCash) - totalCash);
  const esperadoTarj = Math.max(0, n(inicialTarj) - totalTarj);
  const difCash = n(actualCash) - esperadoCash;
  const difTarj = n(actualTarj) - esperadoTarj;

  // KPI total: compara lo que se tiene (cash+tarjetas) vs movimientos (cash+tarjetas) del mes
  const totalMovs = totalCash + totalTarj;
  const totalActual = n(actualCash) + n(actualTarj);
  const kpiDiff = totalActual - totalMovs;
  const kpiColor = kpiDiff === 0 ? "emerald" : kpiDiff < 0 ? "rose" : "amber";
  const kpiClasses = [
    "rounded-xl p-4 md:p-5 border shadow-sm flex items-center justify-between gap-4",
    kpiColor === "emerald" && "border-emerald-200 bg-emerald-50",
    kpiColor === "rose" && "border-rose-200 bg-rose-50",
    kpiColor === "amber" && "border-amber-200 bg-amber-50",
  ].filter(Boolean).join(" ");

  const catTotals = useMemo(() => {
    const map = new Map();
    for (const m of movsMes) {
      const k = String(m?.categoria || "Otros").trim() || "Otros";
      map.set(k, (map.get(k) || 0) + n(m?.monto));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [movsMes]);

  // Handlers
  const addMovimiento = () => {
    const today = new Date();
    const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    setMovs((prev) => [
      ...prev,
      { id: rid(), fecha: d, categoria: catsPlan[0] || "Otros", desc: "", monto: "", medio: "cash" },
    ]);
    markDirty();
  };
  const updMov = (id, patch) => {
    setMovs((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    markDirty();
  };
  const remMov = (id) => {
    setMovs((prev) => prev.filter((m) => m.id !== id));
    markDirty();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Control mensual</h1>
        <p className="text-white/80">
          Registra tus gastos día a día por categoría y conciliá efectivo y tarjetas.
        </p>
      </header>

      {/* KPI Conciliación global */}
      <section className="rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70">
        <div className={kpiClasses}>
          <div>
            <div className="text-sm text-gray-600">Conciliación total (cash + tarjetas)</div>
            <div className={["text-2xl font-semibold", kpiColor === "emerald" ? "text-emerald-700" : kpiColor === "rose" ? "text-rose-700" : "text-amber-700"].join(" ")}>{fmtUYU(kpiDiff)}</div>
            <div className="text-xs text-gray-600 mt-1">Lo que tenés: {fmtUYU(totalActual)} · Movimientos: {fmtUYU(totalMovs)}</div>
            {kpiColor === "amber" ? (
              <div className="text-sm text-amber-700 mt-1">Te faltó agregar un movimiento o te <b>SOBRA PLATA</b></div>
            ) : kpiColor === "rose" ? (
              <div className="text-sm text-rose-700 mt-1">Te faltó agregar un movimiento o te <b>FALTA PLATA</b></div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Conciliación */}
      <section className="rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70">
        <h2 className="text-lg md:text-xl font-semibold mb-4">Conciliación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">CASH</div>
              <div className="text-sm text-gray-600">Gastos: {fmtUYU(totalCash)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="text-sm text-gray-600">Saldo inicial</label>
              <input className="text-right bg-transparent border-b" value={inicialCash} onChange={(e) => setInicialCash(e.target.value)} inputMode="decimal" placeholder="0" />
              <label className="text-sm text-gray-600">Saldo actual</label>
              <input className="text-right bg-transparent border-b" value={actualCash} onChange={(e) => setActualCash(e.target.value)} inputMode="decimal" placeholder="0" />
            </div>
            <div className="mt-2 text-sm">Debería ser: <b>{fmtUYU(esperadoCash)}</b></div>
            <div className={["text-sm", difCash === 0 ? "text-gray-700" : difCash > 0 ? "text-emerald-700" : "text-rose-700"].join(" ")}>Diferencia: {fmtUYU(difCash)}</div>
          </div>

          <div className="rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">TARJETAS</div>
              <div className="text-sm text-gray-600">Gastos: {fmtUYU(totalTarj)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="text-sm text-gray-600">Saldo inicial</label>
              <input className="text-right bg-transparent border-b" value={inicialTarj} onChange={(e) => setInicialTarj(e.target.value)} inputMode="decimal" placeholder="0" />
              <label className="text-sm text-gray-600">Saldo actual</label>
              <input className="text-right bg-transparent border-b" value={actualTarj} onChange={(e) => setActualTarj(e.target.value)} inputMode="decimal" placeholder="0" />
            </div>
            <div className="mt-2 text-sm">Debería ser: <b>{fmtUYU(esperadoTarj)}</b></div>
            <div className={["text-sm", difTarj === 0 ? "text-gray-700" : difTarj > 0 ? "text-emerald-700" : "text-rose-700"].join(" ")}>Diferencia: {fmtUYU(difTarj)}</div>
          </div>
        </div>
      </section>

      {/* Registro de movimientos */}
      <section className="rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold">Movimientos ({ymNow})</h2>
          <button type="button" onClick={addMovimiento} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 bg-white hover:bg-gray-50">
            Agregar
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-left">Medio</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {movsMes.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2">
                    <input type="date" className="bg-transparent outline-none" value={m.fecha} onChange={(e) => updMov(m.id, { fecha: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <select className="bg-transparent outline-none" value={m.categoria} onChange={(e) => updMov(m.id, { categoria: e.target.value })}>
                      {[m.categoria, ...catsPlan.filter((c) => c !== m.categoria)].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input className="w-full bg-transparent outline-none" value={m.desc || ""} onChange={(e) => updMov(m.id, { desc: e.target.value })} placeholder="Detalle (opcional)" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input className="w-full text-right bg-transparent outline-none" value={m.monto} onChange={(e) => updMov(m.id, { monto: e.target.value })} inputMode="decimal" placeholder="0" />
                  </td>
                  <td className="px-3 py-2">
                    <select className="bg-transparent outline-none" value={m.medio} onChange={(e) => updMov(m.id, { medio: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => remMov(m.id)} className="text-rose-600 hover:text-rose-700">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Totales por categoría */}
      <section className="rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70">
        <h2 className="text-lg md:text-xl font-semibold mb-3">Totales por categoría ({ymNow})</h2>
        {catTotals.length === 0 ? (
          <p className="text-sm text-gray-700">Aún no registraste movimientos este mes.</p>
        ) : (
          <ul className="space-y-2">
            {catTotals.map((d, i) => (
              <li key={d.name + i} className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                <span className="text-sm">{d.name}</span>
                <span className="text-sm font-semibold">{fmtUYU(d.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sticky bottom-0 left-0 right-0 mt-6 flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          {!session.userId
            ? "Inicia sesión para guardar tus cambios en la nube."
            : dirty
            ? "Tienes cambios sin guardar."
            : saveSuccess
            ? saveSuccess
            : "Últimos cambios guardados."}
          {saveError ? (
            <span className="ml-2 text-rose-600">{saveError}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={[
            "inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition",
            canSave
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-slate-300 text-slate-600 cursor-not-allowed",
          ].join(" ")}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function rid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2, 10);
}
