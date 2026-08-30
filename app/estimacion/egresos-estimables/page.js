"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, CreditCard, Landmark, ReceiptText } from "lucide-react";
import {
  getSupabaseSession,
  fetchEstimablesGrouped,
  replaceEstimables,
} from "../../../lib/app-data";
import {
  buildInstallmentSeries,
  getCurrentMonthKey,
  normalizeMonthKey,
} from "../../../lib/installments";
import { MetricCard, PageSurface, StaggerGrid } from "../../../components/financial/FinancialPrimitives";

const LS_KEY = () => "miadmi:egresos_estimables";

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
  mesFin: item?.mesFin != null ? String(item?.mesFin) : "",
});

const asTarjeta = (item) => ({
  id: item?.id || rid(),
  nombre: String(item?.nombre ?? ""),
  cuotas: item?.cuotas != null ? String(item.cuotas) : "",
  montoCuota: item?.montoCuota != null ? String(item.montoCuota) : "",
  mesInicio: item?.mesInicio != null ? String(item.mesInicio) : "",
  mesFin: item?.mesFin != null ? String(item?.mesFin) : "",
  valorTotal: item?.valorTotal != null ? String(item.valorTotal) : "",
  suscripcion: Boolean(item?.suscripcion),
});

const asCompra = (item) => ({
  id: item?.id || rid(),
  nombre: String(item?.nombre ?? ""),
  valor: item?.valor != null ? String(item.valor) : "",
  mes: String(item?.mes ?? ""),
});

const inputBaseClasses =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-blue-100";
const inputRightClasses = `${inputBaseClasses} text-right font-semibold [font-variant-numeric:tabular-nums]`;
const disabledInputClasses =
  "flex min-h-11 w-full cursor-not-allowed items-center justify-end rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-right text-base font-semibold text-gray-600 md:text-sm";


const SUSCRIPTION_VIRTUAL_INSTALLMENTS = 120;

const formatInstallmentValue = (total, cuotas, suscripcion = false) => {
  if (suscripcion) {
    return total > 0 ? String(total) : "";
  }
  if (!Number.isFinite(total) || !Number.isFinite(cuotas) || cuotas <= 0)
    return "";
  const value = total / cuotas;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const getRemainingInstallments = (currentKey, endKey) => {
  if (!currentKey || !endKey) return null;
  const [cy, cm] = String(currentKey).split("-").map((v) => Number(v));
  const [ey, em] = String(endKey).split("-").map((v) => Number(v));
  if (!cy || !cm || !ey || !em) return null;
  const diff = (ey - cy) * 12 + (em - cm) + 1;
  return diff;
};

const monthToIndex = (key) => {
  if (!key) return null;
  const [y, m] = String(key).split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return y * 12 + (m - 1);
};

const getRemainingInstallmentsFromRange = (currentKey, startKey, endKey) => {
  const ci = monthToIndex(currentKey);
  const si = monthToIndex(startKey);
  const ei = monthToIndex(endKey);
  if (ci == null || si == null || ei == null) return null;

  // Si todavía no empezó, contamos desde el inicio.
  // Si ya empezó, contamos desde el mes actual.
  const effective = Math.max(ci, si);

  // Inclusive: si effective == end, queda 1 cuota.
  const diff = ei - effective + 1;

  return Math.max(0, diff);
};



const computePrestamoCuotas = (item, currentKey) => {
  if (!item.mesFin) {
    return item.cuotas ?? "";
  }

  const remaining = getRemainingInstallmentsFromRange(
    currentKey,
    item.mesInicio,
    item.mesFin
  );

  if (remaining == null) return item.cuotas ?? "";
  return String(remaining);
};


const getTotalInstallmentsFromRange = (startKey, endKey) => {
  if (!startKey || !endKey) return null;
  const [sy, sm] = String(startKey).split("-").map((v) => Number(v));
  const [ey, em] = String(endKey).split("-").map((v) => Number(v));
  if (!sy || !sm || !ey || !em) return null;
  const diff = (ey - sy) * 12 + (em - sm) + 1;
  return diff > 0 ? diff : null;
};

const applyStartMonth = (list, currentMonthKey) =>
  list.map((item) => ({
    ...item,
    mesInicio: normalizeMonthKey(item?.mesInicio, currentMonthKey) ?? currentMonthKey,
  }));

const buildPersistableSnapshot = (prestamos, tarjetas, compras) => ({
  prestamos: prestamos.map((item) => ({ ...item })),
  tarjetas: tarjetas.map((item) => ({ ...item })),
  compras: compras.map((item) => ({ ...item })),
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
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

const autoGrow = (e) => {
  const el = e.currentTarget;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};


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
                  ? applyStartMonth(remote.prestamos.map(asPrestamo), currentMonthKey)
                  : [],
                tarjetas: Array.isArray(remote.tarjetas)
                  ? applyStartMonth(remote.tarjetas.map(asTarjeta), currentMonthKey)
                  : [],
                compras: Array.isArray(remote.compras)
                  ? remote.compras.map(asCompra)
                  : [],
              };
              setPrestamos(snapshot.prestamos);
              setTarjetas(snapshot.tarjetas);
              setCompras(snapshot.compras);
              try {
localStorage.setItem(LS_KEY(ctx.userId), JSON.stringify(snapshot));
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
const raw = localStorage.getItem(LS_KEY(ctx.userId));
            if (raw) {
              const cached = JSON.parse(raw);
              if (cached && active) {
                setPrestamos(
                  Array.isArray(cached.prestamos)
                    ? applyStartMonth(cached.prestamos.map(asPrestamo), currentMonthKey)
                    : []
                );
                setTarjetas(
                  Array.isArray(cached.tarjetas)
                    ? applyStartMonth(cached.tarjetas.map(asTarjeta), currentMonthKey)
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
  }, [currentMonthKey]);

useEffect(() => {
  if (!loaded) return;

  const snapshot = buildPersistableSnapshot(prestamos, tarjetas, compras);
  try {
    localStorage.setItem(LS_KEY(session.userId), JSON.stringify(snapshot));
  } catch {
    // ignore storage errors
  }
}, [loaded, prestamos, tarjetas, compras, session.userId]);

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
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    const snapshot = buildPersistableSnapshot(prestamos, tarjetas, compras);
    try {
      try {
localStorage.setItem(LS_KEY(session.userId), JSON.stringify(snapshot));
      } catch {
        // ignore storage errors
      }
      if (session.supabase && session.userId) {
        await replaceEstimables(session.supabase, session.userId, snapshot);
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

  const canSave = dirty && !saving;

  const prestamosSchedule = useMemo(
    () =>
      buildInstallmentSeries(
        prestamos.map((item) => ({
          ...item,
          cuotas: computePrestamoCuotas(item, currentMonthKey),
        })),
        currentMonthKey
      ),
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

  const totalMensual = totalPrestamos + totalTarjetas;

const addPrestamo = () => {
    setPrestamos((prev) => [
      ...prev,
      {
        id: rid(),
        nombre: "",
        cuotas: "",
        montoCuota: "",
        mesInicio: currentMonthKey,
        mesFin: "",
      },
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
      {
        id: rid(),
        nombre: "",
        cuotas: "",
        montoCuota: "",
        mesInicio: currentMonthKey,
        mesFin: "",
        valorTotal: "",
        suscripcion: false,
      },
    ]);
    markDirty();
  };

  const updTarjeta = (id, patch) => {
    setTarjetas((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };

        // Si hay rango mesInicio/mesFin y no es suscripción, derivamos el total de cuotas
        const rangeCuotas = getTotalInstallmentsFromRange(
          next.mesInicio,
          next.mesFin
        );
        if (rangeCuotas != null && !next.suscripcion) {
          next.cuotas = String(rangeCuotas);
        }

        const isSubscription =
          patch.suscripcion !== undefined ? patch.suscripcion : next.suscripcion;
        const valorTotalNumber = n(next.valorTotal);

        if (isSubscription) {
          next.suscripcion = true;
          next.cuotas = String(SUSCRIPTION_VIRTUAL_INSTALLMENTS);
          // Para suscripción, el valor total se interpreta como valor mensual
          next.montoCuota = valorTotalNumber > 0 ? String(valorTotalNumber) : "";
        } else {
          next.suscripcion = false;
          if (
            patch.suscripcion !== undefined &&
            next.cuotas === String(SUSCRIPTION_VIRTUAL_INSTALLMENTS)
          ) {
            next.cuotas = "";
          }
          const cuotasNumber = Math.max(0, Math.round(n(next.cuotas)));
          if (
            valorTotalNumber > 0 &&
            cuotasNumber > 0 &&
            (patch.valorTotal !== undefined ||
              patch.cuotas !== undefined ||
              patch.mesInicio !== undefined ||
              patch.mesFin !== undefined)
          ) {
            next.montoCuota = formatInstallmentValue(
              valorTotalNumber,
              cuotasNumber
            );
          } else if (patch.valorTotal !== undefined && cuotasNumber <= 0) {
            next.montoCuota = "";
          }
        }

        return next;
      })
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

  return (
    <PageSurface>
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
          Egresos estimables
        </h1>
        <p className="max-w-3xl text-sm text-gray-600">
          Préstamos, tarjetas y compras planificadas para tu proyección mensual.
        </p>
      </header>

      <StaggerGrid id="egresos-kpis" as="section" className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Total préstamos" value={fmtUYU(totalPrestamos)} icon={Landmark} />
        <MetricCard label="Total tarjetas" value={fmtUYU(totalTarjetas)} icon={CreditCard} />
        <MetricCard label="Total egresos en crédito por mes" value={fmtUYU(totalMensual)} icon={ReceiptText} tone="accent" />
      </StaggerGrid>

      {/* Préstamos */}
      <section
        id="egresos-prestamos-card"
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-[#0b1e3a] md:text-xl">Préstamos</h2>
          <p className="text-sm text-gray-600">
            Ingresá los préstamos vigentes y cuánto pagás cada mes.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full table-fixed text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Mes inicio</th>
                <th className="px-3 py-2 text-left">Mes fin</th>
                <th className="px-3 py-2 text-right">Cuotas restantes</th>
                <th className="px-3 py-2 text-right">Monto cuota</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {prestamos.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/40">
                  <td className="px-3 py-2">
                    <input
                      className={inputBaseClasses}
                      value={item.nombre}
                      onChange={(e) =>
                        updPrestamo(item.id, { nombre: e.target.value })
                      }
                      placeholder="Ej: Préstamo auto"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <MonthField
                      value={item.mesInicio}
                      onChange={(value) =>
                        updPrestamo(item.id, { mesInicio: value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <MonthField
                      value={item.mesFin}
                      onChange={(value) =>
                        updPrestamo(item.id, { mesFin: value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className={disabledInputClasses}>
                      {computePrestamoCuotas(item, currentMonthKey) || "0"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      className={inputRightClasses}
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
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-rose-600 transition hover:text-rose-700"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="px-3 py-2">
<button
  type="button"
  onClick={addPrestamo}
  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
>
  Agregar préstamo
</button>

                </td>
                <td className="px-3 py-2" colSpan={5}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

   {/* Tarjetas */}
<section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
  <div className="flex flex-col gap-1">
    <h2 className="text-lg font-bold text-[#0b1e3a] md:text-xl">Tarjetas</h2>
    <p className="text-sm text-gray-600">
      Ingresá todas las compras hechas con tus tarjetas de crédito, incluidas las suscripciones.
    </p>
  </div>

  <div className="w-full overflow-x-auto rounded-xl border border-gray-200">
    <table className="w-full table-auto text-sm">
<colgroup><col className="w-[30%] md:w-[28%]" /><col className="w-[12%] md:w-[14%]" /><col className="w-[12%] md:w-[14%]" /><col className="w-[6%] md:w-[8%]" /><col className="w-[14%] md:w-[10%]" /><col className="w-[10%] md:w-[10%]" /><col className="w-[14%] md:w-[14%]" /><col className="w-[2%] md:w-[2%]" /></colgroup>
<thead className="bg-gray-100 text-gray-600">
        <tr>
         <th className="px-1 md:px-2 py-2 text-left">Nombre</th>
<th className="px-1 md:px-2 py-2 text-left">Inicio</th>
<th className="px-1 md:px-2 py-2 text-left">Fin</th>
<th className="px-1 md:px-2 py-2 text-right">Cuotas totales</th>
<th className="px-1 md:px-2 py-2 text-right">Total</th>
<th className="px-1 md:px-2 py-2 text-right">Monto cuota</th>
<th className="px-1 md:px-2 py-2 text-left">Tipo</th>
<th className="px-1 md:px-2 py-2 text-right"></th>

        </tr>
      </thead>

      <tbody className="divide-y">
        {tarjetas.map((item) => (
          <tr key={item.id} className="hover:bg-blue-50/40">
<td className="px-1 md:px-2 py-2 align-top">
<textarea
  className={`${inputBaseClasses} w-full min-w-0 py-3 md:py-1 leading-snug resize-none`}
  rows={1}
  value={item.nombre}
  onChange={(e) => updTarjeta(item.id, { nombre: e.target.value })}
  onInput={autoGrow}
  placeholder="Ej: Celular"
/>

            </td>

<td className="px-1 md:px-2 py-2 align-top">
              <div className="w-[120px]">
                <MonthField
                  value={item.mesInicio}
                  onChange={(value) => updTarjeta(item.id, { mesInicio: value })}
                />
              </div>
            </td>

<td className="px-1 md:px-2 py-2 align-top">
              <div className="w-[120px]">
                <MonthField
                  value={item.mesFin}
                  onChange={(value) => updTarjeta(item.id, { mesFin: value })}
                />
              </div>
            </td>

          
            <td className="px-1 md:px-2 py-2 text-right">
    <div className={disabledInputClasses}>
  {item.suscripcion ? "-" : (item.cuotas || "0")}
</div>

            </td>

            <td className="px-1 md:px-2 py-2 text-right">
              <input
className={`${inputRightClasses} w-full min-w-[110px] md:min-w-0 py-3 md:py-1`}
                value={item.valorTotal}
                onChange={(e) => updTarjeta(item.id, { valorTotal: e.target.value })}
                inputMode="decimal"
                placeholder="0"
              />
            </td>

            <td className="px-1 md:px-2 py-2 text-right">
              <div className={disabledInputClasses}>
                {item.montoCuota ? fmtUYU(n(item.montoCuota)) : "-"}
              </div>
            </td>

<td className="px-1 md:px-2 py-2 align-top">
              <select
className={`${inputBaseClasses} w-full min-w-0 py-3 md:py-1`}
                value={item.suscripcion ? "suscripcion" : "compra"}
                onChange={(e) =>
                  updTarjeta(item.id, { suscripcion: e.target.value === "suscripcion" })
                }
              >
                <option value="compra">Compra</option>
                <option value="suscripcion">Suscripción</option>
              </select>
            </td>

            <td className="px-1 md:px-2 py-2 text-right whitespace-nowrap">
              <button
                type="button"
                onClick={() => remTarjeta(item.id)}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-rose-600 transition hover:text-rose-700"
              >
                Eliminar
              </button>
            </td>
          </tr>
        ))}

        <tr className="bg-gray-50">
<td className="px-1 md:px-2 py-2 align-top">
<button
  type="button"
  onClick={addTarjeta}
  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
>
  Agregar tarjeta
</button>

          </td>
          <td className="px-1 md:px-2 py-2" colSpan={7}></td>
        </tr>
      </tbody>
    </table>
    <p className="px-2 pb-2 pt-2 text-xs text-gray-500">
      El monto de la cuota se calcula automáticamente a partir del total y las cuotas seleccionadas.
    </p>
  </div>
</section>



      {/* Compras planificadas */}
      <section
        id="egresos-compras-card"
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-[#0b1e3a] md:text-xl">
            Compras planificadas
          </h2>
          <p className="text-sm text-gray-600">
            Cuando cargues un valor aquí se pagará en efectivo el mes elegido y se reflejará en Estimación específica.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full table-fixed text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Mes objetivo</th>
                <th className="px-3 py-2 text-right">Valor estimado</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {compras.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/40">
                  <td className="px-3 py-2">
                    <input
                      className={inputBaseClasses}
                      value={item.nombre}
                      onChange={(e) =>
                        updCompra(item.id, { nombre: e.target.value })
                      }
                      placeholder="Ej: Viaje o electrodoméstico"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <MonthField
                      value={item.mes}
                      onChange={(value) => updCompra(item.id, { mes: value })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      className={inputRightClasses}
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
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-rose-600 transition hover:text-rose-700"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="px-3 py-2">
<button
  type="button"
  onClick={addCompra}
  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
>
  Agregar compra
</button>

                </td>
                <td className="px-3 py-2" colSpan={3}></td>
              </tr>
            </tbody>
          </table>
          <p className="px-3 pb-2 text-xs text-gray-500">
            Estas compras se suman automáticamente como egreso único en el mes seleccionado de tu Estimación específica.
          </p>
        </div>
      </section>

      <div className="sticky bottom-2 left-0 right-0 mt-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          {dirty
            ? "Tenés cambios sin guardar."
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
            "inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2 text-sm font-bold transition-colors",
            canSave
              ? "bg-brand-yellow text-brand-navy hover:bg-yellow-300"
              : "cursor-not-allowed bg-gray-200 text-gray-500",
          ].join(" ")}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

    </div>
    </PageSurface>
  );
}

function formatMonthCompact(value) {
  if (!value) return "";
  const [y, m] = String(value).split("-");
  if (!y || !m) return "";
  return `${m}/${y}`; // 12/2025  (si querés 12/25: `${m}/${y.slice(2)}`)
}

function MonthField({ value, onChange }) {
  const inputRef = useRef(null);
  const label = formatMonthCompact(value);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;

    // Chrome/Edge modernos
    if (typeof el.showPicker === "function") {
      el.showPicker();
      return;
    }

    // Fallback (Safari/iOS suele responder a click() si es dentro de un gesto del usuario)
    el.focus();
    el.click();
  };

  return (
    <button
      type="button"
      onClick={openPicker}
      className="min-h-11 w-full cursor-pointer rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
      aria-label="Seleccionar mes"
    >
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 transition-colors hover:border-brand-blue">
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-[#0b1e3a] tabular-nums">
          {label || "MM/AAAA"}
        </span>
      </div>

      {/* Input real, fuera de flujo visual pero presente para el picker */}
      <input
        ref={inputRef}
        type="month"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </button>
  );
}
