"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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

  async function fetchSessionAndPlan() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);

      if (u) {
        // Leemos el plan del perfil del usuario
        const { data, error } = await supabase
          .from("profiles")
          .select("plan,premium_until")
          .eq("id", u.id)
          .single();

        if (!error && data) {
          setPlan(data.plan || "free");
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
  }

  useEffect(() => {
    fetchSessionAndPlan();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, _session) => {
      // Cuando cambie la sesión (login/logout), re-cargamos
      fetchSessionAndPlan();
    });
    return () => {
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      user,
      plan,
      premiumUntil,
      loading,
      refresh: fetchSessionAndPlan,
    }),
    [user, plan, premiumUntil, loading]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionInfo() {
  return useContext(SessionContext);
}
