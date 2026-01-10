"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrencyValue, type SimpleSummarySnapshot } from "./simple-utils";

type SimpleSummaryProps = {
  summary: SimpleSummarySnapshot;
};

const chartPalette = [
  "#8DA9C4",
  "#C9B28A",
  "#E0C1A0",
  "#9AA6B2",
  "#B9B2A5",
  "#7F93A8",
];

export default function SimpleSummary({ summary }: SimpleSummaryProps) {
  const hasChart = summary.chartData.some((slice) => slice.value > 0);
  const hasIncome = summary.income !== null;
  const placeholderText = hasIncome
    ? "Todavía no hay datos para el gráfico."
    : "Respondé ingreso para estimar egresos.";

  return (
    <section className="rounded-3xl border border-white/10 bg-white/95 p-6 text-slate-900 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Entra aprox
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {summary.incomeLabel}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Sale aprox
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {summary.expensesLabel}
          </p>
        </article>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">
          Por dónde se va más
        </p>
        <div className="mt-4 h-[18rem] sm:h-[20rem] md:h-[22rem]">
          {hasChart ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={summary.chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={2}
                  label={({ name }) => name}
                  labelLine={false}
                >
                  {summary.chartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={chartPalette[index % chartPalette.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrencyValue(Number(value) || 0)}
                  contentStyle={{
                    borderRadius: "12px",
                    borderColor: "#E2E8F0",
                    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#334155", fontWeight: 600 }}
                  itemStyle={{ color: "#0F172A" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-xs text-slate-500">
              {placeholderText}
            </div>
          )}
        </div>
        {hasChart ? (
          <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            {summary.chartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: chartPalette[index % chartPalette.length],
                  }}
                />
                <span className="font-medium text-slate-700">{entry.name}</span>
                <span className="ml-auto text-slate-500">
                  {formatCurrencyValue(entry.value)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-4 space-y-1 text-sm text-slate-600">
          <p>
            Egresos aprox:{" "}
            <span className="font-semibold text-slate-900">
              {summary.expensesLabel}
            </span>
          </p>
          <p>
            Te sobra aprox:{" "}
            <span className="font-semibold text-slate-900">
              {summary.surplusLabel}
            </span>
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Estás empezando. No hace falta hacerlo perfecto.
      </p>
    </section>
  );
}
