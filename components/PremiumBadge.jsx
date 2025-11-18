"use client";

import { useSessionInfo } from "./SessionProvider";

export default function PremiumBadge() {
  const { loading, plan, premiumUntil } = useSessionInfo();

  if (loading) {
    return (
      <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs">
        Cargando…
      </span>
    );
  }

  const isPremium =
    plan === "premium" &&
    (!premiumUntil || new Date(premiumUntil).getTime() > Date.now());

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
        isPremium ? "bg-emerald-500/20 text-emerald-100" : "bg-white/15 text-white",
      ].join(" ")}
      title={
        isPremium
          ? premiumUntil
            ? `Premium hasta ${new Date(premiumUntil).toLocaleDateString()}`
            : "Premium activo"
          : "Plan Free"
      }
    >
      {isPremium ? "Premium" : "Free"}
    </span>
  );
}
