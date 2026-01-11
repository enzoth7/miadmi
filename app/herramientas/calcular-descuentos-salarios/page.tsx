"use client";

import { useState } from "react";

type TipoTrabajador = "industria" | "jornalero";
type TipoPago = "mensual" | "jornal";
type SituacionFonasa =
  | "sinHijosSinConyuge"
  | "conHijos"
  | "conConyuge"
  | "conHijosYConyuge";

type Resultado = {
  aporteJubilatorio: number;
  aporteFonasa: number;
  aporteFrl: number;
  aporteIrpf: number;
  totalDescuentos: number;
  sueldoLiquido: number;
};

const BPC_2025 = 6576;

function obtenerTasaFonasa(baseNominal: number, situacion: SituacionFonasa): number {
  const supera25Bpc = baseNominal > 2.5 * BPC_2025;

  switch (situacion) {
    case "sinHijosSinConyuge":
      return supera25Bpc ? 0.045 : 0.03;
    case "conHijos":
    case "conConyuge":
      return supera25Bpc ? 0.06 : 0.045;
    case "conHijosYConyuge":
      return supera25Bpc ? 0.08 : 0.06;
    default:
      return 0.03;
  }
}

function calcularIrpf(baseIrpf: number): number {
  if (!baseIrpf || baseIrpf <= 0 || Number.isNaN(baseIrpf)) return 0;

  type Tramo = {
    desdeBpc: number;
    hastaBpc: number | null; // null = sin límite superior
    tasa: number; // 0.10 = 10%
  };

  const tramos: Tramo[] = [
  { desdeBpc: 0, hastaBpc: 3, tasa: 0.10 },   // 7–10 BPC → tramo de 3 BPC
  { desdeBpc: 3, hastaBpc: 8, tasa: 0.15 },   // 10–15 BPC → tramo de 5 BPC
  { desdeBpc: 8, hastaBpc: 23, tasa: 0.24 },  // 15–30 BPC → tramo de 15 BPC
  { desdeBpc: 23, hastaBpc: 43, tasa: 0.25 }, // 30–50
  { desdeBpc: 43, hastaBpc: 68, tasa: 0.27 }, // 50–75
  { desdeBpc: 68, hastaBpc: 108, tasa: 0.31 },// 75–115
  { desdeBpc: 108, hastaBpc: null, tasa: 0.36 },
];

  let impuesto = 0;

  for (const tramo of tramos) {
    const desde = tramo.desdeBpc * BPC_2025;
    const hasta = tramo.hastaBpc ? tramo.hastaBpc * BPC_2025 : Infinity;

    if (baseIrpf <= desde) {
      continue;
    }

    const baseEnTramo = Math.min(baseIrpf, hasta) - desde;
    if (baseEnTramo > 0 && tramo.tasa > 0) {
      impuesto += baseEnTramo * tramo.tasa;
    }

    if (baseIrpf <= hasta) {
      break;
    }
  }

  return impuesto;
}

function calcularDescuentosTotales(
  baseNominal: number,
  situacion: SituacionFonasa,
  fondoSolidaridad: number,
  adicionalFondo: number,
  aporteCajaProfesional: number,
  deduccionHijos: number
): Resultado | null {
  if (!baseNominal || baseNominal <= 0 || Number.isNaN(baseNominal)) {
    return null;
  }

  const aporteJubilatorio = baseNominal * 0.15;
  const tasaFonasa = obtenerTasaFonasa(baseNominal, situacion);
  const aporteFonasa = baseNominal * tasaFonasa;

  const aporteFrl = baseNominal * 0.00100;

  const totalBps =
    aporteJubilatorio + aporteFonasa + aporteFrl + fondoSolidaridad + adicionalFondo + aporteCajaProfesional;
  const mnig = 7 * BPC_2025;
  const incremento6 = baseNominal * 0.06;
  const rentaComputable = (baseNominal + incremento6) - mnig;
  const irpfBruto = rentaComputable > 0 ? calcularIrpf(rentaComputable) : 0;
  const tasaDeduccion =
    rentaComputable > 0 && rentaComputable <= 15 * BPC_2025 ? 0.14 : rentaComputable > 0 ? 0.08 : 0;
  const deduccion = totalBps * tasaDeduccion + deduccionHijos;
  const aporteIrpf = Math.max(irpfBruto - deduccion, 0);

  const totalDescuentos = totalBps + aporteIrpf;
  const sueldoLiquido = baseNominal - totalDescuentos;

  return {
    aporteJubilatorio,
    aporteFonasa,
    aporteFrl,
    aporteIrpf,
    totalDescuentos,
    sueldoLiquido,
  };
}


export default function CalcularDescuentosPage() {
  const [sueldoNominal, setSueldoNominal] = useState<string>("");
  const [tipoTrabajador, setTipoTrabajador] = useState<TipoTrabajador>("industria");
  const [tipoPago, setTipoPago] = useState<TipoPago>("mensual");
  const [jornalesMes, setJornalesMes] = useState<string>("22");
  const [situacionFonasa, setSituacionFonasa] =
    useState<SituacionFonasa>("sinHijosSinConyuge");
  const regimenLaboral = tipoTrabajador;
  const [fondoSolidaridad, setFondoSolidaridad] = useState<string>("0");
  const [adicionalFondo, setAdicionalFondo] = useState<string>("0");
  const [aporteCajaProfesional, setAporteCajaProfesional] = useState<string>("0");
  const [porcentajePersonasACargo, setPorcentajePersonasACargo] = useState<string>("100");
  const [hijos, setHijos] = useState<string>("0");
  const [hijosDiscapacidad, setHijosDiscapacidad] = useState<string>("0");

  const sueldoNominalNum = parseFloat(sueldoNominal.replace(",", "."));
  const jornalesNum = parseInt(jornalesMes || "0", 10);
  const baseNominal =
    tipoPago === "jornal"
      ? sueldoNominalNum * (Number.isNaN(jornalesNum) ? 0 : jornalesNum)
      : sueldoNominalNum;
  const fondoSolidaridadNum = parseFloat(fondoSolidaridad) || 0;
  const adicionalFondoNum = parseFloat(adicionalFondo) || 0;
  const aporteCajaProfesionalNum = parseFloat(aporteCajaProfesional) || 0;
  const porcentajePersonasACargoNum = parseFloat(porcentajePersonasACargo) || 0;
  const hijosNum = parseInt(hijos || "0", 10);
  const hijosDiscapacidadNum = parseInt(hijosDiscapacidad || "0", 10);
  const deduccionHijos =
    (hijosNum * 7122 + hijosDiscapacidadNum * 14245) * (porcentajePersonasACargoNum / 100);

  const resultado = calcularDescuentosTotales(
    baseNominal,
    situacionFonasa,
    fondoSolidaridadNum,
    adicionalFondoNum,
    aporteCajaProfesionalNum,
    deduccionHijos
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">
          Calculadora de descuentos de salario
        </h1>
        <p className="text-sm text-white/70">
          Ingresá tu sueldo nominal y algunos datos básicos para estimar cuánto cobrás en mano después de BPS, Fonasa, FRL e IRPF. Los resultados son aproximados y orientativos.
        </p>

        <div className="mt-3 space-y-2 text-sm text-white/70">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <h4 className="text-sm font-semibold text-white/90">Sueldo nominal</h4>
              <p className="mt-1 text-[13px] leading-snug">
                Es lo que ganás <span className="font-semibold">antes de descuentos</span>. También se le dice
                <span className="font-semibold"> sueldo bruto</span>.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <h4 className="text-sm font-semibold text-white/90">Sueldo líquido</h4>
              <p className="mt-1 text-[13px] leading-snug">
                Es lo que efectivamente <span className="font-semibold">cobrás en mano</span>, después de BPS, Fonasa,
                IRPF y otros descuentos. También se le dice <span className="font-semibold">sueldo neto</span>.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Ingresá tus datos</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <label className="block text-xs font-medium text-white/70 mb-1">
                Tipo de trabajador
              </label>
              <select
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={tipoTrabajador}
                onChange={(e) => {
                  const nuevo = e.target.value as TipoTrabajador;
                  setTipoTrabajador(nuevo);
                  if (nuevo === "jornalero" && tipoPago === "mensual") {
                    setTipoPago("jornal");
                  }
                  if (nuevo === "industria") {
                    setTipoPago("mensual");
                  }
                }}
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
              <label className="block text-xs font-medium text-white/70 mb-1">
                Tipo de pago
              </label>
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
                className="w-full bg-white/5 border border-white/10 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                placeholder={tipoTrabajador === "jornalero" ? "Ej: 1.500" : "Ej: 35.000"}
                value={sueldoNominal}
                onChange={(e) => setSueldoNominal(e.target.value)}
              />
            </div>
            <p className="mt-1 text-xs text-white/50">
              {tipoTrabajador === "jornalero"
                ? "Es el monto que ganás por día trabajado, sin incluir aguinaldo ni primas. Abajo indicás cuántos jornales al mes trabajás."
                : "Es el sueldo nominal que figura en tu recibo, sin incluir aguinaldo ni primas."}
            </p>
          </div>

 {tipoPago === "jornal" && (
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Jornales al mes
                </label>
                <input
                  type="number"
                  className="w-full bg-white/5 border border-white/10 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  value={jornalesMes}
                  onChange={(e) => setJornalesMes(e.target.value)}
                />
              </div>
              <p className="text-xs text-white/50 md:w-64">
                Si sos jornalero, podés estimar un promedio de 22 jornales al mes.
              </p>
            </div>
          )}

          <div>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <label className="block text-xs font-medium text-white/70 mb-1">
                Fondo de Solidaridad
              </label>
              <select
               className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={fondoSolidaridad}
                onChange={(e) => setFondoSolidaridad(e.target.value)}
              >
                <option className="text-slate-900" value="0">
                  Sin Fondo de Solidaridad
                </option>
                <option className="text-slate-900" value="274">
                  1/2 BPC anual
                </option>
                <option className="text-slate-900" value="548">
                  1 BPC anual
                </option>
                <option className="text-slate-900" value="1096">
                  2 BPC anual
                </option>
              </select>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-white/70 mb-1">
                Adicional Fondo
              </label>
              <select
               className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={adicionalFondo}
                onChange={(e) => setAdicionalFondo(e.target.value)}
              >
                <option className="text-slate-900" value="0">
                  No
                </option>
                <option className="text-slate-900" value="457">
                  Si
                </option>
              </select>
            </div>
          </div>
 {/* 🔁 NUEVO TEXTO: valor de la BPC */}
  <p className=" mt-1 text-[12px] text-white/50">
    Para estos cálculos tomamos como referencia el valor vigente de la{" "}
    <span className="font-semibold text-white/80">
      BPC: 1 BPC = $ {BPC_2025.toLocaleString("es-UY")}
    </span>{" "}
    (Base de Prestaciones y Contribuciones).
  </p>
  </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <label className="block text-xs font-medium text-white/70 mb-1">
                Caja profesional (CJPPU / Notarial)
              </label>
              <select
           className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={aporteCajaProfesional}
                onChange={(e) => setAporteCajaProfesional(e.target.value)}
              >
                <option className="text-slate-900" value="0">
                  Sin caja profesional
                </option>
                <option className="text-slate-900" value="7000">
                  CJPPU mínimo (~$7.000)
                </option>
                <option className="text-slate-900" value="4000">
                  Caja Notarial base (~$4.000)
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">
              Situación familiar para Fonasa
            </label>
            <select
             className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
              value={situacionFonasa}
              onChange={(e) => setSituacionFonasa(e.target.value as SituacionFonasa)}
            >
              <option className="text-slate-900" value="sinHijosSinConyuge">3% - 4,5% - Sin hijos ni cónyuge/concubino a cargo</option>
              <option className="text-slate-900" value="conHijos">4,5% - 6% - Con hijos a cargo</option>
              <option className="text-slate-900" value="conConyuge">4,5% - 6% - Con cónyuge/concubino a cargo</option>
              <option className="text-slate-900" value="conHijosYConyuge">6% - 8% - Con hijos y cónyuge/concubino a cargo</option>
            </select>
            <p className="mt-1 text-xs text-white/50">
              Estos datos se usan solo para estimar el porcentaje de Fonasa. El % depende si ganas más o menos de 2,5 BPC.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="w-full md:w-40">
              <label className="block text-xs font-medium text-white/70 mb-1">
                Porcentaje aplicado
              </label>
              <select
               className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={porcentajePersonasACargo}
                onChange={(e) => setPorcentajePersonasACargo(e.target.value)}
              >
                <option className="text-slate-900" value="100">
                  100%
                </option>
                <option className="text-slate-900" value="50">
                  50%
                </option>
                <option className="text-slate-900" value="0">
                  0%
                </option>
              </select>
            </div>

            <div className="w-full md:w-40">
              <label className="block text-xs font-medium text-white/70 mb-1">
                Hijos sin discapacidad
              </label>
              <select
              className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                onChange={(e) => setHijos(e.target.value)}
              >
                {["0", "1", "2", "3", "4", "5"].map((opt) => (
                  <option key={opt} className="text-slate-900" value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-40">
              <label className="block text-xs font-medium text-white/70 mb-1">
                Hijos con discapacidad
              </label>
              <select
                className="w-full bg-sky-950/40 border border-sky-500/30 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-0"
                value={hijosDiscapacidad}
                onChange={(e) => setHijosDiscapacidad(e.target.value)}
              >
                {["0", "1", "2", "3", "4", "5"].map((opt) => (
                  <option key={opt} className="text-slate-900" value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {resultado && (
        <section className="pt-4 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 md:flex-1">
              <p className="text-xs uppercase tracking-wide text-white/60">
                Sueldo líquido
              </p>
              <p className="mt-1 text-3xl font-semibold text-emerald-300">
                {`$ ${resultado.sueldoLiquido.toLocaleString("es-UY", {
                  maximumFractionDigits: 2,
                })}`}
              </p>
            </div>

            <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 md:w-64">
              <p className="text-xs uppercase tracking-wide text-white/60">
                Total de descuentos e impuestos
              </p>
              <p className="mt-1 text-3xl font-semibold text-red-200">
                {`$ ${resultado.totalDescuentos.toLocaleString("es-UY", {
                  maximumFractionDigits: 2,
                })}`}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 p-3">
            <div className="grid gap-2 sm:grid-cols-2 text-xs text-white/70">
              <p>
                Sueldo nominal:{" "}
                <span className="font-semibold text-white">
                  {`$ ${baseNominal.toLocaleString("es-UY", {
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                BPS (15%):{" "}
                <span className="font-semibold text-white">
                  {`$ ${resultado.aporteJubilatorio.toLocaleString("es-UY", {
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                Fonasa:{" "}
                <span className="font-semibold text-white">
                  {`$ ${resultado.aporteFonasa.toLocaleString("es-UY", {
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                FRL (0,10%):{" "}
                <span className="font-semibold text-white">
                  {`$ ${resultado.aporteFrl.toLocaleString("es-UY", {
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                IRPF estimado:{" "}
                <span className="font-semibold text-white">
                  {`$ ${resultado.aporteIrpf.toLocaleString("es-UY", {
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                Tipo de trabajador:{" "}
                <span className="font-semibold text-white">
                  {regimenLaboral === "industria" ? "Industria y comercio" : "Jornalero"}
                </span>
              </p>
              <p>
                Fondo de solidaridad:{" "}
                <span className="font-semibold text-white">
                  {`$ ${fondoSolidaridadNum.toLocaleString("es-UY", {
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                Adicional fondo:{" "}
                <span className="font-semibold text-white">
                  {`$ ${adicionalFondoNum.toLocaleString("es-UY", {
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                Aporte CJPPU / Caja Notarial:{" "}
                <span className="font-semibold text-white">
                  {`$ ${aporteCajaProfesionalNum.toLocaleString("es-UY", {
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                Deducción por hijos:{" "}
                <span className="font-semibold text-white">
                  {`$ ${deduccionHijos.toLocaleString("es-UY", {
                    maximumFractionDigits: 2,
                  })}`}
                </span>
              </p>
              <p>
                Porcentaje aplicado:{" "}
                <span className="font-semibold text-white">
                  {`${porcentajePersonasACargoNum}%`}
                </span>
              </p>
              {deduccionHijos > 0 && resultado.aporteIrpf === 0 && (
                <p className="text-[11px] text-white/60">
                  Tu IRPF ya quedó en 0 gracias a las deducciones por hijos.
                </p>
              )}
            </div>
            <p className="pt-2 text-[11px] text-white/50">
              Esta herramienta es orientativa y simplifica la normativa actual. Para un cálculo más preciso podés
              consultar herramientas especializadas o a tu contador.
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-white/80">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-white/60">
                Valor líquido aproximado por día
              </p>
              <p className="mt-1 text-xl font-semibold text-white">
                {`$ ${(resultado.sueldoLiquido / (tipoPago === "jornal" && jornalesNum > 0 ? jornalesNum : 30)).toLocaleString("es-UY", {
                  maximumFractionDigits: 2,
                })}`}
              </p>
              <p className="text-[11px] text-white/50">
                Calculado en base a {tipoPago === "jornal" && jornalesNum > 0 ? jornalesNum : 30} días al mes.
              </p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-white/60">
                Valor líquido aproximado por hora
              </p>
              <p className="mt-1 text-xl font-semibold text-white">
                {`$ ${(resultado.sueldoLiquido / (tipoPago === "jornal" && jornalesNum > 0 ? jornalesNum : 30) / 8).toLocaleString("es-UY", {
                  maximumFractionDigits: 2,
                })}`}
              </p>
              <p className="text-[11px] text-white/50">
                Asumiendo jornadas de 8 horas.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
