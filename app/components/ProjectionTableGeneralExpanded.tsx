"use client";

export default function ProjectionTableGeneralExpanded({
  onClose,
  monthLabels,
  filas,
  ingresosDetalleRows,
  egresosDetalleRows,
}: {
  onClose: () => void;
  monthLabels: string[];
  filas: any[];
  ingresosDetalleRows: { label: string; values: number[] }[];
  egresosDetalleRows: { label: string; values: number[] }[];
}) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">
          Proyección mensual
        </h2>
        <button
          onClick={onClose}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
        >
          Cerrar
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[980px] p-4">
          <table className="min-w-max w-full table-auto text-sm whitespace-nowrap">
            <thead className="bg-slate-100">
              <tr>
                <th className="sticky top-0 left-0 z-40 bg-slate-100 px-3 py-2 text-left text-slate-700 w-[160px] min-w-[160px] max-w-[160px]">
                  Concepto
                </th>
                {monthLabels.map((label, idx) => (
                  <th
                    key={idx}
                    className="sticky top-0 z-30 bg-slate-100 px-3 py-2 text-right text-slate-700"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Saldo mes pasado */}
              <tr className="bg-blue-100 text-blue-900 font-semibold">
                <td className="sticky left-0 z-20 bg-blue-100 px-3 py-2 w-[160px]">
                  Saldo mes pasado
                </td>
                {filas.map((f, idx) => (
                  <td key={idx} className="px-3 py-2 text-right text-slate-900">
                    {formatUYU(f.saldoMesPasado)}
                  </td>
                ))}
              </tr>

              {/* Ingresos */}
              <tr className="bg-emerald-300 text-emerald-950 font-semibold uppercase">
                <td className="sticky left-0 z-20 bg-emerald-300 px-3 py-2">
                  Ingresos
                </td>
                {filas.map((f, idx) => (
                  <td key={idx} className="px-3 py-2 text-right text-slate-900">
                    {formatUYU(f.ingresos)}
                  </td>
                ))}
              </tr>

              {ingresosDetalleRows.map((row) => (
                <tr key={row.label} className="bg-emerald-100">
                  <td
                    className="sticky left-0 z-20 bg-emerald-100 px-3 py-2 text-emerald-900 w-[160px]"
                    title={row.label}
                  >
                    <span className="block truncate">{row.label}</span>
                  </td>
                  {row.values.map((val, idx) => (
                    <td key={idx} className="px-3 py-2 text-right text-slate-900">
                      {formatUYU(val)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Egresos */}
              <tr className="bg-rose-300 text-rose-950 font-semibold uppercase">
                <td className="sticky left-0 z-20 bg-rose-300 px-3 py-2">
                  Egresos
                </td>
                {filas.map((f, idx) => (
                  <td key={idx} className="px-3 py-2 text-right text-slate-900">
                    {formatUYU(f.egresos)}
                  </td>
                ))}
              </tr>

              {egresosDetalleRows.map((row) => (
                <tr key={row.label} className="bg-rose-100">
                  <td
                    className="sticky left-0 z-20 bg-rose-100 px-3 py-2 text-rose-900 w-[160px]"
                    title={row.label}
                  >
                    <span className="block truncate">{row.label}</span>
                  </td>
                  {row.values.map((val, idx) => (
                    <td key={idx} className="px-3 py-2 text-right text-slate-900">
                      {formatUYU(val)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Ahorro */}
              <tr className="bg-blue-50 text-blue-900 font-semibold">
                <td className="sticky left-0 z-20 bg-blue-50 px-3 py-2">
                  Ahorro
                </td>
                {filas.map((f, idx) => (
                  <td key={idx} className="px-3 py-2 text-right text-slate-900">
                    {formatUYU(f.ahorro)}
                  </td>
                ))}
              </tr>

              {/* Saldo final */}
              <tr className="bg-blue-100 text-blue-950 font-semibold uppercase">
                <td className="sticky left-0 z-20 bg-blue-100 px-3 py-2">
                  Saldo final
                </td>
                {filas.map((f, idx) => (
                  <td
                    key={idx}
                    className={[
                      "px-3 py-2 text-right text-slate-900",
                      f.saldoFinal < 0 ? "text-rose-600" : "",
                    ].join(" ")}
                  >
                    {formatUYU(f.saldoFinal)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatUYU(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value || 0);
}
