
import SubscriptionCheckoutButton from "components/mp/SubscriptionCheckoutButton";
import VerifySubscriptionReturn from "components/mp/VerifySubscriptionReturn";


const RAW_DEFAULT_AMOUNT = Number(
  process.env.NEXT_PUBLIC_MP_ONE_TIME_AMOUNT ??
    process.env.NEXT_PUBLIC_MP_PLAN_AMOUNT ??
    "0"
);

const DEFAULT_PLAN_AMOUNT =
  Number.isFinite(RAW_DEFAULT_AMOUNT) && RAW_DEFAULT_AMOUNT > 0
    ? Math.floor(RAW_DEFAULT_AMOUNT)
    : 250;

const DEFAULT_CURRENCY = (
  process.env.NEXT_PUBLIC_MP_CURRENCY_PREFIX || "UYU"
).toUpperCase();

const BENEFITS = [
  {
    title: "Control completo sin restricciones",
    description:
      "Usá todas las funciones avanzadas para planificar, ajustar y analizar tus finanzas mes a mes.",
  },
  {
    title: "Exportaciones y reportes ilimitados",
    description:
      "Descargá tus datos en CSV cuantas veces quieras para respaldos o análisis personal.",
  },
  {
    title: "Categorías y ajustes personalizados",
    description:
      "Creá tus propias categorías y usá ajustes avanzados en la Estimación específica.",
  },
  {
    title: "Soporte prioritario",
    description:
      "Recibí respuesta en un plazo de hasta 48 horas directamente desde la app.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Cuadro de Proyecciones",
    free: "hasta 6 meses",
    premium: "hasta 2 años",
  },
  {
    feature: "Agregar préstamos, tarjetas y otras compras",
    free: "Hasta 5 operaciones",
    premium: "Sin límites",
  },
  {
    feature: "Agregar categorías personalizadas",
    free: "No disponibles",
    premium: "Ilimitadas",
  },
  {
    feature: "Ajustes en Proyecciones",
    free: "No disponibles",
    premium: "Personalizá cada mes a tu gusto",
  },
  {
    feature: "Exportaciones CSV",
    free: "No disponibles",
    premium: "Ilimitadas",
  },
  {
    feature: "Soporte",
    free: "Normal",
    premium: "Prioritario",
  },
];

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaywallPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const statusParam = normalizeStatus(searchParams?.status);
  const statusMessage =
    statusParam === "failure"
      ? "El pago fue cancelado. Podés intentar nuevamente cuando quieras."
      : statusParam === "pending"
      ? "El pago quedó pendiente. Mercado Pago te avisará cuando se acredite."
      : null;


const subscriptionParam =
  typeof searchParams?.subscription === "string" ? searchParams.subscription : null;

const preapprovalIdParam =
  typeof searchParams?.preapproval_id === "string" ? searchParams.preapproval_id : null;

  <VerifySubscriptionReturn
  subscription={subscriptionParam}
  preapprovalId={preapprovalIdParam}
/>

  const formattedPrice = `${DEFAULT_CURRENCY} ${DEFAULT_PLAN_AMOUNT.toLocaleString(
    "es-UY"
  )}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-4">
     <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent p-8">
        <div className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
            Acceso Premium mensual
          </span>
          <h1 className="text-white text-3xl font-semibold tracking-tight">
            Todo el control, sin límites
          </h1>
          <p className="text-base text-white">
            Pagá una suscripción mensual y desbloqueá todas las funciones avanzadas de Mi Admi. Sin contratos largos, podés cancelar cuando quieras.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-sm text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">Suscripción mensual</div>
          <div className="mt-3 flex items-baseline justify-center gap-2">
            <span className="text-6xl font-bold text-white">{formattedPrice}</span>
            <span className="text-sm text-white">/mes</span>
          </div>
          <p className="mt-3 text-sm text-white">
            Acceso premium inmediato. Volvé a tus herramientas en segundos después de completar el pago en Mercado Pago.
          </p>
        </div>

        <ul className="grid gap-3 text-base text-white sm:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit.title}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 p-3 shadow-sm"
            >
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span>
                <strong className="block text-base text-white">{benefit.title}</strong>
                <span className="text-sm text-white">{benefit.description}</span>
              </span>
            </li>
          ))}
        </ul>

        {statusMessage ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {statusMessage}
          </p>
        ) : null}

        <p className="text-xs text-white">
          Pago seguro con Mercado Pago. La suscripción se cobra mensualmente y podés cancelarla cuando quieras desde tu cuenta, sin cargos adicionales.
        </p>
      </section>

      <section className="rounded-3xl border border-emerald-400/25 bg-slate-900/60 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-3xl font-semibold text-white">Comparativa de planes</h2>
          </div>
        </div>
        <div className="overflow-x-auto rounded-3xl border border-white/10">
          <table className="min-w-full divide-y divide-slate-200 text-base">
            <thead className="bg-white/5 text-base uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3 text-left">Característica</th>
                <th className="px-4 py-3 text-center">VERSIÓN Gratis</th>
                <th className="px-4 py-3 text-center text-emerald-200"> VERSIÓN Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/5">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature}>
                  <td className="px-4 py-3 text-white">{row.feature}</td>
                  <td className="px-4 py-3 text-center text-white">{row.free}</td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-200">
                    {row.premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

<SubscriptionCheckoutButton
  buttonLabel="Suscribirme con Mercado Pago"
  buttonClassName="rounded-xl bg-emerald-500 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-600"
  showMpLogo
  reason="Premium mensual"
/>

      <div className="mx-auto -mt-9 text-xs text-gray-500">
Podés cancelar cuando quieras desde tu cuenta de Mercado Pago.
</div>
    </div>
  );
}




function normalizeStatus(value: unknown): "failure" | "pending" | null {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "failure" || normalized === "pending") {
      return normalized;
    }
  }
  return null;
}
