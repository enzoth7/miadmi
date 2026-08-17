"use client";

import { useEffect, useState } from "react";
import { AguinaldoOnboardingTour } from "../../../components/onboarding/AguinaldoOnboardingTour";

export default function AguinaldoPage() {
  const [modo, setModo] = useState<"fijo" | "variable">("fijo");
  const [sueldoMensual, setSueldoMensual] = useState<string>("");
  const [mesesTrabajados, setMesesTrabajados] = useState<string>("6");
  const [meses, setMeses] = useState<string[]>(["", "", "", "", "", ""]);
  const [showTour, setShowTour] = useState(false);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem("miadmi:tour-herramienta-aguinaldo") === "pending") {
        setShowTour(true);
      }
    } catch {
      // ignore storage issues
    }
  }, []);

  return (
    <div className="rounded-3xl bg-white p-6 sm:p-10 text-[#0b1e3a] shadow-2xl border border-gray-100 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0b1e3a]">
          Calculadora de aguinaldo
        </h1>
        <p className="text-sm text-gray-600">
          Calculá de forma aproximada cuánto te corresponde de aguinaldo según lo que cobraste en el semestre.
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
          className={`rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
            modo === "fijo"
              ? "bg-[#0b1e3a] text-white shadow"
              : "text-gray-600 hover:text-black"
          }`}
          onClick={() => setModo("fijo")}
        >
          Sueldo fijo
        </button>
        <button
          type="button"
          className={`rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
            modo === "variable"
              ? "bg-[#0b1e3a] text-white shadow"
              : "text-gray-600 hover:text-black"
          }`}
          onClick={() => setModo("variable")}
        >
          Sueldo variable
        </button>
      </div>

      <section id="aguinaldo-inputs" className="space-y-4 pt-2">
        {modo === "fijo" && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#0b1e3a]">
              Calculadora rápida (sueldo fijo)
            </h2>
            <p className="text-xs text-gray-600 max-w-xl">
              Para el medio aguinaldo de <strong>junio</strong> se suman los sueldos nominales de diciembre a mayo. Para el medio aguinaldo de <strong>diciembre</strong> se suman los sueldos de junio a noviembre.
            </p>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Sueldo nominal mensual
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 font-bold text-[#0b1e3a]">
                    $
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder="Ej: 30.000"
                    value={sueldoMensual}
                    onChange={(e) => setSueldoMensual(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full md:w-48">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Meses trabajados en semestre
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                  value={mesesTrabajados}
                  onChange={(e) => setMesesTrabajados(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4">
              <div className="rounded-2xl bg-[#0b1e3a] text-white p-6 shadow-xl border border-white/10">
                <p className="text-xs uppercase tracking-wider text-yellow-400 font-bold">
                  Resultado Estimado (Medio Aguinaldo Bruto)
                </p>
                <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-yellow-300 font-mono">
                  {medioAguinaldoFijo > 0
                    ? `$ ${medioAguinaldoFijo.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {modo === "variable" && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#0b1e3a]">
              Calculadora rápida (sueldo variable)
            </h2>
            <p className="text-xs text-gray-600 max-w-xl">
              Ingresá el sueldo nominal de cada mes correspondiente al semestre.
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              {["Mes 1", "Mes 2", "Mes 3", "Mes 4", "Mes 5", "Mes 6"].map(
                (label, index) => (
                  <div key={index} className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      {label}
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1e3a] font-medium outline-none focus:border-[#0b1e3a] focus:ring-2 focus:ring-blue-100 transition-all"
                      placeholder="0"
                      value={meses[index]}
                      onChange={(e) => updateMes(index, e.target.value)}
                    />
                  </div>
                )
              )}
            </div>

            <div className="pt-4">
              <div className="rounded-2xl bg-[#0b1e3a] text-white p-6 shadow-xl border border-white/10">
                <p className="text-xs uppercase tracking-wider text-yellow-400 font-bold">
                  Resultado Estimado (Medio Aguinaldo Bruto)
                </p>
                <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-yellow-300 font-mono">
                  {medioAguinaldoVariable > 0
                    ? `$ ${medioAguinaldoVariable.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {showTour ? (
        <AguinaldoOnboardingTour onClose={() => setShowTour(false)} />
      ) : null}
    </div>
  );
}
