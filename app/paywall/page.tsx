import MessagePaymentSection from "@/components/mp/MessagePaymentSection";

const RAW_DEFAULT_AMOUNT = Number(
  process.env.NEXT_PUBLIC_MP_ONE_TIME_AMOUNT ??
    process.env.NEXT_PUBLIC_MP_PLAN_AMOUNT ??
    "0"
);

const DEFAULT_PLAN_AMOUNT =
  Number.isFinite(RAW_DEFAULT_AMOUNT) && RAW_DEFAULT_AMOUNT > 0
    ? Math.floor(RAW_DEFAULT_AMOUNT)
    : 200;

const DEFAULT_CURRENCY = (
  process.env.NEXT_PUBLIC_MP_CURRENCY_PREFIX || "UYU"
).toUpperCase();

const FEATURES = [
  "Exportaciones .xlsx ilimitadas",
  "Multi-fonditos y categorias personalizadas",
  "Historial y proyecciones guardadas en la nube",
  "Actualizaciones y soporte prioritario",
];

export const dynamic = "force-dynamic";

export default function PaywallPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const statusParam = normalizeStatus(searchParams?.status);
  const statusMessage =
    statusParam === "failure"
      ? "El pago fue cancelado. Podés intentar de nuevo cuando quieras."
      : statusParam === "pending"
      ? "El pago quedó pendiente. Mercado Pago te avisará cuando se acredite."
      : null;

  const formattedPrice = `${DEFAULT_CURRENCY} ${DEFAULT_PLAN_AMOUNT.toLocaleString(
    "es-UY"
  )}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-4">
      <section className="space-y-4 rounded-2xl border border-white/60 bg-gradient-to-b from-sky-50 via-white to-white/70 p-8 text-gray-900 shadow-xl">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Plan Premium
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            Potencia tu administración financiera
          </h1>
          <p className="max-w-xl text-sm text-gray-600">
            Compra el acceso premium una sola vez y desbloqueá todas las funciones sin
            suscripciones ni cobros automáticos.
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-sm uppercase tracking-wider text-emerald-600">
            Pago único
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">
              {formattedPrice}
            </span>
            <span className="text-sm text-gray-500">una vez</span>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Acceso premium inmediato. Volvé a tus herramientas en segundos después de
            completar el pago en Mercado Pago.
          </p>
        </div>

        <ul className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white/70 p-3 shadow-sm"
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
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {statusMessage ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {statusMessage}
          </p>
        ) : null}

        <p className="text-xs text-gray-500">
          Pago seguro con Mercado Pago. Si tenés dudas o tu pago figura pendiente, podés
          escribirnos y revisar el estado desde tu cuenta de Mercado Pago.
        </p>
      </section>

      <MessagePaymentSection
        title={null}
        description={null}
        collectMessage={false}
        showHistory={false}
        buttonLabel="Comprar acceso con Mercado Pago"
        defaultMessage="Acceso premium desde paywall"
        buttonClassName="rounded-xl bg-emerald-500 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-600"
        showMpLogo
        returnPath="/paywall"
      />
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
