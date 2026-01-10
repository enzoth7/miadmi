import ReactCountryFlag from "react-country-flag";
export const dynamic = "force-dynamic";

type Cotizacion = {
  moneda: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
};

async function getCotizaciones(): Promise<Cotizacion[]> {
  try {
    const res = await fetch("https://uy.dolarapi.com/v1/cotizaciones", {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Error al obtener cotizaciones:", res.status);
      return [];
    }

    const data = await res.json();
    const importantes = ["USD", "EUR", "BRL", "ARS", "UI"];
    const filtradas = data.filter((c: any) => importantes.includes(c.moneda));
    return filtradas;
  } catch (err) {
    console.error("Error de red al obtener cotizaciones:", err);
    return [];
  }
}

const countryCodeByNombre: Record<string, string> = {
  "Dólar": "US",
  "Euro": "EU",
  "Peso Argentino": "AR",
  "Real": "BR",
  "Unidad Indexada": "UY",
};

function getCountryCode(nombre: string) {
  return countryCodeByNombre[nombre] ?? "UN";
}

function formatNumber(value: number | null | undefined) {
  if (typeof value === "number") {
    return value.toFixed(2);
  }
  return "?";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "?";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "?";
  return d.toLocaleString("es-UY");
}

export default async function InversionesPage() {
  const cotizaciones = await getCotizaciones();

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 text-white">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">Inversiones</h1>
          </div>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70">
            Proximamente
          </span>
        </div>
        <p className="text-sm text-white/80">
          Estamos construyendo un espacio para ayudarte a invertir mejor en el mercado uruguayo: desde
          fondos de inversion actualizados hasta herramientas para simular y seguir tus inversiones.
        </p>
        <p className="text-sm text-white/60">
          Todavia no esta listo, pero ya podes ver las cotizaciones clave del dia directamente desde Mi
          Admi.
        </p>
      </header>

      <section className="grid items-start gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-white">Lo que se viene en Inversiones</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {[
              "Ver y comparar los fondos de inversion mas nuevos del mercado uruguayo.",
              "Simular escenarios de inversion segun plazo y riesgo.",
              "Llevar un registro simple de tus inversiones y sus rendimientos.",
              "Ver como tus inversiones se integran con tu estimacion general y tus objetivos.",
            ].map((text) => (
              <li key={text} className="flex gap-2">
                <span className="text-white/40"></span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[10px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">Roadmap de esta seccion</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {[
              "Fase 1: Cotizaciones clave en tiempo real.",
              "Fase 2: Simuladores basicos de inversion en pesos y dolares.",
              "Fase 3: Panel de seguimiento de tus inversiones dentro de Mi Admi.",
            ].map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Cotizaciones en Uruguay</h2>
          <p className="text-xs text-white/60">
            Datos obtenidos de fuentes oficiales (como BROU y BCU). Esta seccion se actualizara
            automaticamente cuando terminemos la integracion.
          </p>
        </div>
        <div className="mt-4 rounded-[10px] border border-emerald-400/60 bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-transparent p-4 shadow-lg shadow-emerald-900/40">
          {cotizaciones.length === 0 ? (
            <p className="text-sm text-white/50">
              No pudimos obtener las cotizaciones en este momento. Proba de nuevo mas tarde.
            </p>
          ) : (
            <table className="w-full text-sm text-white/80">
              <thead className="border-b border-white/10 text-white/60">
                <tr>
                  <th className="py-2 text-left">Activo</th>
                  <th className="py-2 text-right">Compra</th>
                  <th className="py-2 text-right">Venta</th>
                  <th className="py-2 text-right">Ultima actualizacion</th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((c) => (
                  <tr
                    key={c.moneda}
                    className="border-b border-white/5 last:border-0 transition-colors hover:bg-emerald-500/5"
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <ReactCountryFlag
                          svg
                          countryCode={getCountryCode(c.nombre)}
                          className="rounded-[2px]"
                          style={{ width: "1.4rem", height: "1.4rem" }}
                        />
                        <span>{c.nombre}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right text-base font-semibold text-emerald-300 md:text-lg">
                      {formatNumber(c.compra)}
                    </td>
                    <td className="py-2 text-right text-base font-semibold text-emerald-300 md:text-lg">
                      {formatNumber(c.venta)}
                    </td>
                    <td className="py-2 text-right text-xs text-white/45">
                      {formatDate(c.fechaActualizacion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-right text-xs text-emerald-300/80">
            Fuente: uy.dolarapi.com
          </p>
        </div>
      </section>
    </div>
  );
}
