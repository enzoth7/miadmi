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
    <div className="rounded-3xl bg-white p-6 sm:p-10 text-[#0b1e3a] shadow-2xl border border-gray-100 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0b1e3a]">
          Calculadora de descuentos de salario
        </h1>
        <p className="text-sm text-gray-600">
          Ingresá tu sueldo nominal y algunos datos básicos para estimar cuánto cobrás en mano después de BPS, Fonasa, FRL e IRPF. Los resultados son aproximados y orientativos.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <h4 className="text-sm font-bold text-[#0b1e3a]">Sueldo nominal</h4>
            <p className="mt-1 text-xs text-gray-600 leading-snug">
              Es lo que ganás antes de descuentos (sueldo bruto).
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <h4 className="text-sm font-bold text-[#0b1e3a]">Sueldo líquido</h4>
            <p className="mt-1 text-xs text-gray-600 leading-snug">
              Es lo que efectivamente cobrás en mano después de BPS, Fonasa e IRPF (sueldo neto).
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-4 pt-2">
        <h2 className="text-base font-bold text-[#0b1e3a]">Ingresá tus datos</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tipo de trabajador
              </label>
              <select
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
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
                <option value="industria">Industria y comercio (empleado mensual)</option>
                <option value="jornalero">Jornalero</option>
              </select>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tipo de pago
              </label>
              <select
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value as TipoPago)}
              >
                <option value="mensual">Mensual</option>
                <option value="jornal">Por jornal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {tipoTrabajador === "jornalero" ? "Jornal" : "Sueldo nominal"}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 font-bold text-[#0b1e3a]">
                $
              </div>
              <input
                type="number"
                inputMode="decimal"
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder={tipoTrabajador === "jornalero" ? "Ej: 1.500" : "Ej: 35.000"}
                value={sueldoNominal}
                onChange={(e) => setSueldoNominal(e.target.value)}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {tipoTrabajador === "jornalero"
                ? "Es el monto que ganás por día trabajado, sin incluir aguinaldo ni primas."
                : "Es el sueldo nominal que figura en tu recibo, sin incluir aguinaldo ni primas."}
            </p>
          </div>

          {tipoPago === "jornal" && (
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Jornales al mes
                </label>
                <input
                  type="number"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                  value={jornalesMes}
                  onChange={(e) => setJornalesMes(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500 md:w-64">
                Si sos jornalero, podés estimar un promedio de 22 jornales al mes.
              </p>
            </div>
          )}

          <div>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Fondo de Solidaridad
                </label>
                <select
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                  value={fondoSolidaridad}
                  onChange={(e) => setFondoSolidaridad(e.target.value)}
                >
                  <option value="0">Sin Fondo de Solidaridad</option>
                  <option value="274">1/2 BPC anual</option>
                  <option value="548">1 BPC anual</option>
                  <option value="1096">2 BPC anual</option>
                </select>
              </div>

              <div className="w-full md:w-48">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Adicional Fondo
                </label>
                <select
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                  value={adicionalFondo}
                  onChange={(e) => setAdicionalFondo(e.target.value)}
                >
                  <option value="0">No</option>
                  <option value="457">Si</option>
                </select>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Tomamos como referencia la BPC vigente: 1 BPC = $ {BPC_2025.toLocaleString("es-UY")}.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Caja profesional (CJPPU / Notarial)
              </label>
              <select
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                value={aporteCajaProfesional}
                onChange={(e) => setAporteCajaProfesional(e.target.value)}
              >
                <option value="0">Sin caja profesional</option>
                <option value="7000">CJPPU mínimo (~$7.000)</option>
                <option value="4000">Caja Notarial base (~$4.000)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Situación familiar para Fonasa
            </label>
            <select
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
              value={situacionFonasa}
              onChange={(e) => setSituacionFonasa(e.target.value as SituacionFonasa)}
            >
              <option value="sinHijosSinConyuge">3% - 4,5% - Sin hijos ni cónyuge/concubino a cargo</option>
              <option value="conHijos">4,5% - 6% - Con hijos a cargo</option>
              <option value="conConyuge">4,5% - 6% - Con cónyuge/concubino a cargo</option>
              <option value="conHijosYConyuge">6% - 8% - Con hijos y cónyuge/concubino a cargo</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Datos para estimar Fonasa según si ganás más o menos de 2,5 BPC.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="w-full md:w-40">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Porcentaje aplicado
              </label>
              <select
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                value={porcentajePersonasACargo}
                onChange={(e) => setPorcentajePersonasACargo(e.target.value)}
              >
                <option value="100">100%</option>
                <option value="50">50%</option>
                <option value="0">0%</option>
              </select>
            </div>

            <div className="w-full md:w-40">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Hijos sin discapacidad
              </label>
              <select
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                onChange={(e) => setHijos(e.target.value)}
              >
                {["0", "1", "2", "3", "4", "5"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-40">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Hijos con discapacidad
              </label>
              <select
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                value={hijosDiscapacidad}
                onChange={(e) => setHijosDiscapacidad(e.target.value)}
              >
                {["0", "1", "2", "3", "4", "5"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {resultado && (
        <section className="rounded-3xl bg-[#0b1e3a] text-white p-6 sm:p-8 shadow-xl space-y-6 mt-8 border border-white/10">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 border border-white/15 p-5">
              <p className="text-xs uppercase tracking-wider text-yellow-400 font-bold">
                Sueldo líquido en mano
              </p>
              <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-yellow-300 font-mono">
                {`$ ${resultado.sueldoLiquido.toLocaleString("es-UY", {
                  maximumFractionDigits: 2,
                })}`}
              </p>
              <p className="text-xs text-gray-300 mt-1">Importe neto estimado</p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <p className="text-xs uppercase tracking-wider text-red-300 font-bold">
                Total descuentos e impuestos
              </p>
              <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-red-400 font-mono">
                {`- $ ${resultado.totalDescuentos.toLocaleString("es-UY", {
                  maximumFractionDigits: 2,
                })}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">BPS, FONASA, FRL e IRPF</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="grid gap-3 sm:grid-cols-2 text-xs text-gray-300">
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-gray-400">Sueldo nominal:</span>
                <span className="font-bold text-white font-mono">
                  {`$ ${baseNominal.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-gray-400">BPS (15%):</span>
                <span className="font-bold text-white font-mono">
                  {`$ ${resultado.aporteJubilatorio.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-gray-400">Fonasa:</span>
                <span className="font-bold text-white font-mono">
                  {`$ ${resultado.aporteFonasa.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-gray-400">FRL (0,10%):</span>
                <span className="font-bold text-white font-mono">
                  {`$ ${resultado.aporteFrl.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-gray-400">IRPF estimado:</span>
                <span className="font-bold text-white font-mono">
                  {`$ ${resultado.aporteIrpf.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-gray-400">Tipo de trabajador:</span>
                <span className="font-bold text-white">
                  {regimenLaboral === "industria" ? "Industria y comercio" : "Jornalero"}
                </span>
              </div>
            </div>
            <p className="pt-3 text-[11px] text-gray-400">
              Esta herramienta es orientativa y simplifica la normativa actual vigente de Uruguay.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
