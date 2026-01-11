"use client";

import { useMemo, useState } from "react";

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
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Calculadora de seguro de desempleo</h1>
        <p className="text-sm text-white/70">
          Estima de forma aproximada cuanto podrias cobrar de subsidio por desempleo (seguro de paro) si sos trabajador
          mensual de Industria y Comercio. No contempla todos los casos ni topes de BPS.
        </p>
        <p className="text-[12px] text-white/50">
          Esta herramienta esta pensada para trabajadores mensuales de Industria y Comercio. No aplica para rural,
          construccion ni regimenes especiales.
        </p>
      </header>

      <div className="inline-flex items-center rounded-full bg-white/5 p-1">
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            motivoEgreso === "involuntario"
              ? "bg-emerald-500 text-slate-900 shadow"
              : "text-white/70 hover:text-white"
          }`}
          onClick={() => setMotivoEgreso("involuntario")}
        >
          Me despidieron / Fin del contrato
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            motivoEgreso === "renuncia"
              ? "bg-emerald-500 text-slate-900 shadow"
              : "text-white/70 hover:text-white"
          }`}
          onClick={() => setMotivoEgreso("renuncia")}
        >
          Renuncié
        </button>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white mt-6">Ingresa tus datos</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">
              Dias en planilla en los ultimos 12 meses (Industria y Comercio)
            </label>
            <input
              type="number"
              className="w-full bg-white/5 border border-white/10 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              value={diasPlanilla}
              onChange={(e) => setDiasPlanilla(e.target.value)}
            />
            <p className="mt-1 text-xs text-white/50">
              En general, para tener derecho al subsidio tenes que haber estado al menos 180 dias en planilla en los
              ultimos 12 meses.
            </p>
            {diasPlanillaNum > 0 && (
              <p className={`mt-1 text-xs ${cumpleRequisitoPlanilla ? "text-emerald-300" : "text-red-300"}`}>
                {cumpleRequisitoPlanilla
                  ? "Con estos datos, pareceria que cumples el requisito de dias en planilla."
                  : "Con estos datos, pareceria que no cumples el requisito minimo de dias en planilla para el seguro de desempleo."}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-white">Tipo de sueldo</p>
            <div className="inline-flex items-center rounded-full bg-white/5 p-1 text-xs font-medium text-white/70">
              <button
                type="button"
                className={`rounded-full px-3 py-1 transition ${
                  tipoSueldo === "fijo" ? "bg-emerald-500 text-slate-900 shadow" : "text-white/70 hover:text-white"
                }`}
                onClick={() => setTipoSueldo("fijo")}
              >
                Sueldo fijo
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 transition ${
                  tipoSueldo === "variable"
                    ? "bg-emerald-500 text-slate-900 shadow"
                    : "text-white/70 hover:text-white"
                }`}
                onClick={() => setTipoSueldo("variable")}
              >
                Sueldo variable
              </button>
            </div>
          </div>

          {tipoSueldo === "fijo" && (
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Sueldo nominal mensual</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full bg-white/5 border border-white/10 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Ej: 35.000"
                  value={sueldoMensual}
                  onChange={(e) => setSueldoMensual(e.target.value)}
                />
              </div>
              <p className="mt-1 text-xs text-white/50">
                Usa tu sueldo nominal mensual promedio de los ultimos meses.
              </p>
            </div>
          )}

          {tipoSueldo === "variable" && (
            <div className="space-y-2">
              <p className="text-xs text-white/70">
                Ingresa los sueldos nominales de los ultimos 6 meses que trabajaste. Vamos a calcular un promedio
                mensual y usarlo como base para el subsidio.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {["Mes 1", "Mes 2", "Mes 3", "Mes 4", "Mes 5", "Mes 6"].map((label, index) => (
                  <div key={label} className="space-y-1">
                    <label className="block text-xs font-medium text-white/70">{label}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="w-full bg-white/5 border border-white/10 rounded-[6px] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
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
      </section>

      {esRenuncia && (
        <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs text-white/80">
          <p className="font-semibold text-red-200">En la renuncia voluntaria no corresponde subsidio por desempleo.</p>
          <p className="mt-1">
            El seguro de paro aplica cuando quedas sin trabajo contra tu voluntad (despido o termino de contrato) y
            cumples con los requisitos de dias en planilla.
          </p>
        </div>
      )}

      {esInvoluntario && (
        <section className="space-y-3">
          {mostrarTabla ? (
            <>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/60">Base de calculo (promedio mensual)</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-300">
                  {`$ ${basePromedio.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  Promedio de tus remuneraciones nominales de los ultimos 6 meses.
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="text-xs font-semibold text-white/80 mb-2">
                  Monto nominal estimado del subsidio por desempleo (si cobrases los 6 meses completos)
                </p>
                <div className="grid gap-2 sm:grid-cols-2 text-sm text-white/80">
                  {montos.map((monto, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span>{`Mes ${index + 1}`}</span>
                      <span className="font-semibold text-white">
                        {`$ ${monto.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-2 text-[11px] text-white/50">
                Este calculo es orientativo y no contempla topes minimos ni maximos del BPS, ni modalidades especiales
                (seguro parcial, flexible, regimenes especiales). No sustituye el calculo oficial del BPS ni el
                asesoramiento profesional.
              </p>
            </>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/80">
              <p className="font-semibold text-white">No podemos estimar el monto con los datos ingresados.</p>
              <p className="mt-1 text-white/70">
                Revisa que cumplas el requisito de dias en planilla y que el sueldo ingresado sea mayor a cero.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
