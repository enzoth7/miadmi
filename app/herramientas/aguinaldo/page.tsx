"use client";

import { useEffect, useState } from "react";
import { AguinaldoOnboardingTour } from "../../../components/onboarding/AguinaldoOnboardingTour";

export const metadata = {
  title: "Calcular aguinaldo en Uruguay | Mi Admi",
  description: "Calculá tu aguinaldo en Uruguay en segundos. Estimación simple y clara para trabajadores.",
};

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
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">
          Calculadora de aguinaldo
        </h1>
        <p className="text-sm text-white/70">
          Calculá de forma aproximada cuánto te corresponde de aguinaldo según lo que cobraste en el semestre.
          No incluye prevee descuentos.
        </p>
        <div className="mt-3 space-y-2 text-sm text-white/70">
  <p>
    En Uruguay el aguinaldo se calcula sobre el{" "}
    <span className="font-semibold text-white/90">sueldo nominal</span>.
  </p>

  <div className="grid gap-3 sm:grid-cols-2">
    {/* Contenedor SUELDO NOMINAL */}
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <h4 className="text-sm font-semibold text-white/90">
        Sueldo nominal
      </h4>
      <p className="mt-1 text-[13px] leading-snug">
        Es lo que ganás <span className="font-semibold">antes de descuentos</span>.
        También se le dice <span className="font-semibold">sueldo bruto</span>.
      </p>
    </div>

    {/* Contenedor SUELDO LÍQUIDO */}
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <h4 className="text-sm font-semibold text-white/90">
        Sueldo líquido
      </h4>
      <p className="mt-1 text-[13px] leading-snug">
        Es lo que efectivamente <span className="font-semibold">cobrás en mano</span>, después de{" "}
        BPS, FONASA, IRPF y otros descuentos. También se le dice{" "}
        <span className="font-semibold">sueldo neto</span>. 
      </p>
    </div>
  </div>

  <p className="text-[13px] text-white/70">
    Para esta calculadora usá siempre los importes{" "}
    <span className="font-semibold text-white/90">nominales</span>.
  </p>
</div>
      </header>

     <div
       id="aguinaldo-mode-toggle"
       className="inline-flex items-center rounded-full bg-white/5 p-1"
     >
  <button
    type="button"
    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
      modo === "fijo"
        ? "bg-emerald-500 text-slate-900 shadow"
        : "text-white/70 hover:text-white"
    }`}
    onClick={() => setModo("fijo")}
  >
    Sueldo fijo
  </button>
  <button
    type="button"
    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
      modo === "variable"
        ? "bg-emerald-500 text-slate-900 shadow"
        : "text-white/70 hover:text-white"
    }`}
    onClick={() => setModo("variable")}
  >
    Sueldo variable
  </button>
</div>


      <section id="aguinaldo-inputs" className="space-y-3">
        {modo === "fijo" && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">
            Calculadora rápida (sueldo fijo)
          </h2>
          <p className="text-xs text-white/60 max-w-xl">
            Para el medio aguinaldo de <span className="font-semibold text-white/80">junio</span> se suman los sueldos nominales de
            <span className="font-semibold"> diciembre a mayo</span>.  
            Para el medio aguinaldo de <span className="font-semibold text-white/80">diciembre</span> se suman los sueldos de
            <span className="font-semibold"> junio a noviembre</span>.
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-white/70 mb-1">
                Sueldo nominal mensual
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full bg-white/5 border border-white/10 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Ej: 30.000"
                  value={sueldoMensual}
                  onChange={(e) => setSueldoMensual(e.target.value)}
                />
              </div>
            </div>

            <div className="w-full md:w-40">
              <label className="block text-xs font-medium text-white/70 mb-1">
                Meses trabajados en el semestre
              </label>
              <input
                type="number"
                min={1}
                max={6}
                className="w-full bg-white/5 border border-white/10 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                value={mesesTrabajados}
                onChange={(e) => setMesesTrabajados(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-white/60">
                Resultado estimado
              </p>
              <p className="mt-1 text-3xl font-semibold text-emerald-300">
                {medioAguinaldoFijo > 0
                  ? `$ ${medioAguinaldoFijo.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`
                  : "—"}
              </p>
            </div>
          </div>
        </section>
      )}

        {modo === "variable" && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">
            Calculadora rápida (sueldo variable)
          </h2>
          <p className="text-xs text-white/60 max-w-xl">
            Para el medio aguinaldo de <span className="font-semibold text-white/80">junio</span> se suman los sueldos nominales de
            <span className="font-semibold"> diciembre a mayo</span>.  
            Para el medio aguinaldo de <span className="font-semibold text-white/80">diciembre</span> se suman los sueldos de
            <span className="font-semibold"> junio a noviembre</span>.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            {["Mes 1", "Mes 2", "Mes 3", "Mes 4", "Mes 5", "Mes 6"].map(
              (label, index) => (
                <div key={index} className="space-y-1">
                  <label className="block text-xs font-medium text-white/70">
                    {label}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full bg-white/5 border border-white/10 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                    placeholder="0"
                    value={meses[index]}
                    onChange={(e) => updateMes(index, e.target.value)}
                  />
                </div>
              )
            )}
          </div>

          <p className="mt-2 text-xs text-white/60 max-w-xl">
            En cada casilla ingresá el <span className="font-semibold text-white/80">sueldo nominal de ese mes</span>,
            tal como figura en tu recibo (normalmente cobras a mes vencido: 
            el sueldo de marzo lo cobras en abril, etc.). Si un mes no trabajaste, dejalo en cero.
          </p>

          <div className="pt-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">

            <p className="text-xs uppercase tracking-wide text-white/60">
              Resultado estimado
            </p>
            <p className="mt-1 text-3xl font-semibold text-emerald-300">
              {medioAguinaldoVariable > 0
                ? `$ ${medioAguinaldoVariable.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`
                : "—"}
            </p>
          </div>
          </div>
        </section>
        )}
      </section>

      {showTour ? (
        <AguinaldoOnboardingTour onClose={() => setShowTour(false)} />
      ) : null}
    </div>
  );
}
