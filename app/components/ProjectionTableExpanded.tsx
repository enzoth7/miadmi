"use client";

export default function ProjectionTableExpanded({
  onClose,
  monthLabels,
  projectionData,
  incomeCategories,
  expenseCategories,
  incomeSeriesMap,
  expenseSeriesMap,
  saldoInicialRow,
  comprasPlanValues,
}: {
  onClose: () => void;
  monthLabels: string[];
  projectionData: any;
  incomeCategories: any[];
  expenseCategories: any[];
  incomeSeriesMap: Map<string, number[]>;
  expenseSeriesMap: Map<string, number[]>;
  saldoInicialRow: number[];
  comprasPlanValues: number[];
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

      {/* Body scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[980px] p-4">
<div className="w-full rounded-xl border border-slate-100 pb-2">
  <div className="min-w-[980px]">
    <table className="min-w-max w-full table-auto border-collapse text-sm whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
<th className="px-3 py-2 text-left sticky top-0 left-0 z-[100] bg-slate-100 w-[140px] min-w-[140px] max-w-[140px]">
  Concepto
</th>

{monthLabels.map((label, idx) => (
<th
  key={label + idx}
  className="px-3 py-2 text-right sticky top-0 z-[90] bg-slate-100"
>
  {label}
</th>

))}

              </tr>
            </thead>
            <tbody>
              <tr className="bg-blue-100 text-blue-900 font-semibold">
<td
  className="px-3 py-2 sticky top-[32px] left-0 z-30 bg-blue-100 w-[140px] min-w-[140px] max-w-[140px]"
>
  Saldo mes pasado
</td>


{monthLabels.map((_, idx) => (
  <td
    key={`saldo-inicial-${idx}`}
    className="px-3 py-2 text-right sticky top-[32px] z-20 bg-blue-100"
  >
    <span className="tabular-nums">
      {formatUYU(saldoInicialRow[idx])}
    </span>
  </td>
))}

              </tr>
<tr className="bg-emerald-300 text-emerald-950 font-semibold uppercase tracking-wide">
<td
  className="px-3 py-2 sticky top-[64px] left-0 z-30 bg-emerald-300 w-[140px]"
>
  Ingresos
</td>

  {projectionData.resumen.ingresos.map((value, idx) => (
    <td
      key={`ingresos-total-${idx}`}
  className="px-3 py-2 text-right sticky top-[64px] z-20 bg-emerald-300"
    >
      {formatUYU(value)}
    </td>
  ))}
</tr>


              {incomeCategories.map((cat) => {
                const values = incomeSeriesMap.get(cat.id) ?? Array(monthLabels.length).fill(0);
                return (
                  <tr key={cat.id} className="bg-emerald-100">
             <td
  className="px-3 py-2 text-sm font-medium text-emerald-900 sticky left-0 z-20 bg-emerald-100 border-r border-slate-300 w-[140px] min-w-[140px] max-w-[140px]"
  title={cat.label}
>
  <span className="block truncate">{cat.label}</span>
</td>

                    {monthLabels.map((_, idx) => (
                      <td key={`${cat.id}-${idx}`} className="px-3 py-2 text-right text-slate-900">
                        <span className="tabular-nums">{formatUYU(values[idx] ?? 0)}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}

<tr className="bg-rose-300 text-rose-950 font-semibold uppercase tracking-wide">
  <td
    className="px-3 py-2 sticky top-[96px] left-0 z-30 bg-rose-300 w-[140px]"
  >
    Egresos
  </td>
  {projectionData.resumen.egresos.map((value, idx) => (
    <td
      key={`egresos-total-${idx}`}
      className="px-3 py-2 text-right sticky top-[96px] z-20 bg-rose-300"
    >
      {formatUYU(value)}
    </td>
  ))}
</tr>


              {expenseCategories.map((cat) => {
                const values = expenseSeriesMap.get(cat.id) ?? Array(monthLabels.length).fill(0);
                return (
                  <tr key={cat.id} className="bg-rose-100">
       <td
  className="px-3 py-2 text-sm font-medium text-rose-900 sticky left-0 z-20 bg-rose-100 border-r border-slate-300 w-[140px] min-w-[140px] max-w-[140px]"
  title={cat.label}
>
  <span className="block truncate">{cat.label}</span>
</td>

                    {monthLabels.map((_, idx) => (
                      <td key={`${cat.id}-${idx}`} className="px-3 py-2 text-right text-slate-900">
                        <span className="tabular-nums">{formatUYU(values[idx] ?? 0)}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}

              <tr className="bg-rose-100">
<td
  className="px-3 py-2 text-sm font-medium text-rose-900 sticky left-0 z-20 bg-rose-100 w-[140px] min-w-[140px] max-w-[140px]"
  title="Compras planificadas"
>
  <span className="block truncate">Compras planificadas</span>
</td>

                {monthLabels.map((_, idx) => (
                  <td key={`compras-plan-${idx}`} className="px-3 py-2 text-right text-slate-900">
                    <span className="tabular-nums">{formatUYU(comprasPlanValues[idx] ?? 0)}</span>
                  </td>
                ))}
              </tr>

<tr className="bg-blue-50 text-blue-900 font-semibold">
  <td
    className="px-3 py-2 sticky top-[96px] left-0 z-30 bg-blue-50 w-[140px]"
  >
    Ahorro
  </td>
  {monthLabels.map((_, idx) => (
    <td
      key={`ahorro-row-${idx}`}
      className="px-3 py-2 text-right sticky top-[96px] z-20 bg-blue-50"
    >
      {formatUYU(projectionData.resumen.ahorro[idx] ?? 0)}
    </td>
  ))}
</tr>


<tr className="bg-blue-100 text-blue-950 font-semibold uppercase tracking-wide">
  <td
    className="px-3 py-2 sticky top-[128px] left-0 z-30 bg-blue-100 w-[140px]"
  >
    Saldo final
  </td>
  {projectionData.resumen.saldo.map((value, idx) => (
    <td
      key={`saldo-final-${idx}`}
      className={[
        "px-3 py-2 text-right sticky top-[128px] z-20 bg-blue-100",
        value < 0 ? "text-rose-600" : "",
      ].join(" ")}
    >
      {formatUYU(value)}
    </td>
  ))}
</tr>

            </tbody>
          </table>
        </div>
        </div>
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
