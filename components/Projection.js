"use client";

import { useEffect, useState, useMemo } from "react";
import { addMonths, startOfMonth, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";

const LS_PERFIL = "miadmi:perfil";
const LS_MOVS = "miadmi:movs";

const n = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

const fmtUYU = (v, maxFrac = 2) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: maxFrac,
  }).format(v || 0);

const fmtMesLargo = (d) => format(d, "MMMM yyyy", { locale: es });

export default function Projection({ form }) {
  const [perfil, setPerfil] = useState({});
  const [movs, setMovs] = useState([]);

  useEffect(() => {
    try {
      const rawP = localStorage.getItem(LS_PERFIL);
      if (rawP) setPerfil(JSON.parse(rawP));
    } catch {}
    try {
      const rawM = localStorage.getItem(LS_MOVS);
      if (rawM) setMovs(JSON.parse(rawM));
    } catch {}
  }, []);

  // Fecha base: 1º del mes
  const baseDate = useMemo(() => {
    const src = form?.fecha_inicio || perfil?.fecha_inicio || "";
    if (src) return startOfMonth(parseISO(src));
    const today = new Date();
    return startOfMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }, [form?.fecha_inicio, perfil?.fecha_inicio]);

  // —— Cálculos (idénticos a tu lógica, reorganizados con useMemo) ——
  const calc = useMemo(() => {
    // Ingresos y gastos fijos desde Flujo fijo (perfil)
    const ingresoBase =
      n(perfil.ingreso_mensual) +
      n(perfil.ingreso_extra);

    const fijosBase =
      n(perfil.alquiler_hipoteca) +
      n(perfil.luz_agua) +
      n(perfil.telecom) +
      n(perfil.super_gasto) +
      n(perfil.transporte) +
      n(perfil.tarjetas) +
      n(perfil.seguro_salud) +
      n(perfil.otros);

    // Recurrentes desde movimientos
    const recIngresos = (Array.isArray(movs) ? movs : [])
      .filter((m) => m?.recurrente && m?.tipo === "ingreso")
      .reduce((a, b) => a + n(b.monto), 0);

    const recGastos = (Array.isArray(movs) ? movs : [])
      .filter((m) => m?.recurrente && m?.tipo === "gasto")
      .reduce((a, b) => a + n(b.monto), 0);

    const ingreso = ingresoBase + recIngresos;
    const fijos = fijosBase + recGastos;

    const saldoBase = ingreso - fijos;
    const capacidad = Math.max(0, saldoBase);

    // Objetivo (toma de form o de perfil guardado)
    const montoObj = Math.max(0, n(form?.objetivo_monto ?? perfil?.objetivo_monto));
    const mesesObj = Math.max(1, n(form?.objetivo_meses ?? perfil?.objetivo_meses));
    const aporteDeseado = mesesObj > 0 ? montoObj / mesesObj : 0;
    const aporteUsado = Math.min(aporteDeseado, capacidad);

    const llegaConDeseado = aporteDeseado > 0 && aporteDeseado <= capacidad;
    const mesesConCapacidad = capacidad > 0 ? Math.ceil(montoObj / capacidad) : Infinity;

    const fechaLlegadaDeseado = llegaConDeseado
      ? addMonths(baseDate, Math.max(0, Math.ceil(mesesObj) - 1))
      : null;

    const fechaLlegadaCapacidad =
      capacidad > 0 && Number.isFinite(mesesConCapacidad)
        ? addMonths(baseDate, Math.max(0, mesesConCapacidad - 1))
        : null;

    // Serie 12 meses (saldo sin/ con ahorro)
    const data = Array.from({ length: 12 }, (_, i) => {
      const fecha = addMonths(baseDate, i);
      const aporteMes = i < mesesObj ? aporteUsado : 0;
      const saldoFinal = saldoBase - aporteMes;
      return {
        etiqueta: format(fecha, "MMM yyyy", { locale: es }),
        saldoBase,
        saldoFinal,
      };
    });

    // Mensaje
    let mensajePrincipal = "";
    if (aporteDeseado <= 0 || montoObj <= 0) {
      mensajePrincipal =
        "Definí un objetivo con monto y meses para ver tu plan de ahorro.";
    } else if (!llegaConDeseado) {
      mensajePrincipal = `Si querés ahorrar ${fmtUYU(
        aporteDeseado
      )} por mes, no te alcanza: quedarías en saldo negativo. Con tu capacidad actual (${fmtUYU(
        capacidad
      )}/mes) tardarías aproximadamente ${
        Number.isFinite(mesesConCapacidad) ? mesesConCapacidad : "∞"
      } meses${
        fechaLlegadaCapacidad
          ? ` (llegarías en ${fmtMesLargo(fechaLlegadaCapacidad)})`
          : ""
      }.`;
    } else {
      mensajePrincipal = `Ahorrando ${fmtUYU(
        aporteDeseado
      )} por mes, llegarás en ${fmtMesLargo(fechaLlegadaDeseado)}.`;
    }

    return {
      // bases
      ingresoBase,
      fijosBase,
      recIngresos,
      recGastos,
      ingreso,
      fijos,
      // métricas clave
      saldoBase,
      capacidad,
      aporteDeseado,
      aporteUsado,
      mesesObj,
      // texto y chart
      mensajePrincipal,
      data,
    };
  }, [perfil, movs, form?.objetivo_monto, form?.objetivo_meses, baseDate]);

  const {
    ingresoBase,
    fijosBase,
    recIngresos,
    recGastos,
    ingreso,
    fijos,
    saldoBase,
    capacidad,
    aporteDeseado,
    aporteUsado,
    mesesObj,
    mensajePrincipal,
    data,
  } = calc;

  const esSostenible = aporteUsado >= aporteDeseado && aporteDeseado > 0;

  return (
    <section className="rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70">
      <h2 className="text-xl font-semibold mb-4">Proyección 12 meses</h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Saldo base (sin ahorro)
          </div>
          <div className="text-xl font-semibold">{fmtUYU(saldoBase, 0)}</div>
        </div>
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Capacidad de ahorro
          </div>
          <div className="text-xl font-semibold">{fmtUYU(capacidad, 0)}</div>
          <div className="text-[11px] text-gray-500">max(0, ingreso - gastos)</div>
        </div>
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Aporte deseado
          </div>
          <div className="text-xl font-semibold">{fmtUYU(aporteDeseado)}</div>
          <div className="text-[11px] text-gray-500">
            Meta: {fmtUYU(Math.max(0, n(form?.objetivo_monto ?? perfil?.objetivo_monto)))}
            {" · "}
            {mesesObj} meses
          </div>
        </div>
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Aporte usado
          </div>
          <div className="text-xl font-semibold">{fmtUYU(aporteUsado)}</div>
          <div className="text-[11px] text-gray-500">
            {esSostenible ? "OK (sostenible)" : "Limitado por capacidad"}
          </div>
        </div>
      </div>

      {/* Mensaje guía */}
      <div
        className={`mb-4 rounded-xl border p-3 ${
          esSostenible
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="text-sm">{mensajePrincipal}</div>
      </div>

      {/* Resumen fuentes */}
      <div className="mb-4 text-sm text-gray-700">
        <div>
          Ingresos fijos: <b>{fmtUYU(ingresoBase)}</b>
          {recIngresos ? (
            <>
              {" · "}Recurrentes: <b>{fmtUYU(recIngresos)}</b>
            </>
          ) : null}
          {" · "}Total: <b>{fmtUYU(ingreso)}</b>
        </div>
        <div>
          Gastos fijos: <b>{fmtUYU(fijosBase)}</b>
          {recGastos ? (
            <>
              {" · "}Recurrentes: <b>{fmtUYU(recGastos)}</b>
            </>
          ) : null}
          {" · "}Total: <b>{fmtUYU(fijos)}</b>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="etiqueta" tickMargin={8} interval={0} />
            <YAxis
              tickFormatter={(v) =>
                new Intl.NumberFormat("es-UY", {
                  style: "currency",
                  currency: "UYU",
                  maximumFractionDigits: 0,
                }).format(v)
              }
              width={90}
            />
            <Tooltip
              formatter={(value, name) => {
                const label =
                  name === "saldoFinal"
                    ? "Saldo (con ahorro)"
                    : name === "saldoBase"
                    ? "Saldo (sin ahorro)"
                    : name;
                return [fmtUYU(value), label];
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#999" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="saldoFinal"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="saldoBase"
              dot={false}
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
