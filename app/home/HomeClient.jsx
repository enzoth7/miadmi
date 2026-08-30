"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Car, CreditCard, GraduationCap, HeartPulse, Home, Lightbulb, Plane, ReceiptText, ShoppingCart, WalletCards } from "lucide-react";
import { LS_CUSTOM_CATEGORIES, buildMonthLabels } from "../estimacion/especifica/constants";
import { useHomeData } from "./useHomeData";
import { useCustomCategoryLabels } from "./useCustomCategoryLabels";
import { toNumber } from "./homeNumbers";
import { normalizeEspecifica, normalizeGeneral, hasMeaningfulData } from "./homeNormalize";
import { calculateTotals } from "./homeCalculations";
import { buildConsejos } from "./homeConsejos";
import { MetricCard, PageSurface, Reveal, StaggerGrid, StaggerItem } from "../../components/financial/FinancialPrimitives";

const INCOME_LABELS = { sueldos: "Sueldos / Ingresos", extraordinarios: "Ingresos extraordinarios", devolucion: "Devolución de impuestos", prestamosingresos: "Préstamos", familia: "Familia", otros: "Otros" };
const EXPENSE_LABELS = { super: "Supermercado", alquiler: "Alquiler / Hipoteca", gastosfijos: "Gastos fijos", gym: "Actividad física", otrasactividades: "Otras actividades", salud: "Salud y estética", transporte: "Transporte", generales: "Gastos generales", ropa: "Ropa", entretenimiento: "Entretenimiento", viajes: "Viajes", educacion: "Educación", adquisiciones: "Compras grandes", reparaciones: "Reparaciones", prestamos: "Préstamos", tarjetas: "Tarjetas" };
const incomePalette = ["#0B1E3A", "#1D4ED8", "#60A5FA", "#FACC15", "#94A3B8"];
const fmtUYU = (value) => new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(value || 0);
const monthValue = (row, index, fallback) => {
  const value = Array.isArray(row) ? row[index] : null;
  return value === "" || value == null ? toNumber(fallback) : toNumber(value);
};
const objectTotal = (value) => Object.values(value || {}).reduce((sum, item) => sum + toNumber(item?.monto ?? item), 0);

function buildProjection({ includeGeneral, especifica, activeNormalized }) {
  const labels = buildMonthLabels(12);
  if (includeGeneral) return labels.map((month) => ({ month, ingresos: activeNormalized.ingresos, egresos: activeNormalized.egresos, resultado: activeNormalized.ingresos - activeNormalized.egresos - activeNormalized.ahorroDeseado }));
  const projection = especifica?.projection || {};
  const ingresos = especifica?.ingresos || {};
  const egresos = especifica?.egresos || {};
  const ahorroBase = toNumber(especifica?.ahorroMensual ?? especifica?.ahorro_mensual ?? especifica?.ahorroDeseado);
  return labels.map((month, index) => {
    const ingreso = Object.keys(ingresos).reduce((sum, key) => sum + monthValue(projection?.ingresos?.[key], index, ingresos[key]?.monto ?? ingresos[key]), 0);
    const egreso = Object.keys(egresos).reduce((sum, key) => sum + monthValue(projection?.egresos?.[key], index, egresos[key]?.monto ?? egresos[key]), 0);
    const ahorro = monthValue(projection?.ahorro, index, ahorroBase);
    return { month, ingresos: ingreso || objectTotal(ingresos), egresos: egreso || objectTotal(egresos), resultado: ingreso - egreso - ahorro };
  });
}

function iconForExpense(name) {
  const value = name.toLowerCase();
  if (value.includes("alquiler") || value.includes("hipoteca")) return Home;
  if (value.includes("super")) return ShoppingCart;
  if (value.includes("transporte") || value.includes("vehículo")) return Car;
  if (value.includes("salud") || value.includes("farmacia")) return HeartPulse;
  if (value.includes("educación")) return GraduationCap;
  if (value.includes("viaje")) return Plane;
  if (value.includes("tarjeta")) return CreditCard;
  if (value.includes("cuenta") || value.includes("fijo")) return ReceiptText;
  return WalletCards;
}

function EmptyState({ copy }) {
  return <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center"><p className="max-w-sm text-sm leading-6 text-slate-600">{copy}</p><Link href="/estimacion" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-yellow px-5 py-2.5 text-sm font-bold text-brand-navy transition-colors hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2">Estimar mi mes</Link></div>;
}

export default function HomeClient() {
  const { general, especifica, estimables, activeMode } = useHomeData();
  const customLabels = useCustomCategoryLabels(LS_CUSTOM_CATEGORIES);
  const dictionaries = useMemo(() => ({ incomeLabels: { ...INCOME_LABELS, ...customLabels.ingresos }, expenseLabels: { ...EXPENSE_LABELS, ...customLabels.egresos } }), [customLabels.egresos, customLabels.ingresos]);
  const generalNormalized = useMemo(() => normalizeGeneral(general, dictionaries), [dictionaries, general]);
  const especificaNormalized = useMemo(() => normalizeEspecifica(especifica, dictionaries), [dictionaries, especifica]);
  const includeGeneral = activeMode === "general";
  const activeNormalized = includeGeneral ? generalNormalized : especificaNormalized;
  const totals = useMemo(() => calculateTotals(activeNormalized), [activeNormalized]);
  const hasData = hasMeaningfulData(activeNormalized);
  const projection = useMemo(() => buildProjection({ includeGeneral, especifica, activeNormalized }), [activeNormalized, especifica, includeGeneral]);
  const tightest = projection.reduce((lowest, month) => month.resultado < lowest.resultado ? month : lowest, projection[0]);
  const incomeChart = activeNormalized.ingresosPorCategoria;
  const topExpenses = [...activeNormalized.egresosPorCategoria].sort((a, b) => b.value - a.value).slice(0, 4);
  const expenseTotal = activeNormalized.egresosPorCategoria.reduce((sum, item) => sum + item.value, 0);
  const totalPrestamos = (estimables?.prestamos || []).reduce((sum, item) => sum + toNumber(item?.montoCuota), 0);
  const totalTarjetas = (estimables?.tarjetas || []).reduce((sum, item) => sum + toNumber(item?.montoCuota), 0);
  const totalCompras = (estimables?.compras || []).reduce((sum, item) => sum + toNumber(item?.valor), 0);
  const consejos = useMemo(() => buildConsejos({ totals, activeNormalized, generalNormalized, especificaNormalized, includeGeneral, activeModeLabel: includeGeneral ? "Simple" : "Avanzado", graficoIngresos: incomeChart, graficoEgresos: activeNormalized.egresosPorCategoria, totalPrestamos, totalTarjetas, totalCompras, totalEstimables: totalPrestamos + totalTarjetas + totalCompras, tieneGeneral: hasMeaningfulData(generalNormalized), tieneEspecifica: hasMeaningfulData(especificaNormalized) }), [activeNormalized, especificaNormalized, generalNormalized, includeGeneral, incomeChart, totalCompras, totalPrestamos, totalTarjetas, totals]);
  const cards = [
    { label: "Ingresos estimados", value: fmtUYU(totals.ingresosTotales), detail: includeGeneral ? "Estimación simple" : "Estimación avanzada", icon: ArrowUpRight, tone: "positive" },
    { label: "Egresos estimados", value: fmtUYU(totals.egresosTotales), detail: totals.ingresosTotales ? `${Math.round((totals.egresosTotales / totals.ingresosTotales) * 100)}% de tus ingresos` : "Sin ingresos cargados", icon: ArrowDownRight, tone: "negative" },
    { label: "Margen disponible", value: fmtUYU(totals.capacidadMensual), detail: "Después del ahorro previsto", icon: WalletCards, tone: totals.capacidadMensual >= 0 ? "brand" : "negative" },
    { label: "Mes más ajustado", value: hasData ? tightest.month : "Sin datos", detail: hasData ? fmtUYU(tightest.resultado) : "Completá una estimación", icon: CalendarDays, tone: "accent" },
  ];

  return <PageSurface><div className="space-y-7">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Una vista clara de tus estimaciones y de cómo podrían evolucionar durante los próximos 12 meses.</p></div><Link href="/estimacion" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-yellow px-5 py-2.5 text-sm font-bold text-brand-navy transition-colors hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2">Actualizar estimación</Link></header>
    <StaggerGrid as="section" aria-label="Resumen financiero" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map((card) => <MetricCard key={card.label} {...card} />)}</StaggerGrid>
    <Reveal><section className="grid gap-5 lg:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Proyección de ingresos</h2><p className="mt-1 text-xs text-slate-500">{includeGeneral ? "Proyección constante basada en tu estimación simple." : "Usa los ajustes mensuales de tu estimación avanzada."}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Próximos 12 meses</span></div>{hasData ? <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={projection} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.28}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={46}/><Tooltip formatter={(value) => [fmtUYU(value), "Ingresos"]} contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}/><Area type="monotone" dataKey="ingresos" stroke="#2563eb" strokeWidth={3} fill="url(#incomeFill)" activeDot={{ r: 5 }}/></AreaChart></ResponsiveContainer></div> : <EmptyState copy="Completá una estimación para ver la evolución de tus ingresos."/>}</article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div><h2 className="text-lg font-bold">Distribución de ingresos</h2><p className="mt-1 text-xs text-slate-500">De dónde proviene tu dinero estimado.</p></div>{incomeChart.length ? <><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={incomeChart} dataKey="value" nameKey="name" innerRadius={62} outerRadius={98} paddingAngle={3}>{incomeChart.map((entry, index) => <Cell key={entry.name} fill={incomePalette[index % incomePalette.length]}/>)}</Pie><Tooltip formatter={(value, name) => [fmtUYU(value), name]} contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}/></PieChart></ResponsiveContainer></div><div className="grid gap-2">{incomeChart.slice(0, 4).map((item, index) => <div key={item.name} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: incomePalette[index % incomePalette.length] }}/><span className="truncate">{item.name}</span></span><strong>{fmtUYU(item.value)}</strong></div>)}</div></> : <div className="mt-4"><EmptyState copy="Cargá un ingreso para ver cómo se distribuye."/></div>}</article>
      {hasData ? <div className="sr-only"><table><caption>Proyección financiera de los próximos 12 meses</caption><thead><tr><th>Mes</th><th>Ingresos</th><th>Egresos</th><th>Resultado después del ahorro</th></tr></thead><tbody>{projection.map((month) => <tr key={month.month}><th>{month.month}</th><td>{fmtUYU(month.ingresos)}</td><td>{fmtUYU(month.egresos)}</td><td>{fmtUYU(month.resultado)}</td></tr>)}</tbody></table><table><caption>Distribución de ingresos</caption><thead><tr><th>Categoría</th><th>Importe</th></tr></thead><tbody>{incomeChart.map((item) => <tr key={item.name}><th>{item.name}</th><td>{fmtUYU(item.value)}</td></tr>)}</tbody></table></div> : null}
    </section></Reveal>
    <section><div className="mb-4"><h2 className="text-lg font-bold">Tus gastos principales</h2><p className="mt-1 text-sm text-slate-600">Las cuatro categorías que hoy tienen mayor peso.</p></div>{topExpenses.length ? <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{topExpenses.map((item) => { const Icon = iconForExpense(item.name); const percentage = expenseTotal ? Math.round((item.value / expenseTotal) * 100) : 0; return <StaggerItem key={item.name}><article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-brand-blue"><Icon aria-hidden="true" className="h-5 w-5"/></span><span className="rounded-full bg-brand-yellow px-2.5 py-1 text-xs font-bold text-brand-navy">{percentage}%</span></div><h3 className="mt-5 truncate text-sm font-semibold text-slate-700">{item.name}</h3><p className="mt-1 text-xl font-bold tabular-nums text-brand-navy">{fmtUYU(item.value)}</p></article></StaggerItem>; })}</StaggerGrid> : <EmptyState copy="Cuando cargues tus egresos, vas a ver acá las categorías más importantes."/>}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-yellow text-brand-navy"><Lightbulb aria-hidden="true" className="h-5 w-5"/></span><h2 className="text-lg font-bold">Consejos personalizados</h2></div>{consejos.length ? <><p className="mb-3 text-xs leading-5 text-slate-500">Se basan en tus estimaciones y no reemplazan asesoramiento profesional.</p><ul className="grid gap-3 md:grid-cols-2">{consejos.map((tip, index) => <li key={`${tip}-${index}`} className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{tip}</li>)}</ul></> : <EmptyState copy="Cargá tus datos para recibir sugerencias útiles según tu situación."/>}</section>
  </div></PageSurface>;
}

