"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { LS_CUSTOM_CATEGORIES } from "../estimacion/especifica/constants";
import { useHomeData } from "./useHomeData";
import { useCustomCategoryLabels } from "./useCustomCategoryLabels";
import { toNumber } from "./homeNumbers";
import { normalizeEspecifica, normalizeGeneral, hasMeaningfulData } from "./homeNormalize";
import { calculateTotals } from "./homeCalculations";
import { buildConsejos } from "./homeConsejos";





const TOUR_STEPS = [
  {
    id: 1,
    target: "#home-balance-card",
    title: "Tu resumen del mes",
    body: "Acá ves tus ingresos, gastos y si el mes cierra positivo o negativo.",
  },
  {
    id: 2,
    target: "#home-categories-chart",
    title: "En qué se te va la plata",
    body: "Este gráfico te muestra cuánto gastás por categoría.",
  },
  {
    id: 3,
    target: "#home-actions",
    title: "Los consejos",
    body: "Acá verás sugerencias generadas por nuestra IA. No reemplazan asesoramiento financiero, pero te pueden servir como guía para organizarte mejor",
  },
];

const incomePalette = ["#064e3b", "#047857", "#0f766e", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];
const expensePalette = ["#991b1b", "#dc2626", "#ef4444", "#f97316", "#fb923c", "#facc15", "#fde047", "#a855f7", "#7c3aed", "#2563eb", "#38bdf8"];

const SPECIFIC_INCOME_LABELS = {
  sueldos: "Sueldos / Ingresos",
  extraordinarios: "Ingresos extraordinarios",
  devolucion: "Devolución de impuestos",
  prestamosingresos: "Préstamos",
  familia: "Familia",
  otros: "Otros",
};

const SPECIFIC_EXPENSE_LABELS = {
  super: "Super",
  alquiler: "Alquiler / Hipoteca",
  gastosfijos: "Gastos fijos",
  gym: "Gym",
  otrasactividades: "Otras actividades",
  salud: "Salud y estética",
  transporte: "Transporte / Combustible",
  generales: "Gastos generales",
  ropa: "Ropa",
  entretenimiento: "Entretenimiento y salidas",
  viajes: "Viajes",
  educacion: "Educación",
  adquisiciones: "Adquisiciones (compras grandes)",
  reparaciones: "Reparaciones de vehículo",
  prestamos: "Préstamos",
  tarjetas: "Tarjetas",
};

const fmtUYU = (v, maxFrac = 0) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: maxFrac,
  }).format(v || 0);

export default function HomeClient() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const verifyRef = useRef(false);

  const { general, especifica, estimables, activeMode } = useHomeData(supabase);
  const customCategoryLabels = useCustomCategoryLabels(LS_CUSTOM_CATEGORIES);

  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const activeStep = showTour ? TOUR_STEPS.find((step) => step.id === currentStep) : null;
  const activeTarget = activeStep?.target ?? null;
  const highlightBalance = activeTarget === "#home-balance-card";
  const highlightCategories = activeTarget === "#home-categories-chart";
  const highlightActions = activeTarget === "#home-actions";
  useEffect(() => {
    if (!showTour || !activeTarget) return;
    const el = document.querySelector(activeTarget);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showTour, activeTarget]);

  const incomeLabelDictionary = useMemo(
    () => ({ ...SPECIFIC_INCOME_LABELS, ...customCategoryLabels.ingresos }),
    [customCategoryLabels.ingresos]
  );
  const expenseLabelDictionary = useMemo(
    () => ({ ...SPECIFIC_EXPENSE_LABELS, ...customCategoryLabels.egresos }),
    [customCategoryLabels.egresos]
  );

  const generalNormalized = useMemo(
    () =>
      normalizeGeneral(general, {
        incomeLabels: incomeLabelDictionary,
        expenseLabels: expenseLabelDictionary,
      }),
    [general, incomeLabelDictionary, expenseLabelDictionary]
  );
  const especificaNormalized = useMemo(
    () =>
      normalizeEspecifica(especifica, {
        incomeLabels: incomeLabelDictionary,
        expenseLabels: expenseLabelDictionary,
      }),
    [especifica, incomeLabelDictionary, expenseLabelDictionary]
  );

  const includeGeneral = activeMode === "general";
  const activeModeLabel = includeGeneral ? "Simple" : "Avanzado";
  const activeNormalized = includeGeneral ? generalNormalized : especificaNormalized;

  const totals = useMemo(() => calculateTotals(activeNormalized), [activeNormalized]);
  const ingresosTotales = totals.ingresosTotales;
  const egresosTotales = totals.egresosTotales;
  const resultado = totals.resultado;
  const capacidadMensual = totals.capacidadMensual;
  const saldoProyectado = totals.saldoProyectado;

  const graficoIngresos = activeNormalized.ingresosPorCategoria;
  const graficoEgresos = activeNormalized.egresosPorCategoria;

  const gastoSobreIngreso =
    ingresosTotales > 0
      ? Math.round((egresosTotales / ingresosTotales) * 100)
      : null;

  const totalPrestamos = Array.isArray(estimables?.prestamos)
    ? estimables.prestamos.reduce((acc, it) => acc + toNumber(it?.montoCuota), 0)
    : 0;

  const totalTarjetas = Array.isArray(estimables?.tarjetas)
    ? estimables.tarjetas.reduce((acc, it) => acc + toNumber(it?.montoCuota), 0)
    : 0;

  const totalCompras = Array.isArray(estimables?.compras)
    ? estimables.compras.reduce((acc, it) => acc + toNumber(it?.valor), 0)
    : 0;

  const totalEstimables = totalPrestamos + totalTarjetas + totalCompras;

  const tieneGeneral = useMemo(
    () => hasMeaningfulData(generalNormalized),
    [generalNormalized]
  );
  const tieneEspecifica = useMemo(
    () => hasMeaningfulData(especificaNormalized),
    [especificaNormalized]
  );

  const consejos = useMemo(
    () =>
      buildConsejos({
        totals,
        activeNormalized,
        generalNormalized,
        especificaNormalized,
        includeGeneral,
        activeModeLabel,
        graficoIngresos,
        graficoEgresos,
        totalPrestamos,
        totalTarjetas,
        totalCompras,
        totalEstimables,
        tieneGeneral,
        tieneEspecifica,
      }),
    [
      totals,
      activeNormalized,
      generalNormalized,
      especificaNormalized,
      includeGeneral,
      activeModeLabel,
      graficoIngresos,
      graficoEgresos,
      totalPrestamos,
      totalTarjetas,
      totalCompras,
      totalEstimables,
      tieneGeneral,
      tieneEspecifica,
    ]
  );

  useEffect(() => {
    const key = "miadmi:onboarding-tour";
    try {
      const stored = localStorage.getItem(key);
      if (stored === "pending") {
        setShowTour(true);
        setCurrentStep(1);
        localStorage.setItem(key, "done");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (verifyRef.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const subscriptionFlag = params.get("subscription");
    const preapprovalId = params.get("preapproval_id");

    if (subscriptionFlag !== "1" || !preapprovalId) return;
    verifyRef.current = true;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        await fetch("/api/mp/verify-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ preapproval_id: preapprovalId }),
        });
      } catch (err) {
        console.error("Failed to verify subscription", err);
      } finally {
        params.delete("subscription");
        params.delete("preapproval_id");
        const nextParams = params.toString();
        const nextUrl = nextParams ? `/home?${nextParams}` : "/home";
        router.replace(nextUrl);
      }
    })();
  }, [router, supabase]);

const resumenCards = [
  {
    label: "Resultado del mes",
    value: fmtUYU(resultado),
    icon: resultado >= 0 ? TrendingUp : TrendingDown,
    tone: resultado >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
    cardClass: resultado >= 0 ? "border-emerald-200 bg-emerald-100" : "border-rose-200 bg-rose-100",
    description: resultado >= 0 ? "Superávit" : "Déficit",
  },
  {
    label: "Ingresos totales",
    value: fmtUYU(ingresosTotales),
    icon: TrendingUp,
    tone: "text-emerald-700 bg-emerald-100",
    cardClass: "border-emerald-200 bg-emerald-100",
    description: activeModeLabel,
  },
  {
    label: "Egresos totales",
    value: fmtUYU(egresosTotales),
    icon: TrendingDown,
    tone: "text-rose-700 bg-rose-100",
    cardClass: "border-rose-200 bg-rose-100",
    description:
      gastoSobreIngreso != null
        ? `${gastoSobreIngreso}% del ingreso activo`
        : "Sin ingresos declarados",
  },
  {
    label: "Capacidad mensual",
    value: fmtUYU(capacidadMensual),
    icon: resultado >= 0 ? TrendingUp : TrendingDown,
    tone: resultado >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
    cardClass: resultado >= 0 ? "border-emerald-200 bg-emerald-100" : "border-rose-200 bg-rose-100",
    description:
      capacidadMensual >= 0
        ? "Margen después del ahorro"
        : "Revisá tus objetivos",
  },
];


  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            {format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-white">Hola de nuevo</h2>
          <p className="text-sm text-white/80">
            Consolidá tus ingresos y egresos para ver cómo evoluciona tu economía personal.
          </p>
        </div>
     <div className="flex items-center gap-3 md:justify-end">
  <span className="text-xs uppercase tracking-wide text-white/70">Modo activo</span>
          <span
  className={[
    "rounded-full border px-3 py-1 text-sm font-semibold",
    includeGeneral
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
      : "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  ].join(" ")}
>
  {activeModeLabel}
</span>

        </div>
      </header>

  <section
    id="home-balance-card"
    className={[
      highlightBalance
        ? "relative z-40 rounded-3xl bg-slate-900/90 ring-4 ring-emerald-300/80 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-emerald-500/40 p-3 md:p-4"
        : "p-0",
    ].join(" ")}
  >
    <div className="mx-auto w-full max-w-7xl">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
        {resumenCards.map((card) => (
          <article
            key={card.label}
            className={`rounded-2xl border p-4 md:p-5 shadow-sm flex flex-col gap-2 md:gap-3 ${card.cardClass}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm md:text-lg font-medium text-slate-900">
                {card.label}
              </span>
              <span
                className={`flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full ${card.tone}`}
              >
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            <div className="text-xl md:text-2xl font-semibold text-slate-900">
              {card.value}
            </div>
            <p className="text-xs md:text-sm text-slate-600">{card.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>






      <section className="grid gap-4 lg:grid-cols-2">
        <article
          id="home-categories-chart"
          className={[
            "rounded-2xl border border-slate-100 bg-emerald-100 p-6 text-slate-900 shadow-sm",
            highlightCategories
              ? "relative z-40 rounded-3xl bg-slate-900/90 ring-4 ring-emerald-300/80 ring-offset-2 ring-offset-white shadow-xl shadow-emerald-500/40"
              : "",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold">Distribución de ingresos</h3>
            <span className="text-sm text-emerald-700">
              {graficoIngresos.length ? `${graficoIngresos.length} categorías` : "Sin datos"}
            </span>
          </div>
          <div className="h-[26rem]">
            {graficoIngresos.length ? (
              <ResponsiveContainer>
                <PieChart margin={{ top: 8, bottom: 32 }}>
                  <Pie
                    data={graficoIngresos}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                  >
                    {graficoIngresos.map((entry, index) => (
                      <Cell key={entry.name} fill={incomePalette[index % incomePalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [fmtUYU(value), name]}
                    contentStyle={{ borderRadius: 12, borderColor: "#d1fae5" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    height={32}
                    wrapperStyle={{ color: "#065f46", fontSize: 15 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 text-sm text-emerald-700">
                Registrá al menos un ingreso para ver la distribución.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-rose-100 p-6 text-slate-900 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-slate-900">Distribución de egresos</h3>
            <span className="text-sm text-rose-700">
              {graficoEgresos.length ? `${graficoEgresos.length} categorías` : "Sin datos"}
            </span>
          </div>
          <div className="h-[26rem]">
            {graficoEgresos.length ? (
              <ResponsiveContainer>
                <PieChart margin={{ top: 8, bottom: 10 }}>
                  <Pie
                    data={graficoEgresos}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                  >
                    {graficoEgresos.map((entry, index) => (
                      <Cell key={entry.name} fill={expensePalette[index % expensePalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [fmtUYU(value), name]}
                    contentStyle={{ borderRadius: 12, borderColor: "#fecdd3" }}
                  />
                  <Legend
  verticalAlign="bottom"
  align="center"
  iconType="circle"
  wrapperStyle={{
    color: "#7f1d1d",
    fontSize: 15,
    width: "100%",
    whiteSpace: "normal",
    lineHeight: "1.1",
  }}
/>

                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-rose-200 text-sm text-rose-700">
                Registrá egresos para identificar los rubros más pesados.
              </div>
            )}
          </div>
        </article>
      </section>

<section
  id="home-actions"
  className={[
    "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm",
    highlightActions
      ? "relative z-40 ring-4 ring-emerald-300/80 ring-offset-2 ring-offset-white shadow-xl shadow-emerald-500/40"
      : "",
  ].join(" ")}
>
  <div className="flex items-center gap-2 mb-4">
    <Lightbulb className="h-5 w-5 text-amber-500" />
    <h3 className="text-lg font-semibold text-slate-900">Consejos personalizados</h3>
  </div>

  {consejos.length === 0 ? (
    <p className="text-sm text-slate-600">
      Cargá tus datos básicos para recibir sugerencias puntuales.
    </p>
  ) : (
    <>
      <p className="mb-2 text-xs text-slate-500">
        Estas sugerencias se basan solo en los datos que cargaste este mes y no reemplazan asesoramiento financiero profesional.
      </p>
      <ul className="space-y-2 text-sm text-slate-700">
        {consejos.map((tip, idx) => (
          <li key={idx} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            {tip}
          </li>
        ))}
      </ul>
    </>
  )}


</section>


      {showTour ? (
        <div className="fixed inset-0 z-30 bg-black/40 pointer-events-none" />
      ) : null}

      {showTour ? (
        <OnboardingTour
          steps={TOUR_STEPS}
          currentStep={currentStep}
          onNext={() => {
            const next = currentStep + 1;
            if (next > TOUR_STEPS.length) {
              setShowTour(false);
            } else {
              setCurrentStep(next);
            }
          }}
          onSkip={() => setShowTour(false)}
        />
      ) : null}
    </div>
  );
}

function OnboardingTour({ steps, currentStep, onNext, onSkip }) {
  const step = steps.find((item) => item.id === currentStep);
  if (!step) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:pb-6">
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-4 shadow-2xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Paso {currentStep} de {steps.length}
            </p>
            <h4 className="mt-1 text-sm font-semibold text-white sm:text-base">
              {step.title}
            </h4>
            <p className="mt-1 text-xs text-white/80 sm:text-sm">{step.body}</p>
          </div>
          <div className="flex gap-2 sm:items-center sm:self-center">
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800 sm:text-sm"
            >
              Saltar
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-emerald-400 sm:text-sm"
            >
              {currentStep >= steps.length ? "Cerrar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

