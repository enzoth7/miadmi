"use client";

import { useState } from "react";
import { PageSurface, ResultPanel } from "../../../components/financial/FinancialPrimitives";

export default function AguinaldoPage() {
  const [modo, setModo] = useState<"fijo" | "variable">("fijo");
  const [sueldoMensual, setSueldoMensual] = useState<string>("");
  const [mesesTrabajados, setMesesTrabajados] = useState<string>("6");
  const [meses, setMeses] = useState<string[]>(["", "", "", "", "", ""]);

  const sueldoNum = parseFloat(sueldoMensual.replace(",", "."));
  const mesesNum = parseInt(mesesTrabajados || "0", 10);
  const medioAguinaldoFijo =
    !isNaN(sueldoNum) && !isNaN(mesesNum) ? (sueldoNum * mesesNum) / 12 : 0;

  function updateMes(index: number, value: string) {
    setMeses((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const totalSemestre = meses
    .map((m) => parseFloat(m.replace(",", ".")))
    .filter((v) => !isNaN(v))
    .reduce((acc, v) => acc + v, 0);

  const medioAguinaldoVariable = totalSemestre > 0 ? totalSemestre / 12 : 0;

  return (
    <PageSurface>
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
          Calculadora de aguinaldo
        </h1>
        <p className="text-sm text-gray-600">
          Calculá de forma aproximada cuánto te corresponde de aguinaldo según lo que cobraste en el semestre.
        </p>

        <div className="mt-4 grid border-y border-slate-200 text-sm sm:grid-cols-2 sm:divide-x sm:divide-slate-200">
          <div className="py-4 sm:pr-6">
            <h2 className="text-sm font-bold text-brand-navy">Sueldo nominal</h2>
            <p className="mt-1 text-xs text-gray-600 leading-snug">
              Es lo que ganás antes de descuentos (sueldo bruto).
            </p>
          </div>

          <div className="border-t border-slate-200 py-4 sm:border-t-0 sm:pl-6">
            <h2 className="text-sm font-bold text-brand-navy">Sueldo líquido</h2>
            <p className="mt-1 text-xs text-gray-600 leading-snug">
              Es lo que efectivamente cobrás en mano después de BPS e IRPF.
            </p>
          </div>
        </div>
      </header>

      <div
        id="aguinaldo-mode-toggle"
        className="inline-flex items-center rounded-full bg-gray-100 p-1.5 border border-gray-200"
      >
        <button
          type="button"
          className={`min-h-11 rounded-full px-5 py-2 text-xs font-bold transition-all sm:text-sm ${
            modo === "fijo"
              ? "bg-brand-yellow text-brand-navy shadow-sm"
              : "text-gray-600 hover:text-black"
          }`}
          onClick={() => setModo("fijo")}
        >
          Sueldo fijo
        </button>
        <button
          type="button"
          className={`min-h-11 rounded-full px-5 py-2 text-xs font-bold transition-all sm:text-sm ${
            modo === "variable"
              ? "bg-brand-yellow text-brand-navy shadow-sm"
              : "text-gray-600 hover:text-black"
          }`}
          onClick={() => setModo("variable")}
        >
          Sueldo variable
        </button>
      </div>

      <section id="aguinaldo-inputs" className="space-y-4 pt-2">
        {modo === "fijo" && (
          <fieldset className="space-y-4">
            <legend className="text-base font-bold text-brand-navy">
              Calculadora rápida (sueldo fijo)
            </legend>
            <p className="text-xs text-gray-600 max-w-xl">
              Para el medio aguinaldo de <strong>junio</strong> se suman los sueldos nominales de diciembre a mayo. Para el medio aguinaldo de <strong>diciembre</strong> se suman los sueldos de junio a noviembre.
            </p>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label htmlFor="aguinaldo-sueldo" className="block text-xs font-bold text-gray-700 mb-1">
                  Sueldo nominal mensual
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 font-bold text-[#0b1e3a]">
                    $
                  </div>
                  <input
                    id="aguinaldo-sueldo"
                    type="number"
                    inputMode="decimal"
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                    placeholder="Ej: 30.000"
                    value={sueldoMensual}
                    onChange={(e) => setSueldoMensual(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full md:w-48">
                <label htmlFor="aguinaldo-meses" className="block text-xs font-bold text-gray-700 mb-1">
                  Meses trabajados en semestre
                </label>
                <input
                  id="aguinaldo-meses"
                  type="number"
                  min={1}
                  max={6}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                  value={mesesTrabajados}
                  onChange={(e) => setMesesTrabajados(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4">
              <ResultPanel eyebrow="Resultado estimado">
                <p className="mt-5 text-sm font-semibold text-white">Medio Aguinaldo Bruto</p>
                <p className="mt-2 text-3xl font-extrabold tabular-nums text-white sm:text-4xl">
                  {medioAguinaldoFijo > 0
                    ? `$ ${medioAguinaldoFijo.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </ResultPanel>
            </div>
          </fieldset>
        )}

        {modo === "variable" && (
          <fieldset className="space-y-4">
            <legend className="text-base font-bold text-brand-navy">
              Calculadora rápida (sueldo variable)
            </legend>
            <p className="text-xs text-gray-600 max-w-xl">
              Ingresá el sueldo nominal de cada mes correspondiente al semestre.
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              {["Mes 1", "Mes 2", "Mes 3", "Mes 4", "Mes 5", "Mes 6"].map(
                (label, index) => (
                  <div key={index} className="space-y-1">
                    <label htmlFor={`aguinaldo-mes-${index}`} className="block text-xs font-bold text-gray-700">
                      {label}
                    </label>
                    <input
                      id={`aguinaldo-mes-${index}`}
                      type="number"
                      inputMode="decimal"
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-blue-100"
                      placeholder="0"
                      value={meses[index]}
                      onChange={(e) => updateMes(index, e.target.value)}
                    />
                  </div>
                )
              )}
            </div>

            <div className="pt-4">
              <ResultPanel eyebrow="Resultado estimado">
                <p className="mt-5 text-sm font-semibold text-white">Medio Aguinaldo Bruto</p>
                <p className="mt-2 text-3xl font-extrabold tabular-nums text-white sm:text-4xl">
                  {medioAguinaldoVariable > 0
                    ? `$ ${medioAguinaldoVariable.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </ResultPanel>
            </div>
          </fieldset>
        )}
      </section>

    </div>
    </PageSurface>
  );
}
