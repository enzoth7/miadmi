"use client";

import { useEffect, useMemo, useState } from "react";
import { PageSurface, ResultPanel } from "../../../components/financial/FinancialPrimitives";

type ModoEgreso = "despido" | "renuncia";
type TipoTrabajador = "industria" | "jornalero";
type TipoPago = "mensual" | "jornal";

type ResultadoLiquidacion = {
  sueldoMes: number;
  aguinaldoProporcional: number;
  licenciaNoGozada: number;
  salarioVacacional: number;
  indemnizacionDespido: number;
  total: number;
};

type CalcularInput = {
  baseNominal: number;
  modoEgreso: ModoEgreso;
  mesesDesdeUltimoAguinaldoNum: number;
  diasLicenciaPendienteNum: number;
  diasTrabajadosMesEgresoNum: number;
  yaCobroUltimoSueldo: "si" | "no";
  fechaIngreso: string;
  fechaEgreso: string;
};

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function calcularAniosIndemnizacion(fechaIngresoStr: string, fechaEgresoStr: string): number {
  const inicio = new Date(fechaIngresoStr);
  const fin = new Date(fechaEgresoStr);
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin <= inicio) return 0;

  const diffMs = fin.getTime() - inicio.getTime();
  const diffDias = diffMs / (1000 * 60 * 60 * 24);
  const anios = Math.floor(diffDias / 365);
  const restoDias = diffDias - anios * 365;
  const restoMeses = restoDias / 30;

  let aniosIndemnizacion = anios;
  if (restoMeses > 6) {
    aniosIndemnizacion += 1; // fracción mayor a 6 meses cuenta como año entero
  }

  // límite legal general: máximo 6 mensualidades
  return Math.min(aniosIndemnizacion, 6);
}

function calcularLiquidacion({
  baseNominal,
  modoEgreso,
  mesesDesdeUltimoAguinaldoNum,
  diasLicenciaPendienteNum,
  diasTrabajadosMesEgresoNum,
  yaCobroUltimoSueldo,
  fechaIngreso,
  fechaEgreso,
}: CalcularInput): ResultadoLiquidacion {
  const baseInvalida = !baseNominal || Number.isNaN(baseNominal) || baseNominal <= 0;
  const inicio = new Date(fechaIngreso);
  const fin = new Date(fechaEgreso);
  const fechasValidas = !Number.isNaN(inicio.getTime()) && !Number.isNaN(fin.getTime()) && fin > inicio;

  if (baseInvalida || !fechasValidas) {
    return {
      sueldoMes: 0,
      aguinaldoProporcional: 0,
      licenciaNoGozada: 0,
      salarioVacacional: 0,
      indemnizacionDespido: 0,
      total: 0,
    };
  }

  const valorDia = baseNominal / 30;
  const sueldoMes =
    yaCobroUltimoSueldo === "no" && diasTrabajadosMesEgresoNum > 0 ? valorDia * diasTrabajadosMesEgresoNum : 0;

  const meses = clampNumber(mesesDesdeUltimoAguinaldoNum, 0, 6);
  const aguinaldoProporcional = (baseNominal / 12) * meses;

  const diasLicencia = diasLicenciaPendienteNum > 0 ? diasLicenciaPendienteNum : 0;
  const licenciaNoGozada = valorDia * diasLicencia;

  const salarioVacacional = licenciaNoGozada;

  const indemnizacionDespido =
    modoEgreso === "despido" ? calcularAniosIndemnizacion(fechaIngreso, fechaEgreso) * baseNominal : 0;

  const total = sueldoMes + aguinaldoProporcional + licenciaNoGozada + salarioVacacional + indemnizacionDespido;

  return {
    sueldoMes,
    aguinaldoProporcional,
    licenciaNoGozada,
    salarioVacacional,
    indemnizacionDespido,
    total,
  };
}

export default function DespidoRenunciaPage() {
  const [modoEgreso, setModoEgreso] = useState<ModoEgreso>("despido");
  const [tipoTrabajador, setTipoTrabajador] = useState<TipoTrabajador>("industria");
  const [tipoPago, setTipoPago] = useState<TipoPago>("mensual");
  const [sueldoNominal, setSueldoNominal] = useState<string>("");
  const [jornalesMes, setJornalesMes] = useState<string>("22");
  const [fechaIngreso, setFechaIngreso] = useState<string>("");
  const [fechaEgreso, setFechaEgreso] = useState<string>("");
  const [mesesDesdeUltimoAguinaldo, setMesesDesdeUltimoAguinaldo] = useState<string>("0");
  const [diasLicenciaPendiente, setDiasLicenciaPendiente] = useState<string>("");
  const [diasTrabajadosMesEgreso, setDiasTrabajadosMesEgreso] = useState<string>("");
  const [yaCobroUltimoSueldo, setYaCobroUltimoSueldo] = useState<"si" | "no">("no");

  useEffect(() => {
    if (tipoTrabajador === "jornalero" && tipoPago !== "jornal") {
      setTipoPago("jornal");
    }
    if (tipoTrabajador === "industria" && tipoPago !== "mensual") {
      setTipoPago("mensual");
    }
  }, [tipoPago, tipoTrabajador]);

  const sueldoNominalNum = parseFloat(sueldoNominal.replace(",", "."));
  const jornalesNum = parseInt(jornalesMes || "0", 10);
  const baseNominal =
    tipoPago === "jornal"
      ? sueldoNominalNum * (Number.isNaN(jornalesNum) ? 0 : jornalesNum)
      : sueldoNominalNum;

  const mesesDesdeUltimoAguinaldoNum = parseInt(mesesDesdeUltimoAguinaldo || "0", 10);
  const diasLicenciaPendienteNum = parseInt(diasLicenciaPendiente || "0", 10);
  const diasTrabajadosMesEgresoNum = parseInt(diasTrabajadosMesEgreso || "0", 10);

  const resultado = useMemo(
    () =>
      calcularLiquidacion({
        baseNominal,
        modoEgreso,
        mesesDesdeUltimoAguinaldoNum,
        diasLicenciaPendienteNum,
        diasTrabajadosMesEgresoNum,
        yaCobroUltimoSueldo,
        fechaIngreso,
        fechaEgreso,
      }),
    [
      baseNominal,
      modoEgreso,
      mesesDesdeUltimoAguinaldoNum,
      diasLicenciaPendienteNum,
      diasTrabajadosMesEgresoNum,
      yaCobroUltimoSueldo,
      fechaIngreso,
      fechaEgreso,
    ]
  );

  const mostrarResultados = resultado.total > 0;

  return (
    <PageSurface>
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
          Calculadora de liquidación por despido o renuncia
        </h1>
        <p className="text-sm text-gray-600">
          Ingresá tus datos para estimar, de forma aproximada, los montos de liquidación al terminar la relación laboral.
        </p>

        <div className="inline-flex items-center rounded-full bg-gray-100 p-1.5 border border-gray-200 mt-2">
          <button
            type="button"
            className={`min-h-11 rounded-full px-5 py-2 text-xs font-bold transition-all sm:text-sm ${
              modoEgreso === "despido"
                ? "bg-brand-yellow text-brand-navy shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
            onClick={() => setModoEgreso("despido")}
          >
            Despido
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-full px-5 py-2 text-xs font-bold transition-all sm:text-sm ${
              modoEgreso === "renuncia"
                ? "bg-brand-yellow text-brand-navy shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
            onClick={() => setModoEgreso("renuncia")}
          >
            Renuncia
          </button>
        </div>
      </header>

      <fieldset className="space-y-4 border-t border-slate-200 pt-6">
        <legend className="pr-4 text-base font-bold text-brand-navy">Ingresá tus datos</legend>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <label htmlFor="liquidacion-tipo-trabajador" className="block text-xs font-bold text-gray-700 mb-1">Tipo de trabajador</label>
              <select
                id="liquidacion-tipo-trabajador"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                value={tipoTrabajador}
                onChange={(e) => setTipoTrabajador(e.target.value as TipoTrabajador)}
              >
                <option value="industria">Industria y comercio (empleado mensual)</option>
                <option value="jornalero">Jornalero</option>
              </select>
            </div>

            <div className="w-full md:w-48">
              <label htmlFor="liquidacion-tipo-pago" className="block text-xs font-bold text-gray-700 mb-1">Tipo de pago</label>
              <select
                id="liquidacion-tipo-pago"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value as TipoPago)}
              >
                <option value="mensual">Mensual</option>
                <option value="jornal">Por jornal</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="liquidacion-sueldo" className="block text-xs font-bold text-gray-700 mb-1">
              {tipoTrabajador === "jornalero" ? "Jornal" : "Sueldo nominal"}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 font-bold text-[#0b1e3a]">
                $
              </div>
              <input
                id="liquidacion-sueldo"
                type="number"
                inputMode="decimal"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                placeholder={tipoTrabajador === "jornalero" ? "Ej: 1.500" : "Ej: 45.000"}
                value={sueldoNominal}
                onChange={(e) => setSueldoNominal(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="liquidacion-fecha-ingreso" className="block text-xs font-bold text-gray-700 mb-1">Fecha de ingreso</label>
              <input
                id="liquidacion-fecha-ingreso"
                type="date"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="liquidacion-fecha-egreso" className="block text-xs font-bold text-gray-700 mb-1">Fecha de egreso</label>
              <input
                id="liquidacion-fecha-egreso"
                type="date"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                value={fechaEgreso}
                onChange={(e) => setFechaEgreso(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="liquidacion-meses-aguinaldo" className="block text-xs font-bold text-gray-700 mb-1">Meses desde último aguinaldo (0 a 6)</label>
              <input
                id="liquidacion-meses-aguinaldo"
                type="number"
                min={0}
                max={6}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                value={mesesDesdeUltimoAguinaldo}
                onChange={(e) => setMesesDesdeUltimoAguinaldo(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="liquidacion-licencia" className="block text-xs font-bold text-gray-700 mb-1">Días de licencia pendientes</label>
              <input
                id="liquidacion-licencia"
                type="number"
                min={0}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                value={diasLicenciaPendiente}
                onChange={(e) => setDiasLicenciaPendiente(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="liquidacion-dias-egreso" className="block text-xs font-bold text-gray-700 mb-1">Días trabajados mes de egreso</label>
              <input
                id="liquidacion-dias-egreso"
                type="number"
                min={0}
                max={30}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                value={diasTrabajadosMesEgreso}
                onChange={(e) => setDiasTrabajadosMesEgreso(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="liquidacion-cobro" className="block text-xs font-bold text-gray-700 mb-1">¿Ya cobraste ese sueldo?</label>
              <select
                id="liquidacion-cobro"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                value={yaCobroUltimoSueldo}
                onChange={(e) => setYaCobroUltimoSueldo(e.target.value as "si" | "no")}
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
          </div>
        </div>
      </fieldset>

      {mostrarResultados && (
        <ResultPanel className="mt-8 space-y-6" eyebrow="Resultado estimado">
          <div>
            <p className="mt-5 text-sm font-semibold text-white">Monto estimado de liquidación por egreso</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-emerald-300 sm:text-4xl">
              {`$ ${resultado.total.toLocaleString("es-UY", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Incluye sueldo proporcional, aguinaldo, licencia, salario vacacional e indemnización si corresponde.
            </p>
          </div>

          <div className="border-t border-white/15 pt-5">
            <div className="grid gap-3 sm:grid-cols-2 text-xs text-gray-300">
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-gray-400">Sueldo del mes de egreso:</span>
                <span className="font-bold text-white font-mono">{`$ ${resultado.sueldoMes.toLocaleString("es-UY", { minimumFractionDigits: 2 })}`}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-gray-400">Aguinaldo proporcional:</span>
                <span className="font-bold text-white font-mono">{`$ ${resultado.aguinaldoProporcional.toLocaleString("es-UY", { minimumFractionDigits: 2 })}`}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-gray-400">Licencia no gozada:</span>
                <span className="font-bold text-white font-mono">{`$ ${resultado.licenciaNoGozada.toLocaleString("es-UY", { minimumFractionDigits: 2 })}`}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-gray-400">Salario vacacional (aprox.):</span>
                <span className="font-bold text-white font-mono">{`$ ${resultado.salarioVacacional.toLocaleString("es-UY", { minimumFractionDigits: 2 })}`}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10 sm:col-span-2">
                <span className="text-gray-400">Indemnización por despido:</span>
                <span className="font-bold tabular-nums text-white">{`$ ${resultado.indemnizacionDespido.toLocaleString("es-UY", { minimumFractionDigits: 2 })}`}</span>
              </div>
            </div>
            <p className="pt-3 text-[11px] text-gray-400">
              Esta herramienta es orientativa y simplifica la normativa laboral de Uruguay.
            </p>
          </div>
        </ResultPanel>
      )}
    </div>
    </PageSurface>
  );
}
