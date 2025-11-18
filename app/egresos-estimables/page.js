"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSupabaseSession,
  fetchEstimablesGrouped,
  replaceEstimables,
} from "../../lib/app-data";
import {
  buildInstallmentSeries,
  getCurrentMonthKey,
  normalizeMonthKey,
} from "../../lib/installments";

const LS_KEY = "miadmi:egresos_estimables";

const n = (value) => {
  const normalized = String(value ?? "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmtUYU = (value) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value || 0);

const rid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2, 10);

const asPrestamo = (item) => ({
  id: item?.id || rid(),
  nombre: String(item?.nombre ?? ""),
  cuotas: item?.cuotas != null ? String(item.cuotas) : "",
  montoCuota: item?.montoCuota != null ? String(item.montoCuota) : "",
  mesInicio: item?.mesInicio != null ? String(item.mesInicio) : "",
});

const asTarjeta = (item) => ({
  id: item?.id || rid(),
  nombre: String(item?.nombre ?? ""),
  cuotas: item?.cuotas != null ? String(item.cuotas) : "",
  montoCuota: item?.montoCuota != null ? String(item.montoCuota) : "",
  mesInicio: item?.mesInicio != null ? String(item.mesInicio) : "",
});

const asCompra = (item) => ({
  id: item?.id || rid(),
  nombre: String(item?.nombre ?? ""),
  valor: item?.valor != null ? String(item.valor) : "",
  mes: String(item?.mes ?? ""),
});

export default function EgresosEstimablesPage() {
  const [prestamos, setPrestamos] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState({ supabase: null, userId: null });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const hydratingRef = useRef(false);
  const currentMonthKey = getCurrentMonthKey();
  const ensureStartMonth = (value) =>
    normalizeMonthKey(value, currentMonthKey) ?? currentMonthKey;
  const applyStartMonth = (list) =>
    list.map((item) => ({
      ...item,
      mesInicio: ensureStartMonth(item?.mesInicio),
    }));

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      hydratingRef.current = true;
      try {
        const ctx = await getSupabaseSession();
        if (!active) return;
        setSession(ctx);

        let synced = false;
        if (ctx.supabase && ctx.userId) {
          try {
            const remote = await fetchEstimablesGrouped(
              ctx.supabase,
              ctx.userId
            );
            if (remote && active) {
              const snapshot = {
                prestamos: Array.isArray(remote.prestamos)
                  ? applyStartMonth(remote.prestamos.map(asPrestamo))
                  : [],
                tarjetas: Array.isArray(remote.tarjetas)
                  ? applyStartMonth(remote.tarjetas.map(asTarjeta))
                  : [],
                compras: Array.isArray(remote.compras)
                  ? remote.compras.map(asCompra)
                  : [],
              };
              setPrestamos(snapshot.prestamos);
              setTarjetas(snapshot.tarjetas);
              setCompras(snapshot.compras);
              try {
                localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
              } catch {
                // ignore storage errors
              }
              synced = true;
            }
          } catch {
            // ignore remote errors and fallback to cache
          }
        }

        if (!synced) {
          try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
              const cached = JSON.parse(raw);
              if (cached && active) {
                setPrestamos(
                  Array.isArray(cached.prestamos)
                    ? applyStartMonth(cached.prestamos.map(asPrestamo))
                    : []
                );
                setTarjetas(
                  Array.isArray(cached.tarjetas)
                    ? applyStartMonth(cached.tarjetas.map(asTarjeta))
                    : []
                );
                setCompras(
                  Array.isArray(cached.compras)
                    ? cached.compras.map(asCompra)
                    : []
                );
              }
            }
          } catch {
            // ignore cache errors
          }
        }
      } finally {
        if (active) {
          setLoaded(true);
          setDirty(false);
          hydratingRef.current = false;
        }
      }
    };

    hydrate();

    return () => {
      active = false;
      hydratingRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const snapshot = {
      prestamos,
      tarjetas,
      compras,
    };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
    } catch {
      // ignore storage errors
    }
  }, [loaded, prestamos, tarjetas, compras]);

  const markDirty = () => {
    if (!hydratingRef.current) {
      setDirty(true);
      setSaveError("");
      setSaveSuccess("");
    }
  };

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = setTimeout(() => setSaveSuccess(""), 2500);
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  const handleSave = async () => {
    if (!session.userId || !session.supabase) {
      setSaveError("Necesitas iniciar sesion para guardar.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    const snapshot = {
      prestamos,
      tarjetas,
      compras,
    };
    try {
      await replaceEstimables(session.supabase, session.userId, snapshot);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
      } catch {
        // ignore storage errors
      }
      setDirty(false);
      setSaveSuccess("Cambios guardados.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("miadmi:data-updated"));
      }
    } catch (error) {
      const message =
        error?.message ||
        "No se pudieron guardar los cambios. Intenta nuevamente.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const canSave = dirty && !saving && !!session.userId;

  const prestamosSchedule = useMemo(
    () => buildInstallmentSeries(prestamos, currentMonthKey),
    [prestamos, currentMonthKey]
  );
  const totalPrestamos = prestamosSchedule.currentTotal;

  const tarjetasSchedule = useMemo(
    () => buildInstallmentSeries(tarjetas, currentMonthKey),
    [tarjetas, currentMonthKey]
  );
  const totalTarjetas = tarjetasSchedule.currentTotal;

  const totalComprasMes = useMemo(
    () =>
      compras.reduce(
        (acc, item) =>
          acc +
          (String(item.mes || "").startsWith(currentMonthKey)
            ? n(item.valor)
            : 0),
        0
      ),
    [compras, currentMonthKey]
  );

  const addPrestamo = () => {
    setPrestamos((prev) => [
      ...prev,
      { id: rid(), nombre: "", cuotas: "", montoCuota: "", mesInicio: currentMonthKey },
    ]);
    markDirty();
  };

  const updPrestamo = (id, patch) => {
    setPrestamos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    markDirty();
  };

  const remPrestamo = (id) => {
    setPrestamos((prev) => prev.filter((item) => item.id !== id));
    markDirty();
  };

  const addTarjeta = () => {
    setTarjetas((prev) => [
      ...prev,
      { id: rid(), nombre: "", cuotas: "", montoCuota: "", mesInicio: currentMonthKey },
    ]);
    markDirty();
  };

  const updTarjeta = (id, patch) => {
    setTarjetas((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    markDirty();
  };

  const remTarjeta = (id) => {
    setTarjetas((prev) => prev.filter((item) => item.id !== id));
    markDirty();
  };

  const addCompra = () => {
    setCompras((prev) => [
      ...prev,
      { id: rid(), nombre: "", valor: "", mes: "" },
    ]);
    markDirty();
  };

  const updCompra = (id, patch) => {
    setCompras((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    markDirty();
  };

  const remCompra = (id) => {
    setCompras((prev) => prev.filter((item) => item.id !== id));
    markDirty();
  };

  const totalMensual = totalPrestamos + totalTarjetas;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Egresos estimables
        </h1>
        <p className="text-white/80">
          Préstamos, tarjetas y compras planificadas para el mes.
        </p>
      </header>

      <section className="rounded-2xl border border-white/30 bg-white/10 p-4 text-white shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-xl border border-white/20 bg-black/20 p-4">
              <span className="text-xs uppercase tracking-wide text-white/60">
                Total mensual préstamos + tarjetas
              </span>
              <div className="text-lg font-semibold md:text-xl">
                {fmtUYU(totalMensual)}
              </div>
            </div>
            <div className="rounded-xl border border-white/20 bg-black/20 p-4">
              <span className="text-xs uppercase tracking-wide text-white/60">
                Compras este mes
              </span>
              <div className="text-lg font-semibold md:text-xl">
                {fmtUYU(totalComprasMes)}
              </div>
            </div>
            <div className="rounded-xl border border-white/20 bg-black/20 p-4">
              <span className="text-xs uppercase tracking-wide text-white/60">
                Registros totales
              </span>
              <div className="text-lg font-semibold md:text-xl">
                {prestamos.length + tarjetas.length + compras.length}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Préstamos */}
      <section className="space-y-4 rounded-2xl border border-white/70 bg-sky-50 p-6 text-gray-900 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold md:text-xl">Préstamos</h2>
          <div className="text-sm text-gray-700">
            Total mensual: <b>{fmtUYU(totalPrestamos)}</b>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Mes inicio</th>
                <th className="px-3 py-2 text-right">Cuotas restantes</th>
                <th className="px-3 py-2 text-right">Monto cuota</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {prestamos.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2">
                    <input
                      className="w-full bg-transparent outline-none"
                      value={item.nombre}
                      onChange={(e) =>
                        updPrestamo(item.id, { nombre: e.target.value })
                      }
                      placeholder="Ej: Prestamo auto"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full bg-transparent outline-none"
                      type="month"
                      value={item.mesInicio}
                      onChange={(e) =>
                        updPrestamo(item.id, { mesInicio: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      className="w-full bg-transparent text-right outline-none"
                      value={item.cuotas}
                      onChange={(e) =>
                        updPrestamo(item.id, { cuotas: e.target.value })
                      }
                      inputMode="numeric"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      className="w-full bg-transparent text-right outline-none"
                      value={item.montoCuota}
                      onChange={(e) =>
                        updPrestamo(item.id, { montoCuota: e.target.value })
                      }
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remPrestamo(item.id)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50/60">
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={addPrestamo}
                    className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50"
                  >
                    Agregar prestamo
                  </button>
                </td>
                <td className="px-3 py-2 text-right font-semibold" colSpan={3}>
                  Total mensual: {fmtUYU(totalPrestamos)}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Tarjetas */}
      <section className="space-y-4 rounded-2xl border border-white/70 bg-sky-50 p-6 text-gray-900 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold md:text-xl">Tarjetas</h2>
          <div className="text-sm text-gray-700">
            Total mensual: <b>{fmtUYU(totalTarjetas)}</b>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Nombre del gasto</th>
                <th className="px-3 py-2 text-left">Mes inicio</th>
                <th className="px-3 py-2 text-right">Cuotas restantes</th>
                <th className="px-3 py-2 text-right">Monto cuota</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tarjetas.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2">
                    <input
                      className="w-full bg-transparent outline-none"
                      value={item.nombre}
                      onChange={(e) =>
                        updTarjeta(item.id, { nombre: e.target.value })
                      }
                      placeholder="Ej: Celular en cuotas"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full bg-transparent outline-none"
                      type="month"
                      value={item.mesInicio}
                      onChange={(e) =>
                        updTarjeta(item.id, { mesInicio: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      className="w-full bg-transparent text-right outline-none"
                      value={item.cuotas}
                      onChange={(e) =>
                        updTarjeta(item.id, { cuotas: e.target.value })
                      }
                      inputMode="numeric"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      className="w-full bg-transparent text-right outline-none"
                      value={item.montoCuota}
                      onChange={(e) =>
                        updTarjeta(item.id, { montoCuota: e.target.value })
                      }
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remTarjeta(item.id)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50/60">
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={addTarjeta}
                    className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50"
                  >
                    Agregar tarjeta
                  </button>
                </td>
                <td className="px-3 py-2 text-right font-semibold" colSpan={3}>
                  Total mensual: {fmtUYU(totalTarjetas)}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Compras planificadas */}
      <section className="space-y-4 rounded-2xl border border-white/70 bg-sky-50 p-6 text-gray-900 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold md:text-xl">
            Compras planificadas
          </h2>
          <div className="text-sm text-gray-700">
            Mes actual ({currentMonthKey}): <b>{fmtUYU(totalComprasMes)}</b>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Mes objetivo</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {compras.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2">
                    <input
                      className="w-full bg-transparent outline-none"
                      value={item.nombre}
                      onChange={(e) =>
                        updCompra(item.id, { nombre: e.target.value })
                      }
                      placeholder="Ej: Viaje o electrodomestico"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full bg-transparent outline-none"
                      type="month"
                      value={item.mes}
                      onChange={(e) => updCompra(item.id, { mes: e.target.value })}
                      placeholder="aaaa-mm"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      className="w-full bg-transparent text-right outline-none"
                      value={item.valor}
                      onChange={(e) =>
                        updCompra(item.id, { valor: e.target.value })
                      }
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remCompra(item.id)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50/60">
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={addCompra}
                    className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50"
                  >
                    Agregar compra
                  </button>
                </td>
                <td className="px-3 py-2 text-right font-semibold" colSpan={2}>
                  Mes actual ({currentMonthKey}): {fmtUYU(totalComprasMes)}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
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
