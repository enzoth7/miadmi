"use client";

import { useEffect, useState } from "react";

export default function VerifySubscriptionReturn({
  subscription,
  preapprovalId,
}: {
  subscription?: string | null;
  preapprovalId?: string | null;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Solo corre si venimos del retorno de MP
    if (subscription !== "1" || !preapprovalId) return;

    let cancelled = false;

    async function run() {
      setMsg("Verificando tu suscripción...");

      const res = await fetch("/api/mp/verify-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preapproval_id: preapprovalId }),
      });

      const data = await res.json().catch(() => ({}));

      if (cancelled) return;

      if (!res.ok) {
        setMsg(data?.error || "No pude verificar la suscripción.");
        return;
      }

      // Si tu processor marca premium, esto ya desbloquea en el siguiente refresh.
      setMsg("¡Listo! Ya sos Premium ✅ Recargando...");
      setTimeout(() => window.location.replace("/home"), 700);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [subscription, preapprovalId]);

  if (!msg) return null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      {msg}
    </div>
  );
}
