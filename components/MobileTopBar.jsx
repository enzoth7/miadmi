"use client";

import BrandLogo from "./BrandLogo";
import { useSessionInfo } from "./SessionProvider";

export default function MobileTopBar() {
  const { user, loading, plan, premiumUntil } = useSessionInfo();

  if (!user) return null;

  const isPremium =
    plan === "premium" &&
    (!premiumUntil || new Date(premiumUntil).getTime() > Date.now());

  const badgeClass = isPremium
    ? "rounded-full bg-emerald-400 px-4 py-1 text-sm font-semibold text-gray-900 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300"
    : "border border-white/10 bg-white/5 text-white";

  return (
    <div className="md:hidden px-4 pt-1">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3">
        <BrandLogo className="h-23" />
        {!loading ? (
          <span
            className={[
              "rounded-full border px-3 py-1 text-base font-semibold",
              badgeClass,
            ].join(" ")}
          >
            {isPremium ? "Premium" : "Free"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
