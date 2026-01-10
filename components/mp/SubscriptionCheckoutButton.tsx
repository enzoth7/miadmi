"use client";

import { useState } from "react";

type Props = {
  buttonLabel?: string;
  buttonClassName?: string;
  showMpLogo?: boolean;
  reason?: string;
};

const MP_LOGO_SRC = "/mp_logo.png";

export default function SubscriptionCheckoutButton({
  buttonLabel = "Suscribirme con Mercado Pago",
  buttonClassName = "rounded-xl bg-emerald-500 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-600",
  showMpLogo = true,
  reason = "Premium mensual",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/mp/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // same-origin => manda cookies de sesión (clave para que tu endpoint encuentre al user)
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("MP subscription error:", data);
        alert(data?.error || "No se pudo iniciar la suscripción.");
        return;
      }

      const initPoint = data?.init_point;
      if (!initPoint) {
        alert("Mercado Pago no devolvió el link de pago.");
        return;
      }

      window.location.href = initPoint;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 ${buttonClassName} ${
          loading ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {showMpLogo ? (
          <span className="grid h-10 w-10 place-items-center rounded-lg">
            <img src={MP_LOGO_SRC} alt="Mercado Pago" className="h-10 w-10 object-contain" />
          </span>
        ) : null}
        {loading ? "Abriendo Mercado Pago..." : buttonLabel}
      </button>
    </div>
  );
}
