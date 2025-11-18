"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PremiumBadge from "./PremiumBadge";
import { useSessionInfo } from "./SessionProvider";
import { supabaseBrowser } from "../lib/supabaseBrowser";

export default function Header() {
  const router = useRouter();
  const { user, loading, plan, premiumUntil, refresh } = useSessionInfo();

  const isPremium =
    plan === "premium" &&
    (!premiumUntil || new Date(premiumUntil).getTime() > Date.now());

  async function handleSignOut() {
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      await fetch("/api/signout", { method: "POST" });
      await refresh();
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed", err);
    }
  }

  return (
    <header className="mb-4">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Mi Admi"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            priority
          />
          <h1 className="text-lg font-semibold">Mi Admi</h1>
        </div>

        <div className="flex items-center gap-4">
          <PremiumBadge />
          {!loading && user && !isPremium ? (
            <Link
              href="/paywall"
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-emerald-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80"
            >
              Mejorar a Premium
            </Link>
          ) : null}
          {!loading && !user ? (
            <Link
              href="/login"
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium hover:bg-white/15"
            >
              Iniciar sesion
            </Link>
          ) : null}
          {!loading && user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium hover:bg-white/15"
            >
              Cerrar sesion
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
