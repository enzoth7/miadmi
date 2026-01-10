"use client";

import { useSessionInfo } from "./SessionProvider";

export default function PremiumBadge() {
  const { loading, plan, premiumUntil } = useSessionInfo();

  if (loading) {
    return (
      <span className="inline-flex h-8 items-center rounded-full bg-white/20 px-4 text-sm font-semibold">
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
        "inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold",
        isPremium
          ? "rounded-full bg-emerald-400 px-4 py-1 text-sm font-semibold text-gray-900 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300"
          : "border border-white/10 bg-white/5 text-white",
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
