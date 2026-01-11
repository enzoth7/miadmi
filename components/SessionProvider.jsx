"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabaseBrowser } from "../lib/supabaseBrowser";

const SessionContext = createContext({
  user: null,
  plan: "free",
  premiumUntil: null,
  loading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }) {
  const supabase = supabaseBrowser();

  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState("free");
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionAndPlan = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);

   if (u) {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan,premium_until")
    .eq("id", u.id)
    .single();

  if (!error && data) {
    const until = data.premium_until ? new Date(data.premium_until) : null;
    const stillPremium =
      data.plan === "premium" &&
      until &&
      until.getTime() > Date.now();

    setPlan(stillPremium ? "premium" : "free");
    setPremiumUntil(data.premium_until ?? null);
  } else {
    setPlan("free");
    setPremiumUntil(null);
  }
} else {
  setPlan("free");
  setPremiumUntil(null);
}

    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const refreshOnReturn = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        await supabase.auth.refreshSession();
      }
    } catch {
      // noop
    } finally {
      fetchSessionAndPlan();
    }
  }, [supabase, fetchSessionAndPlan]);

const ensureProfile = useCallback(async () => {
  try {
    const res = await fetch("/api/profile/ensure", { method: "POST" });
    await res.text().catch(() => {});
  } catch {
    // noop
  }
}, []);





  useEffect(() => {
    fetchSessionAndPlan();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") {
        await ensureProfile();
      }
      fetchSessionAndPlan();
    });


    // ✅ mobile: cuando volvés a la app, refrescá tokens
    const onFocus = () => refreshOnReturn();
    const onVis = () => {
      if (!document.hidden) refreshOnReturn();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      sub?.subscription?.unsubscribe?.();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [supabase, fetchSessionAndPlan, refreshOnReturn, ensureProfile]);

  const value = useMemo(
    () => ({
      user,
      plan,
      premiumUntil,
      loading,
      refresh: fetchSessionAndPlan,
    }),
    [user, plan, premiumUntil, loading, fetchSessionAndPlan]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionInfo() {
  return useContext(SessionContext);
}
