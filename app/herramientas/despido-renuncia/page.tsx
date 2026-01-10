"use client";

import { useEffect, useMemo, useState } from "react";

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
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8 text-white">
      <header className="space-y-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Calculadora de liquidación por despido o renuncia</h1>
          <p className="text-sm text-white/70">
            Ingresá tus datos para estimar, de forma aproximada, los montos de liquidación al terminar la relación
            laboral. Esta herramienta simplifica varios conceptos legales y no reemplaza un cálculo profesional.
          </p>
        </div>

        <div className="inline-flex items-center rounded-full bg-white/5 p-1">
          <button
            type="button"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              modoEgreso === "despido"
                ? "bg-emerald-500 text-slate-900 shadow"
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setModoEgreso("despido")}
          >
            Despido
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              modoEgreso === "renuncia"
                ? "bg-emerald-500 text-slate-900 shadow"
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setModoEgreso("renuncia")}
          >
            Renuncia
          </button>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Ingresá tus datos</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <label className="block text-xs font-medium text-white/70 mb-1">Tipo de trabajador</label>
              <select
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={tipoTrabajador}
                onChange={(e) => setTipoTrabajador(e.target.value as TipoTrabajador)}
              >
                <option className="text-slate-900" value="industria">
                  Industria y comercio (empleado mensual)
                </option>
                <option className="text-slate-900" value="jornalero">
                  Jornalero
                </option>
              </select>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-white/70 mb-1">Tipo de pago</label>
              <select
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value as TipoPago)}
              >
                <option className="text-slate-900" value="mensual">
                  Mensual
                </option>
                <option className="text-slate-900" value="jornal">
                  Por jornal
                </option>
              </select>
              <p className="mt-1 text-[11px] text-white/50">
                Si elegís jornalero se fuerza el cálculo por jornal; industria se calcula como mensual.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">
              {tipoTrabajador === "jornalero" ? "Jornal" : "Sueldo nominal"}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">$</span>
              <input
                type="number"
                inputMode="decimal"
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                placeholder={tipoTrabajador === "jornalero" ? "Ej: 1.500" : "Ej: 35.000"}
                value={sueldoNominal}
                onChange={(e) => setSueldoNominal(e.target.value)}
              />
            </div>
            <p className="mt-1 text-xs text-white/50">
              {tipoTrabajador === "jornalero"
                ? "Es lo que ganás por día trabajado, sin aguinaldo ni primas. Abajo indicás cuántos jornales al mes trabajás."
                : "Es el sueldo nominal que figura en tu recibo, antes de descuentos y sin primas."}
            </p>
          </div>

          {tipoPago === "jornal" && (
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-white/70 mb-1">Jornales al mes</label>
                <input
                  type="number"
                  className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                  value={jornalesMes}
                  onChange={(e) => setJornalesMes(e.target.value)}
                />
              </div>
              <p className="text-xs text-white/50 md:w-64">Podés estimar un promedio de 22 jornales al mes.</p>
            </div>
          )}


          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Fecha de ingreso</label>
              <input
                type="date"
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Fecha de egreso</label>
              <input
                type="date"
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={fechaEgreso}
                onChange={(e) => setFechaEgreso(e.target.value)}
              />
            </div>
          </div>
            <p className="text-[11px] text-white/50">
            La antigüedad se usa para estimar la indemnización por despido: 1 sueldo por año o fracción mayor a 6 meses,
            con tope de 6 sueldos.
          </p>
         

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Meses desde el último aguinaldo</label>
              <select
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={mesesDesdeUltimoAguinaldo}
                onChange={(e) => setMesesDesdeUltimoAguinaldo(e.target.value)}
              >
                {["0", "1", "2", "3", "4", "5", "6"].map((opt) => (
                  <option key={opt} className="text-slate-900" value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-white/50">
                Meses trabajados desde el último aguinaldo cobrado (junio o diciembre). Se usa para calcular el
                aguinaldo proporcional.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Días de licencia no gozada</label>
              <input
                type="number"
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={diasLicenciaPendiente}
                onChange={(e) => setDiasLicenciaPendiente(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-white/50">
                Días de licencia generados que todavía no tomaste. El salario vacacional se toma igual al valor de esta
                licencia como aproximación.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr,200px] md:items-end">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Días trabajados en el mes de egreso</label>
              <input
                type="number"
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={diasTrabajadosMesEgreso}
                onChange={(e) => setDiasTrabajadosMesEgreso(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">¿Ya cobraste ese sueldo?</label>
              <select
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={yaCobroUltimoSueldo}
                onChange={(e) => setYaCobroUltimoSueldo(e.target.value as "si" | "no")}
              >
                <option className="text-slate-900" value="no">
                  No
                </option>
                <option className="text-slate-900" value="si">
                  Sí
                </option>
              </select>
              <p className="mt-1 text-[11px] text-white/50">
                Si ya te pagaron esos días, no se vuelven a sumar en el cálculo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {mostrarResultados && (
        <section className="space-y-3 pt-2">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-white/60">Monto estimado de liquidación por egreso</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-300">
              {`$ ${resultado.total.toLocaleString("es-UY", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </p>
            <p className="text-[13px] text-white/70">
              Incluye sueldo mes, aguinaldo proporcional, licencia, salario vacacional y, si corresponde,
              indemnización por despido.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
            <div className="grid gap-2 sm:grid-cols-2 text-xs text-white/70">
              <p>
                Sueldo del mes de egreso:{" "}
                <span className="font-semibold text-white">
                  {`$ ${resultado.sueldoMes.toLocaleString("es-UY", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                Aguinaldo proporcional:{" "}
                <span className="font-semibold text-white">
                  {`$ ${resultado.aguinaldoProporcional.toLocaleString("es-UY", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                Licencia no gozada:{" "}
                <span className="font-semibold text-white">
                  {`$ ${resultado.licenciaNoGozada.toLocaleString("es-UY", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                Salario vacacional (aprox.):{" "}
                <span className="font-semibold text-white">
                  {`$ ${resultado.salarioVacacional.toLocaleString("es-UY", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                Indemnización por despido:{" "}
                <span className="font-semibold text-white">
                  {`$ ${resultado.indemnizacionDespido.toLocaleString("es-UY", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                </span>
                {modoEgreso === "renuncia" && (
                  <span className="block text-[11px] text-white/60">
                    En la renuncia no hay indemnización por despido.
                  </span>
                )}
              </p>
            </div>
            <p className="mt-2 text-[11px] text-white/50">
              Esta herramienta es orientativa y simplifica la normativa laboral uruguaya. No contempla todos los casos
              especiales (enfermedad, accidente, embarazo, notoria mala conducta, despidos especiales, etc.). Para un
              cálculo preciso de tu situación podés consultar a un profesional o usar simuladores especializados.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
