"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_ESTIMATION_MODE,
  fetchEstimationMode,
  fetchEstimacionEspecifica,
  fetchEstimacionGeneral,
  getSupabaseSession,
} from "../../lib/app-data";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

const emptyEstimables = { prestamos: [], tarjetas: [], compras: [] };

export function useHomeData(externalSupabase) {
  const pathname = usePathname();
  const supabase = useMemo(
    () => externalSupabase ?? supabaseBrowser(),
    [externalSupabase]
  );

  const [general, setGeneral] = useState(null);
  const [especifica, setEspecifica] = useState(null);
  const [estimables, setEstimables] = useState(emptyEstimables);
  const [activeMode, setActiveMode] = useState(DEFAULT_ESTIMATION_MODE);

  const readAll = useCallback(async () => {
    try {
      const { userId } = await getSupabaseSession();

      if (!userId) {
        setGeneral(null);
        setEspecifica(null);
        setEstimables(emptyEstimables);
        setActiveMode(DEFAULT_ESTIMATION_MODE);
        return;
      }

      const [g, e, mode] = await Promise.all([
        fetchEstimacionGeneral(supabase, userId),
        fetchEstimacionEspecifica(supabase, userId),
        fetchEstimationMode(supabase, userId),
      ]);


      const resolvedMode =
        mode === "especifica" || mode === "general" ? mode : DEFAULT_ESTIMATION_MODE;

      setGeneral(g ?? null);
      setEspecifica(e ?? null);
      setEstimables(emptyEstimables);
      setActiveMode(resolvedMode);
    } catch (error) {
      console.error("[HOME] fetch failed", error);
      setGeneral(null);
      setEspecifica(null);
      setEstimables(emptyEstimables);
      setActiveMode(DEFAULT_ESTIMATION_MODE);
    }
  }, [supabase]);

  const handleRefresh = useCallback(() => {
    void readAll();
  }, [readAll]);

  const handleVisibility = useCallback(() => {
    if (document.visibilityState === "visible") {
      handleRefresh();
    }
  }, [handleRefresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    handleRefresh();

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("miadmi:data-updated", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("miadmi:data-updated", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [handleRefresh, handleVisibility, pathname]);

  return { general, especifica, estimables, activeMode };
}
