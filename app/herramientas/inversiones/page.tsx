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
    <div className="rounded-3xl bg-white p-6 sm:p-10 text-[#0b1e3a] shadow-2xl border border-gray-100 space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0b1e3a]">Inversiones</h1>
          <span className="inline-flex items-center rounded-full bg-yellow-100 border border-yellow-300 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-yellow-900">
            En Desarrollo
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Estamos construyendo herramientas para simular y seguir tus inversiones en el mercado uruguayo (Letras, UI, Plazo Fijo y Fondos).
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
          <h3 className="text-base font-bold text-[#0b1e3a] mb-3">Lo que se viene en Inversiones</h3>
          <ul className="space-y-2 text-xs text-gray-700 font-medium">
            <li className="flex items-center gap-2">✓ Comparador de fondos de inversión del mercado uruguayo.</li>
            <li className="flex items-center gap-2">✓ Simulador de escenarios según plazo y tasa en UI/Pesos.</li>
            <li className="flex items-center gap-2">✓ Registro simple de rendimientos e intereses compuestos.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-base font-bold text-[#0b1e3a] mb-3">Roadmap de esta sección</h3>
          <ul className="space-y-2 text-xs text-gray-600">
            <li><strong>Fase 1:</strong> Cotizaciones clave del día en tiempo real.</li>
            <li><strong>Fase 2:</strong> Simulador interactivo de interés compuesto.</li>
            <li><strong>Fase 3:</strong> Panel de seguimiento consolidado dentro de Mi Admi.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4 pt-2">
        <div>
          <h2 className="text-xl font-bold text-[#0b1e3a]">Cotizaciones del Día en Uruguay</h2>
          <p className="text-xs text-gray-500">
            Valores oficiales de referencia para la plaza local.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {cotizaciones.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 text-center">
              No pudimos obtener las cotizaciones en este momento. Probá de nuevo más tarde.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#0b1e3a]">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Activo</th>
                    <th className="py-3 px-4 text-right">Compra</th>
                    <th className="py-3 px-4 text-right">Venta</th>
                    <th className="py-3 px-4 text-right">Actualización</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cotizaciones.map((c) => (
                    <tr key={c.moneda} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold">
                        <div className="flex items-center gap-2.5">
                          <ReactCountryFlag
                            svg
                            countryCode={getCountryCode(c.nombre)}
                            className="rounded-sm"
                            style={{ width: "1.3rem", height: "1.3rem" }}
                          />
                          <span>{c.nombre}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-[#0b1e3a]">
                        $ {formatNumber(c.compra)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-blue-900">
                        $ {formatNumber(c.venta)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-gray-500 font-mono">
                        {formatDate(c.fechaActualizacion)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
