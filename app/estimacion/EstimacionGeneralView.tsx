"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSupabaseSession,
  fetchEstimacionGeneral,
  upsertEstimacionGeneral,
  fetchEstimationMode,
  saveEstimationMode,
  DEFAULT_ESTIMATION_MODE,
} from "../../lib/app-data";
import { useSessionInfo } from "../../components/SessionProvider";
import { triggerPremiumBlock } from "../../lib/premiumBlocker";

const LS_KEY = "miadmi:estimacion_general";
const MODE_KEY = "miadmi:estimacion_mode";

const n = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

const normalizeKey = (value) => {
  try {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  } catch {
    return String(value ?? "").toLowerCase().trim();
  }
};

const EGRESO_CATEGORIES = [
  { id: "super", nombre: "Super" },
  { id: "alquiler", nombre: "Alquiler/Hipoteca" },
  { id: "cuentas", nombre: "Cuentas (UTE, Internet, etc.)" },
  { id: "salidas", nombre: "Salidas" },
  { id: "farmacia", nombre: "Farmacia y salud" },
  { id: "transporte", nombre: "Transporte/Nafta" },
  { id: "generales", nombre: "Gastos generales" },
  { id: "ropa", nombre: "Ropa y gustos" },
];

const EGRESO_KEY_LOOKUP = EGRESO_CATEGORIES.reduce((map, cat) => {
  const keyId = normalizeKey(cat.id);
  const keyNombre = normalizeKey(cat.nombre);
  if (keyId) map.set(keyId, cat.id);
  if (keyNombre) map.set(keyNombre, cat.id);
  return map;
}, new Map());

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("es-UY", {
  month: "short",
  year: "numeric",
});

const buildFixedEgresos = (entries = []) => {
  const amountById = {};

  if (Array.isArray(entries)) {
    entries.forEach((item) => {
      const candidates = [
        item?.id ? normalizeKey(item.id) : null,
        item?.nombre ? normalizeKey(item.nombre) : null,
      ].filter(Boolean);
      const matched = candidates
        .map((key) => EGRESO_KEY_LOOKUP.get(key))
        .find(Boolean);
      if (matched) {
        amountById[matched] = String(item?.monto ?? "");
      }
    });
  }

  return EGRESO_CATEGORIES.map((cat) => ({
    id: cat.id,
    nombre: cat.nombre,
    monto: amountById[cat.id] ?? "",
  }));
};

export default function EstimacionGeneralView({
  highlightInputs = false,
  highlightProyeccion = false,
}: {
  highlightInputs?: boolean;
  highlightProyeccion?: boolean;
} = {}) {
  // --- Estado (sin formateo en vivo; convertimos al calcular) ---
  const [sueldos, setSueldos] = useState("");
  const [otrosIngresos, setOtrosIngresos] = useState("");
  const [egresos, setEgresos] = useState(() => buildFixedEgresos());
  const [ahorroDeseado, setAhorroDeseado] = useState("");
  const [saldoInicial, setSaldoInicial] = useState(""); // Saldo del mes pasado (punto 8)
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState({ supabase: null, userId: null });
  const [recordId, setRecordId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [activeMode, setActiveMode] = useState(DEFAULT_ESTIMATION_MODE);
  const [modeSaving, setModeSaving] = useState(false);
  const [modeError, setModeError] = useState("");

  const { plan, premiumUntil } = useSessionInfo();
  const isPremium =
    plan === "premium" &&
    (!premiumUntil || new Date(premiumUntil).getTime() > Date.now());
  const monthCount = isPremium ? 24 : 6;

  const hydratingRef = useRef(false);
  const isActive = activeMode === "general";

const buildSnapshot = (override?: any) => {
    const source =
      override ??
      {
        id: recordId ?? null,
        sueldos,
        otrosIngresos,
        egresos,
        ahorroDeseado,
        saldoInicial,
      };

    return {
      id: source.id ?? recordId ?? null,
      sueldos: String(source.sueldos ?? ""),
      otrosIngresos: String(source.otrosIngresos ?? ""),
      egresos: buildFixedEgresos(source.egresos),
      ahorroDeseado: String(source.ahorroDeseado ?? ""),
      saldoInicial: String(source.saldoInicial ?? ""),
    };
  };

  const markDirty = () => {
    if (hydratingRef.current) return;
    setDirty(true);
    setSaveError("");
    setSaveSuccess("");
  };



const emitDataUpdated = (() => {
  let t = null;
  return () => {
    if (typeof window === "undefined") return;
    if (t) return;
    t = window.setTimeout(() => {
      t = null;
      window.dispatchEvent(new Event("miadmi:data-updated"));
    }, 150);
  };
})();




// Carga inicial (Supabase + localStorage)
useEffect(() => {
  let active = true;

  const hydrate = async () => {
    hydratingRef.current = true;
    try {
      const ctx = await getSupabaseSession();
      if (!active) return;
      setSession(ctx);

      let snapshot = null;
      let modeValue = DEFAULT_ESTIMATION_MODE;
      let hasRemoteMode = false;

      if (ctx.userId && ctx.supabase) {
        try {
          const remote = await fetchEstimacionGeneral(ctx.supabase, ctx.userId);
          if (remote) {
            snapshot = buildSnapshot({
              id: remote.id ?? null,
              sueldos: remote.sueldos ?? "",
              otrosIngresos: remote.otrosIngresos ?? "",
              egresos: remote.egresos ?? [],
              ahorroDeseado: remote.ahorroDeseado ?? "",
              saldoInicial: remote.saldoInicial ?? "",
            });
          }
        } catch {
          // ignore remote errors
        }

        try {
          modeValue = await fetchEstimationMode(ctx.supabase, ctx.userId);
          hasRemoteMode = true;
        } catch {
          modeValue = DEFAULT_ESTIMATION_MODE;
        }
      }

      if (!snapshot) {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed) snapshot = buildSnapshot(parsed);
          }
        } catch {
          // ignore storage errors
        }
      }

      if (!hasRemoteMode) {
        try {
          const storedMode = localStorage.getItem(MODE_KEY);
          if (storedMode === "general" || storedMode === "especifica") {
            modeValue = storedMode;
          }
        } catch {
          // ignore storage errors
        }
      }

      if (!snapshot) {
        snapshot = buildSnapshot();
      }

      if (!active) return;

      setSueldos(snapshot.sueldos);
      setOtrosIngresos(snapshot.otrosIngresos);
      setEgresos(snapshot.egresos);
      setAhorroDeseado(snapshot.ahorroDeseado);
      setSaldoInicial(snapshot.saldoInicial);
      setRecordId(snapshot.id ?? null);
      setActiveMode(modeValue);
      setModeError("");
      setDirty(false);
      setSaveError("");
      setSaveSuccess("");
      setLoaded(true);
    } finally {
      hydratingRef.current = false;
    }
  };

  hydrate();

  return () => {
    active = false;
    hydratingRef.current = false;
  };
}, []);

useEffect(() => {
  if (!loaded || hydratingRef.current) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(buildSnapshot()));
    emitDataUpdated();
  } catch {
    // ignore storage errors
  }
}, [loaded, sueldos, otrosIngresos, egresos, ahorroDeseado, saldoInicial, recordId]);

useEffect(() => {
  try {
    localStorage.setItem(MODE_KEY, activeMode);
  } catch {
    // ignore storage errors
  }
}, [activeMode]);

useEffect(() => {
  if (!saveSuccess) return;
  const timer = setTimeout(() => setSaveSuccess(""), 2500);
  return () => clearTimeout(timer);
}, [saveSuccess]);

  // --- Calculos base (puntos 5-8) ---
  const totalIngresos = useMemo(
    () => n(sueldos) + n(otrosIngresos),
    [sueldos, otrosIngresos]
  );

  const totalEgresos = useMemo(
    () => egresos.reduce((acc, e) => acc + n(e.monto), 0),
    [egresos]
  );

  const ahorro = useMemo(() => n(ahorroDeseado), [ahorroDeseado]);

  // Capacidad mensual (ingresos - egresos) condicionada al modo activo
  const capacidadMensual = isActive
    ? Math.max(0, totalIngresos - totalEgresos)
    : 0;
  const displayedTotalIngresos = isActive ? totalIngresos : 0;
  const displayedTotalEgresos = isActive ? totalEgresos : 0;

  // Generar filas donde "Saldo mes pasado" es encadenado (punto 8)
  const monthLabels = useMemo(() => {
    const base = new Date();
    return Array.from({ length: monthCount }, (_, idx) => {
      const date = new Date(base.getFullYear(), base.getMonth() + idx, 1);
      return MONTH_LABEL_FORMATTER.format(date);
    });
  }, [monthCount]);

  const filas = useMemo(() => {
    const arr = [];
    let saldoMesPasado = isActive ? n(saldoInicial) : 0;
    for (let i = 0; i < monthCount; i++) {
      const ingresos = isActive ? totalIngresos : 0;
      const egresosMes = isActive ? totalEgresos : 0;
      const ahorroMes = isActive ? ahorro : 0;
      const saldoFinal = saldoMesPasado + ingresos - egresosMes - ahorroMes;
      arr.push({
        idx: i + 1,
        saldoMesPasado,
        ingresos,
        egresos: egresosMes,
        ahorro: ahorroMes,
        saldoFinal,
      });
      saldoMesPasado = isActive ? saldoFinal : 0; // encadenar cuando aplica
    }
    return arr;
  }, [isActive, saldoInicial, totalIngresos, totalEgresos, ahorro, monthCount]);





  const ingresosDetalleRows = useMemo(() => {
    if (!isActive) return [];

    const sueldosNum = n(sueldos);
    const otrosNum = n(otrosIngresos);

    const rows: { label: string; values: number[] }[] = [];

    if (sueldosNum > 0) {
      rows.push({
        label: "Sueldos",
        values: Array.from({ length: monthCount }, () => sueldosNum),
      });
    }

    if (otrosNum > 0) {
      rows.push({
        label: "Otros ingresos",
        values: Array.from({ length: monthCount }, () => otrosNum),
      });
    }

    return rows;
  }, [isActive, sueldos, otrosIngresos, monthCount]);

  const egresosDetalleRows = useMemo(() => {
    if (!isActive) return [];

    return egresos
      .map((item) => {
        const val = n(item.monto);
        return {
          label: item.nombre,
          values: Array.from({ length: monthCount }, () => val),
        };
      })
      .filter((row) => row.values[0] > 0);
  }, [isActive, egresos, monthCount]);







  // KPIs (punto 9)
  const kpiAhorroTotal = useMemo(() => {
    if (!filas.length) return 0;
    return Math.round(filas.reduce((a, f) => a + (Number.isFinite(f.ahorro) ? f.ahorro : 0), 0));
  }, [filas]);

  const saldoFinalProyeccion = filas.length
    ? filas[filas.length - 1].saldoFinal
    : 0;

  // Comentarios simples (punto 9)
  const comentario = isActive
    ? capacidadMensual > 0
      ? "Podes ahorrar cada mes sin quedar en negativo."
      : "No te alcanza: ajusta egresos o ahorro mensual."
    : "Estimacin desactivada: no se incluye en Inicio.";

  const handleExportCsv = () => {
    if (filas.length === 0) return;
    if (!isPremium) {
      triggerPremiumBlock("export");
      return;
    }
    const safeNumber = (value) =>
      Number.isFinite(value) ? Number(value) : 0;
    const rows = [];
    rows.push(["Concepto", ...monthLabels]);
    const appendRow = (label, key) => {
      rows.push([label, ...filas.map((fila) => safeNumber(fila[key]))]);
    };
    appendRow("Saldo mes pasado", "saldoMesPasado");
    appendRow("Ingresos", "ingresos");
    appendRow("Egresos", "egresos");
    appendRow("Ahorro", "ahorro");
    appendRow("Saldo final", "saldoFinal");

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const normalized = String(cell ?? "").replace(/"/g, '""');
            return `"${normalized}"`;
          })
          .join(";")
      )
      .join("\r\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `estimacion-general-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

const handleModeToggle = async () => {
  const previousMode = activeMode;
  const nextMode = previousMode === "general" ? "especifica" : "general";

  // ✅ UI instantánea
  setActiveMode(nextMode);
  setModeError("");

  // ✅ persistencia + evento instantáneo (sin esperar useEffect)
  try {
    localStorage.setItem(MODE_KEY, nextMode);
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("miadmi:data-updated"));
  }

  // 🔽 después hacés el guardado remoto si corresponde
  if (session.userId && session.supabase) {
    setModeSaving(true);
    try {
      const confirmed = await saveEstimationMode(session.supabase, session.userId, nextMode);
      setActiveMode(confirmed);
      try { localStorage.setItem(MODE_KEY, confirmed); } catch {}
      window.dispatchEvent(new Event("miadmi:data-updated"));
    } catch (err) {
      setActiveMode(previousMode);
      try { localStorage.setItem(MODE_KEY, previousMode); } catch {}
      window.dispatchEvent(new Event("miadmi:data-updated"));

      setModeError(err?.message ?? "No se pudo actualizar el estado. Intenta nuevamente.");
    } finally {
      setModeSaving(false);
    }
  }
};


  // --- Acciones tabla egresos (dinamica tipo Excel, punto 6) ---
  const updateEgresoMonto = (id, value) => {
    setEgresos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, monto: value } : e))
    );
    markDirty();
  };

const handleSave = async () => {
  if (!session.userId || !session.supabase) {
    setSaveError("Necesitas iniciar sesion para guardar.");
    return;
  }

  setSaving(true);
  setSaveError("");
  setSaveSuccess("");

  const snapshot = buildSnapshot();

  try {
    const newId = await upsertEstimacionGeneral(session.supabase, session.userId, {
      id: snapshot.id ?? recordId ?? null,
      sueldos: n(snapshot.sueldos),
      otrosIngresos: n(snapshot.otrosIngresos),
      ahorroDeseado: n(snapshot.ahorroDeseado),
      saldoInicial: n(snapshot.saldoInicial),
      egresos: snapshot.egresos.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        monto: n(item.monto),
      })),
    });

    const finalId = newId ?? snapshot.id ?? recordId ?? null;
    const storedSnapshot = { ...snapshot, id: finalId };

    setRecordId(finalId);

    try {
      localStorage.setItem(LS_KEY, JSON.stringify(storedSnapshot));
      emitDataUpdated(); // ✅ evento (throttle) una sola vez
    } catch {
      // ignore storage errors
    }

    setDirty(false);
    setSaveSuccess("Cambios guardados.");
  } catch (error) {
    setSaveError(error?.message ?? "No se pudieron guardar los cambios. Intenta nuevamente.");
  } finally {
    setSaving(false);
  }
};


  const canSave = dirty && !saving && !!session.userId;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Estimacion simple</h1>
          <p className="text-white/80">
            Carga ingresos y egresos generales, defini un ahorro mensual y mira la proyeccion segun tu plan.
          </p>
        </div>
      </header>


      {/* Saldo inicial del mes */}
      <section>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sky-900 shadow-sm">
          <p className="text-base font-semibold">Saldo inicial del mes</p>
          <p className="text-xs text-sky-700">Cuanto traes del mes anterior.</p>
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

      {/* Ingresos y egresos */}
      <section
        id="estim-general-inputs"
        className={[
          "grid gap-4 md:grid-cols-2",
          highlightInputs
            ? "relative z-40 rounded-2xl ring-4 ring-emerald-300/80 ring-offset-2 ring-offset-white shadow-xl shadow-emerald-500/40"
            : "",
        ].join(" ")}
      >
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-emerald-900 shadow">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-lg md:text-xl font-semibold">Ingresos</h2>
            <div className="text-right">
              <p className="text-xs font-medium text-emerald-700">Total</p>
              <p className="text-lg font-semibold tabular-nums">{formatUYU(displayedTotalIngresos)}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-800">Sueldo</p>
                <p className="text-xs text-emerald-600">Ingreso principal</p>
              </div>
              <input
                className="w-28 sm:w-32 rounded border border-emerald-200 bg-white px-3 py-1.5 text-right text-sm text-emerald-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                value={sueldos}
                onChange={(e) => {
                  setSueldos(e.target.value);
                  markDirty();
                }}
                inputMode="decimal"
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-800">Otros</p>
                <p className="text-xs text-emerald-600">Ingresos adicionales</p>
              </div>
              <input
                className="w-28 sm:w-32 rounded border border-emerald-200 bg-white px-3 py-1.5 text-right text-sm text-emerald-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                value={otrosIngresos}
                onChange={(e) => {
                  setOtrosIngresos(e.target.value);
                  markDirty();
                }}
                inputMode="decimal"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-rose-900 shadow">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-lg md:text-xl font-semibold">Egresos</h2>
            <div className="text-right">
              <p className="text-xs font-medium text-rose-700">Total</p>
              <p className="text-lg font-semibold tabular-nums">{formatUYU(displayedTotalEgresos)}</p>
            </div>
          </div>
          <div className="space-y-4">
            {egresos.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <span className="text-sm font-medium text-rose-800">{item.nombre}</span>
                <input
                  className="w-28 sm:w-32 rounded border border-rose-200 bg-white px-3 py-1.5 text-right text-sm text-rose-900 outline-none transition focus:border-rose-400 focus:bg-white"
                  value={item.monto}
                  onChange={(ev) => updateEgresoMonto(item.id, ev.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resultado de mes */}
      <section>
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-semibold text-emerald-900">Resultado de mes</p>
              <p className="text-xs text-emerald-600">Ingresos - Egresos. Esta es tu capacidad de ahorro; no conviene ahorrar por encima de este numero.</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-emerald-700">{formatUYU(capacidadMensual)}</p>
          </div>
        </div>
      </section>

      {/* Ahorro mensual */}
      <section>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sky-900 shadow-sm">
          <p className="text-base font-semibold">Ahorro mensual</p>
          <p className="text-xs text-sky-700">Cuanto queres reservar cada mes.</p>
          <input
            className="mt-3 w-full rounded border border-sky-200 bg-white px-3 py-2 text-right text-sm outline-none transition focus:border-sky-400"
            value={ahorroDeseado}
            onChange={(e) => {
              setAhorroDeseado(e.target.value);
              markDirty();
            }}
            inputMode="decimal"
            placeholder="0"
          />
        </div>
      </section>

      {/* Cuadro tipo Excel + KPIs (puntos 8 y 9) */}
      <section
        id="estim-general-proyeccion"
        className={[
          "rounded-2xl border border-sky-100 bg-sky-50 p-6 text-gray-900 shadow",
          highlightProyeccion
            ? "relative z-40 ring-4 ring-emerald-300/80 ring-offset-2 ring-offset-white shadow-xl shadow-emerald-500/40"
            : "",
        ].join(" ")}
      >
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold md:text-xl">
            Proyeccion ({monthCount} meses)
          </h2>
          <div className="flex flex-col items-start gap-1 text-xs text-slate-500 md:flex-row md:items-center md:gap-3">
            <button
              type="button"
              onClick={() => {
                if (!isPremium) {
                  triggerPremiumBlock("export");
                  return;
                }
                handleExportCsv();
              }}
              className={[
                "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                isPremium
                  ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  : "cursor-not-allowed border-white/20 bg-white/10 text-white/60 backdrop-blur",
              ].join(" ")}
              aria-disabled={!isPremium}
            >
              Exportar CSV
            </button>
            {!isPremium ? (
              <span>Disponible con acceso premium.</span>
            ) : null}
          </div>
        </div>






          <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Concepto</th>
                {filas.map((f, idx) => (
                  <th key={f.idx} className="px-3 py-2 text-right">
                    {monthLabels[idx]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Saldo mes pasado */}
              <tr className="bg-blue-100">
                <td className="px-3 py-2 text-blue-900 font-semibold">Saldo mes pasado</td>
                {filas.map((f) => (
                  <td
                    key={f.idx}
                    className="px-3 py-2 text-right tabular-nums"
                  >
                    {formatUYU(f.saldoMesPasado)}
                  </td>
                ))}
              </tr>

              {/* Ingresos totales */}
              <tr className="bg-emerald-300">
                <td className="px-3 py-2 text-emerald-950 font-semibold uppercase tracking-wide">
                  Ingresos
                </td>
                {filas.map((f) => (
                  <td
                    key={f.idx}
                    className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-900"
                  >
                    {formatUYU(f.ingresos)}
                  </td>
                ))}
              </tr>

              {/* Detalle de ingresos */}
              {ingresosDetalleRows.map((row) => (
                <tr key={`ing-${row.label}`} className="bg-emerald-100">
                  <td className="px-3 py-2 text-sm font-medium text-emerald-900">
                    {row.label}
                  </td>
                  {row.values.map((val, idx) => (
                    <td
                      key={idx}
                      className="px-3 py-2 text-right tabular-nums text-emerald-700"
                    >
                      {formatUYU(val)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Egresos totales */}
              <tr className="bg-rose-300">
                <td className="px-3 py-2 text-rose-950 font-semibold uppercase tracking-wide">
                  Egresos
                </td>
                {filas.map((f) => (
                  <td
                    key={f.idx}
                    className="px-3 py-2 text-right tabular-nums font-semibold text-rose-900"
                  >
                    {formatUYU(f.egresos)}
                  </td>
                ))}
              </tr>

              {/* Detalle de egresos por categoría */}
              {egresosDetalleRows.map((row) => (
                <tr key={`eg-${row.label}`} className="bg-rose-100">
                  <td className="px-3 py-2 text-sm font-medium text-rose-900">
                    {row.label}
                  </td>
                  {row.values.map((val, idx) => (
                    <td
                      key={idx}
                      className="px-3 py-2 text-right tabular-nums text-rose-700"
                    >
                      {formatUYU(val)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Ahorro mensual */}
              <tr className="bg-blue-50 text-blue-900 font-semibold">
                <td className="px-3 py-2 font-medium">Ahorro</td>
                {filas.map((f) => (
                  <td
                    key={f.idx}
                    className="px-3 py-2 text-right tabular-nums"
                  >
                    {formatUYU(f.ahorro)}
                  </td>
                ))}
              </tr>

              {/* Saldo final */}
              <tr className="bg-blue-100 text-blue-950 font-semibold uppercase tracking-wide">
                <td className="px-3 py-2 font-medium">Saldo final</td>
                {filas.map((f) => {
                  const val = f.saldoFinal;
                  const neg = val < 0 ? "text-rose-600" : "text-blue-950";
                  return (
                    <td
                      key={f.idx}
                      className={[
                        "px-3 py-2 text-right tabular-nums font-semibold",
                        neg,
                      ].join(" ")}
                    >
                      {formatUYU(val)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>










        {/* KPIs + comentario */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              {`Ahorro total (${monthCount} meses)`}
            </div>
            <div className="text-xl font-semibold tabular-nums">
              {formatUYU(kpiAhorroTotal)}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Saldo al mes {monthCount}
            </div>
            <div className="text-xl font-semibold tabular-nums">
              {formatUYU(saldoFinalProyeccion)}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Comentarios
            </div>
            <div
              className={[
                "text-sm",
                capacidadMensual > 0 ? "text-emerald-600" : "text-rose-500",
              ].join(" ")}
            >
              {comentario}
            </div>
          </div>
        </div>
      </section>

      <div>
        <Link
          href="/estimacion/ahorros"
          className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/10"
        >
          Ver detalle de ahorros
        </Link>
      </div>

      <div className="sticky bottom-0 left-0 right-0 mt-6 flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          {!session.userId
            ? "Inicia sesion para guardar tus cambios en la nube."
            : dirty
            ? "Tienes cambios sin guardar."
            : saveSuccess
            ? saveSuccess
            : "Ultimos cambios guardados."}
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
              : "bg-slate-300 text-slate-600 cursor-not-allowed",
          ].join(" ")}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

/* Utils */
function formatUYU(v) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(v || 0);
}







