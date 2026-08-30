"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_ESTIMATION_MODE } from "../../lib/app-data";

const LS_GENERAL = "miadmi:estimacion_general";
const LS_ESPECIFICA = "miadmi:estimacion_especifica";
const LS_ESTIMABLES = "miadmi:egresos_estimables";
const MODE_KEY = "miadmi:estimacion_mode";
const emptyEstimables = { prestamos: [], tarjetas: [], compras: [] };

function readJson(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function useHomeData() {
  const pathname = usePathname();
  const [general, setGeneral] = useState(null);
  const [especifica, setEspecifica] = useState(null);
  const [estimables, setEstimables] = useState(emptyEstimables);
  const [activeMode, setActiveMode] = useState(DEFAULT_ESTIMATION_MODE);

  const readAll = useCallback(() => {
    if (typeof window === "undefined") return;
    setGeneral(readJson(LS_GENERAL));
    setEspecifica(readJson(LS_ESPECIFICA));
    setEstimables(readJson(LS_ESTIMABLES, emptyEstimables));
    const mode = window.localStorage.getItem(MODE_KEY);
    setActiveMode(mode === "especifica" ? "especifica" : DEFAULT_ESTIMATION_MODE);
  }, []);

  useEffect(() => {
    readAll();
    const onVisibility = () => document.visibilityState === "visible" && readAll();
    window.addEventListener("focus", readAll);
    window.addEventListener("miadmi:data-updated", readAll);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", readAll);
      window.removeEventListener("miadmi:data-updated", readAll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [readAll, pathname]);

  return { general, especifica, estimables, activeMode };
}
