"use client";

import { useMemo, useState } from "react";
import { PageSurface, ResultPanel } from "../../../components/financial/FinancialPrimitives";

type MotivoEgreso = "involuntario" | "renuncia";
type TipoSueldo = "fijo" | "variable";

function calcularMontosSeguro(basePromedio: number) {
  if (!basePromedio || basePromedio <= 0 || Number.isNaN(basePromedio)) {
    return [];
  }

  const porcentajes = [0.66, 0.57, 0.5, 0.45, 0.42, 0.4];
  return porcentajes.map((p) => basePromedio * p);
}

export default function SeguroDesempleoPage() {
  const [motivoEgreso, setMotivoEgreso] = useState<MotivoEgreso>("involuntario");
  const [tipoSueldo, setTipoSueldo] = useState<TipoSueldo>("fijo");
  const [sueldoMensual, setSueldoMensual] = useState<string>("");
  const [meses, setMeses] = useState<string[]>(["", "", "", "", "", ""]);
  const [diasPlanilla, setDiasPlanilla] = useState<string>("180");

  const sueldoNum = parseFloat(sueldoMensual.replace(",", "."));
  const diasPlanillaNum = parseInt(diasPlanilla || "0", 10);
  const cumpleRequisitoPlanilla = diasPlanillaNum >= 180;

  function updateMes(index: number, value: string) {
    setMeses((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const basePromedio = useMemo(() => {
    if (tipoSueldo === "fijo") {
      return sueldoNum > 0 && !Number.isNaN(sueldoNum) ? sueldoNum : 0;
    }

    const numeros = meses
      .map((m) => parseFloat(m.replace(",", ".")))
      .filter((v) => !Number.isNaN(v) && v > 0);

    if (numeros.length === 0) return 0;

    const suma = numeros.reduce((acc, v) => acc + v, 0);
    return suma / numeros.length;
  }, [meses, sueldoNum, tipoSueldo]);

  const esRenuncia = motivoEgreso === "renuncia";
  const esInvoluntario = motivoEgreso === "involuntario";

  const montos = calcularMontosSeguro(esRenuncia || !cumpleRequisitoPlanilla ? 0 : basePromedio);

  const mostrarTabla = esInvoluntario && cumpleRequisitoPlanilla && basePromedio > 0 && montos.length > 0;

  return (
    <PageSurface>
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
          Calculadora de seguro de desempleo
        </h1>
        <p className="text-sm text-gray-600">
          Estimá de forma aproximada cuánto podrías cobrar de subsidio por desempleo (seguro de paro) a través del BPS.
        </p>

        <div className="inline-flex items-center rounded-full bg-gray-100 p-1.5 border border-gray-200 mt-2">
          <button
            type="button"
            className={`min-h-11 rounded-full px-5 py-2 text-xs font-bold transition-all sm:text-sm ${
              motivoEgreso === "involuntario"
                ? "bg-brand-yellow text-brand-navy shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
            onClick={() => setMotivoEgreso("involuntario")}
          >
            Me despidieron / Fin contrato
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-full px-5 py-2 text-xs font-bold transition-all sm:text-sm ${
              motivoEgreso === "renuncia"
                ? "bg-brand-yellow text-brand-navy shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
            onClick={() => setMotivoEgreso("renuncia")}
          >
            Renuncié
          </button>
        </div>
      </header>

      <fieldset className="space-y-4 border-t border-slate-200 pt-6">
        <legend className="pr-4 text-base font-bold text-brand-navy">Ingresá tus datos</legend>

        <div className="space-y-4">
          <div>
            <label htmlFor="seguro-dias-planilla" className="block text-xs font-bold text-gray-700 mb-1">
              Días en planilla en los últimos 12 meses (mínimo 180 días)
            </label>
            <input
              id="seguro-dias-planilla"
              type="number"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
              value={diasPlanilla}
              onChange={(e) => setDiasPlanilla(e.target.value)}
            />
            {diasPlanillaNum > 0 && (
              <p className={`mt-1 text-xs font-semibold ${cumpleRequisitoPlanilla ? "text-emerald-700" : "text-red-600"}`}>
                {cumpleRequisitoPlanilla
                  ? "Cumplís con el requisito mínimo de 180 días en planilla."
                  : "No alcanzás el requisito mínimo de 180 días para acceder al subsidio."}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-700">Tipo de sueldo</p>
            <div className="inline-flex items-center rounded-full bg-gray-100 p-1 border border-gray-200 text-xs font-bold text-gray-600">
              <button
                type="button"
                className={`min-h-11 rounded-full px-4 py-2 transition-all ${
                  tipoSueldo === "fijo" ? "bg-brand-yellow text-brand-navy shadow-sm" : "hover:text-black"
                }`}
                onClick={() => setTipoSueldo("fijo")}
              >
                Sueldo fijo
              </button>
              <button
                type="button"
                className={`min-h-11 rounded-full px-4 py-2 transition-all ${
                  tipoSueldo === "variable" ? "bg-brand-yellow text-brand-navy shadow-sm" : "hover:text-black"
                }`}
                onClick={() => setTipoSueldo("variable")}
              >
                Sueldo variable
              </button>
            </div>
          </div>

          {tipoSueldo === "fijo" && (
            <div>
              <label htmlFor="seguro-sueldo" className="block text-xs font-bold text-gray-700 mb-1">Sueldo nominal mensual</label>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 font-bold text-[#0b1e3a]">
                  $
                </div>
                <input
                  id="seguro-sueldo"
                  type="number"
                  inputMode="decimal"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                  placeholder="Ej: 35.000"
                  value={sueldoMensual}
                  onChange={(e) => setSueldoMensual(e.target.value)}
                />
              </div>
            </div>
          )}

          {tipoSueldo === "variable" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">
                Ingresá los sueldos nominales de los últimos 6 meses para calcular el promedio.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {["Mes 1", "Mes 2", "Mes 3", "Mes 4", "Mes 5", "Mes 6"].map((label, index) => (
                  <div key={label} className="space-y-1">
                    <label htmlFor={`seguro-mes-${index}`} className="block text-xs font-bold text-gray-700">{label}</label>
                    <input
                      id={`seguro-mes-${index}`}
                      type="number"
                      inputMode="decimal"
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                      placeholder="0"
                      value={meses[index]}
                      onChange={(e) => updateMes(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </fieldset>

      {esRenuncia && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-xs text-red-900">
          <p className="font-bold text-sm text-red-950 mb-1">En la renuncia voluntaria no corresponde seguro de desempleo.</p>
          <p>
            El subsidio de paro aplica cuando quedás sin trabajo de forma involuntaria (despido o fin de contrato) y cumplís los 180 días en planilla.
          </p>
        </div>
      )}

      {esInvoluntario && (
        <section className="space-y-4">
          {mostrarTabla ? (
            <ResultPanel className="mt-6 space-y-6" eyebrow="Resultado estimado">
              <div>
                <p className="mt-5 text-sm font-semibold text-white">Base de cálculo (promedio mensual)</p>
                <p className="mt-2 text-3xl font-extrabold tabular-nums text-emerald-300 sm:text-4xl">
                  {`$ ${basePromedio.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`}
                </p>
              </div>

              <div className="border-t border-white/15 pt-5">
                <p className="text-xs font-bold text-gray-300 mb-3">
                  Proyección mensual del subsidio por desempleo (escala decreciente BPS):
                </p>
                <div className="grid gap-2 sm:grid-cols-2 text-xs text-gray-300">
                  {montos.map((monto, index) => {
                    const pct = [66, 57, 50, 45, 42, 40][index];
                    return (
                      <div key={index} className="flex items-center justify-between py-1 border-b border-white/10">
                        <span>{`Mes ${index + 1} (${pct}%):`}</span>
                        <span className="font-bold text-white font-mono">
                          {`$ ${monto.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="pt-2 text-[11px] text-gray-400">
                Cálculo orientativo simplificado de las escalas de BPS para trabajadores mensuales.
              </p>
            </ResultPanel>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-xs text-gray-600">
              <p className="font-bold text-gray-900 mb-1">Completá los datos para ver la proyección.</p>
              <p>Revisá que cumplas con los días en planilla y el sueldo ingresado sea mayor a cero.</p>
            </div>
          )}
        </section>
      )}
    </div>
    </PageSurface>
  );
}
