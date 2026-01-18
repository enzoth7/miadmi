"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { LS_CUSTOM_CATEGORIES } from "../estimacion/especifica/constants";
import { getSupabaseSession } from "../../lib/app-data";




const LS_GEN = "miadmi:estimacion_general";
const LS_ESP = "miadmi:estimacion_especifica";
const LS_ESTIMABLES = "miadmi:egresos_estimables";
const MODE_KEY = "miadmi:estimacion_mode";
const TOUR_STEPS = [
  {
    id: 1,
    target: "#home-balance-card",
    title: "Tu resumen del mes",
    body: "Acá ves tus ingresos, gastos y si el mes cierra positivo o negativo.",
  },
  {
    id: 2,
    target: "#home-categories-chart",
    title: "En qué se te va la plata",
    body: "Este gráfico te muestra cuánto gastás por categoría.",
  },
  {
    id: 3,
    target: "#home-actions",
    title: "Los consejos",
    body: "Acá verás sugerencias generadas por nuestra IA. No reemplazan asesoramiento financiero, pero te pueden servir como guía para organizarte mejor",
  },
];

const incomePalette = ["#064e3b", "#047857", "#0f766e", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];
const expensePalette = ["#991b1b", "#dc2626", "#ef4444", "#f97316", "#fb923c", "#facc15", "#fde047", "#a855f7", "#7c3aed", "#2563eb", "#38bdf8"];

const SPECIFIC_INCOME_LABELS = {
  sueldos: "Sueldos / Ingresos",
  extraordinarios: "Ingresos extraordinarios",
  devolucion: "Devolución de impuestos",
  prestamosingresos: "Préstamos",
  familia: "Familia",
  otros: "Otros",
};

const SPECIFIC_EXPENSE_LABELS = {
  super: "Super",
  alquiler: "Alquiler / Hipoteca",
  gastosfijos: "Gastos fijos",
  gym: "Gym",
  otrasactividades: "Otras actividades",
  salud: "Salud y estética",
  transporte: "Transporte / Combustible",
  generales: "Gastos generales",
  ropa: "Ropa",
  entretenimiento: "Entretenimiento y salidas",
  viajes: "Viajes",
  educacion: "Educación",
  adquisiciones: "Adquisiciones (compras grandes)",
  reparaciones: "Reparaciones de vehículo",
  prestamos: "Préstamos",
  tarjetas: "Tarjetas",
};

const n = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

const fmtUYU = (v, maxFrac = 0) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: maxFrac,
  }).format(v || 0);

function sumArrayMonto(arr) {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((a, it) => a + n(it?.monto), 0);
}

function flattenNumericObject(obj, dictionary, kindLabel) {
  if (!obj || typeof obj !== "object") return [];
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const val = n(v);
    if (val > 0) {
      out.push({
        name: resolveCategoryLabel(k, dictionary),
        value: val,
        kind: kindLabel,
      });
    }
  }
  return out;
}

function titleCase(s) {
  try {
    return String(s)
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase());
  } catch {
    return String(s || "");
  }
}

function stripAccents(s) {
  try {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  } catch {
    return String(s || "").toLowerCase();
  }
}

function normalizeKey(value) {
  return stripAccents(String(value || "")).replace(/[^a-z0-9]/g, "");
}

function resolveCategoryLabel(raw, dictionary) {
  if (dictionary) {
    const normalized = normalizeKey(raw);
    if (dictionary[normalized]) return dictionary[normalized];
  }
  if (typeof raw === "string" && raw.trim()) {
    return titleCase(raw);
  }
  return "Sin nombre";
}

function resolveFromDictionary(value, dictionary) {
  if (!value) return null;

  const raw = String(value).trim();
  const normalized = normalizeKey(raw);

  return (
    dictionary?.[raw] ||
    dictionary?.[raw.toLowerCase()] ||
    dictionary?.[normalized] ||
    null
  );
}







const createEmptyCategoryDictionary = () => ({ ingresos: {}, egresos: {} });

const buildCustomCategoryMap = (entries) => {
  const map = {};
  if (!Array.isArray(entries)) return map;

  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;

    const label = String(entry?.label ?? entry?.nombre ?? "").trim();
    if (!label) return;

    const source = String(entry?.id ?? label).trim() || label;

    const rawKey = source;
    const lowerKey = source.toLowerCase();
    const normalizedKey = normalizeKey(source);

    map[rawKey] = label;
    map[lowerKey] = label;
    if (normalizedKey) map[normalizedKey] = label;
  });

  return map;
};


const normalizeCustomCategoryPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return createEmptyCategoryDictionary();
  }
  return {
    ingresos: buildCustomCategoryMap(payload.ingresos),
    egresos: buildCustomCategoryMap(payload.egresos),
  };
};

const readCustomCategoriesFromStorage = () => {
  if (typeof window === "undefined") {
    return createEmptyCategoryDictionary();
  }
  try {
    const raw = window.localStorage.getItem(LS_CUSTOM_CATEGORIES);
    if (!raw) return createEmptyCategoryDictionary();
    const parsed = JSON.parse(raw);
    return normalizeCustomCategoryPayload(parsed);
  } catch {
    return createEmptyCategoryDictionary();
  }
};

const shallowEqualMap = (a = {}, b = {}) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => b[key] === a[key]);
};

const areCustomDictionariesEqual = (a, b) =>
  shallowEqualMap(a?.ingresos ?? {}, b?.ingresos ?? {}) &&
  shallowEqualMap(a?.egresos ?? {}, b?.egresos ?? {});

export default function HomeClient() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = supabaseBrowser();
  const verifyRef = useRef(false);

  const [general, setGeneral] = useState(null);
  const [especifica, setEspecifica] = useState(null);
  const [activeMode, setActiveMode] = useState("general");
  const [estimables, setEstimables] = useState({ prestamos: [], tarjetas: [], compras: [] });
  const [customCategoryLabels, setCustomCategoryLabels] = useState(() => createEmptyCategoryDictionary());
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const activeStep = showTour ? TOUR_STEPS.find((step) => step.id === currentStep) : null;
  const activeTarget = activeStep?.target ?? null;
  const highlightBalance = activeTarget === "#home-balance-card";
  const highlightCategories = activeTarget === "#home-categories-chart";
  const highlightActions = activeTarget === "#home-actions";
  useEffect(() => {
    if (!showTour || !activeTarget) return;
    const el = document.querySelector(activeTarget);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showTour, activeTarget]);

  const syncCustomCategoryLabels = useCallback(() => {
    const next = readCustomCategoriesFromStorage();
    setCustomCategoryLabels((prev) => (areCustomDictionariesEqual(prev, next) ? prev : next));
  }, []);

  const incomeLabelDictionary = useMemo(
    () => ({ ...SPECIFIC_INCOME_LABELS, ...customCategoryLabels.ingresos }),
    [customCategoryLabels.ingresos]
  );
  const expenseLabelDictionary = useMemo(
    () => ({ ...SPECIFIC_EXPENSE_LABELS, ...customCategoryLabels.egresos }),
    [customCategoryLabels.egresos]
  );

const [userId, setUserId] = useState(null);

useEffect(() => {
  let active = true;
  (async () => {
    try {
      const ctx = await getSupabaseSession();
      if (!active) return;
      setUserId(ctx?.userId ?? null);
    } catch {
      setUserId(null);
    }
  })();
  return () => {
    active = false;
  };
}, []);



const readAll = useCallback(() => {
  if (!userId) {
    setGeneral(null);
    setEspecifica(null);
    setEstimables({ prestamos: [], tarjetas: [], compras: [] });
    return;
  }

  try {
    const rawG = localStorage.getItem(`miadmi:${userId}:estimacion_general`);
    setGeneral(rawG ? JSON.parse(rawG) : null);
  } catch {
    setGeneral(null);
  }

  try {
    const rawE = localStorage.getItem(`miadmi:${userId}:estimacion_especifica`);
    setEspecifica(rawE ? JSON.parse(rawE) : null);
  } catch {
    setEspecifica(null);
  }

try {
  const storedMode = localStorage.getItem(MODE_KEY);
  if (storedMode === "especifica" || storedMode === "general") {
    setActiveMode(storedMode);
  } else if (especifica) {
    setActiveMode("especifica");
  } else {
    setActiveMode("general");
  }
} catch {}


  try {
    const rawEE = localStorage.getItem(`miadmi:${userId}:egresos_estimables`);
    if (rawEE) {
      const s = JSON.parse(rawEE);
      setEstimables({
        prestamos: Array.isArray(s?.prestamos) ? s.prestamos : [],
        tarjetas: Array.isArray(s?.tarjetas) ? s.tarjetas : [],
        compras: Array.isArray(s?.compras) ? s.compras : [],
      });
    } else {
      setEstimables({ prestamos: [], tarjetas: [], compras: [] });
    }
  } catch {
    setEstimables({ prestamos: [], tarjetas: [], compras: [] });
  }

  syncCustomCategoryLabels();
}, [syncCustomCategoryLabels, userId]);







  useEffect(() => {
    const key = "miadmi:onboarding-tour";
    try {
      const stored = localStorage.getItem(key);
      if (stored === "pending") {
        setShowTour(true);
        setCurrentStep(1);
        localStorage.setItem(key, "done");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (verifyRef.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const subscriptionFlag = params.get("subscription");
    const preapprovalId = params.get("preapproval_id");

    if (subscriptionFlag !== "1" || !preapprovalId) return;
    verifyRef.current = true;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        await fetch("/api/mp/verify-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ preapproval_id: preapprovalId }),
        });
      } catch (err) {
        console.error("Failed to verify subscription", err);
      } finally {
        params.delete("subscription");
        params.delete("preapproval_id");
        const nextParams = params.toString();
        const nextUrl = nextParams ? `/home?${nextParams}` : "/home";
        router.replace(nextUrl);
      }
    })();
  }, [router, supabase]);


  useEffect(() => {
  if (typeof window === "undefined") return;

  // ✅ primera carga al entrar a Home
  readAll();

  const onVisibility = () => {
    if (document.visibilityState === "visible") readAll();
  };

  window.addEventListener("focus", readAll);
  window.addEventListener("miadmi:data-updated", readAll);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.removeEventListener("focus", readAll);
    window.removeEventListener("miadmi:data-updated", readAll);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}, [readAll, pathname, activeMode]);


  const ingresosGen = n(general?.sueldos) + n(general?.otrosIngresos);

  const egresosGen = useMemo(() => {
    const arr = Array.isArray(general?.egresos) ? general.egresos : [];
    return arr.reduce((acc, e) => acc + n(e?.monto), 0);
  }, [general]);

  const ingresosEsp = useMemo(() => {
    if (!especifica) return 0;
    if (Array.isArray(especifica.ingresos)) return sumArrayMonto(especifica.ingresos);
    if (especifica.ingresos && typeof especifica.ingresos === "object") {
      return flattenNumericObject(especifica.ingresos).reduce((a, it) => a + it.value, 0);
    }
    return 0;
  }, [especifica]);

  const egresosEsp = useMemo(() => {
    if (!especifica) return 0;
    if (Array.isArray(especifica.egresos)) return sumArrayMonto(especifica.egresos);
    if (especifica.egresos && typeof especifica.egresos === "object") {
      return flattenNumericObject(especifica.egresos).reduce((a, it) => a + it.value, 0);
    }
    return 0;
  }, [especifica]);

const includeGeneral = activeMode === "general";
const activeModeLabel = includeGeneral ? "Simple" : "Avanzado";
const ingresosTotales = includeGeneral
  ? ingresosGen + saldoInicial
  : ingresosEsp + saldoInicial;
const egresosTotales = includeGeneral ? egresosGen : egresosEsp;
const ahorroDeseado = includeGeneral
  ? n(general?.ahorroDeseado)
  : n(especifica?.ahorroMensual ?? especifica?.ahorroDeseado);
const saldoInicial = includeGeneral ? n(general?.saldoInicial) : n(especifica?.saldoInicial);
const resultado = ingresosTotales - egresosTotales;
const capacidadMensual = resultado - ahorroDeseado;
const saldoProyectado = saldoInicial + resultado;
const gastoSobreIngreso = ingresosTotales > 0 ? Math.round((egresosTotales / ingresosTotales) * 100) : null;
const totalPrestamos = estimables.prestamos.reduce((acc, it) => acc + n(it?.montoCuota), 0);
const totalTarjetas = estimables.tarjetas.reduce((acc, it) => acc + n(it?.montoCuota), 0);
const totalCompras = estimables.compras.reduce((acc, it) => acc + n(it?.valor), 0);
const totalEstimables = totalPrestamos + totalTarjetas + totalCompras;

  const graficoEgresos = useMemo(() => {
    if (includeGeneral) {
      const base = Array.isArray(general?.egresos) ? general.egresos : [];
      return base
        .filter((it) => n(it?.monto) > 0)
        .map((it) => ({
          name:
            resolveFromDictionary(it?.nombre, expenseLabelDictionary) ||
            resolveFromDictionary(it?.categoria, expenseLabelDictionary) ||
            resolveFromDictionary(it?.id, expenseLabelDictionary) ||
            String(it?.nombre || it?.categoria || "Sin nombre"),
          value: n(it?.monto),
        }));
    }
    if (!especifica) return [];
    if (Array.isArray(especifica.egresos)) {
      return especifica.egresos
        .filter((it) => n(it?.monto) > 0)
        .map((it) => ({
          name:
            resolveFromDictionary(it?.id, expenseLabelDictionary) ||
            resolveFromDictionary(it?.categoria, expenseLabelDictionary) ||
            resolveFromDictionary(it?.nombre, expenseLabelDictionary) ||
            String(it?.nombre || it?.categoria || "Sin nombre"),
          value: n(it?.monto),
        }));
    }
    if (especifica.egresos && typeof especifica.egresos === "object") {
      return flattenNumericObject(especifica.egresos, expenseLabelDictionary, "especifica");
    }
    return [];
  }, [general, especifica, includeGeneral, expenseLabelDictionary]);

  const graficoIngresos = useMemo(() => {
    if (includeGeneral) {
      const base = [];
      if (n(general?.sueldos) > 0)
        base.push({ name: "Sueldos / Honorarios", value: n(general?.sueldos) });
      if (n(general?.otrosIngresos) > 0)
        base.push({ name: "Otros ingresos", value: n(general?.otrosIngresos) });
      return base;
    }
    if (!especifica) return [];
    if (Array.isArray(especifica.ingresos)) {
      return especifica.ingresos
        .filter((it) => n(it?.monto) > 0)
        .map((it) => ({
          name:
            resolveFromDictionary(it?.id, incomeLabelDictionary) ||
            resolveFromDictionary(it?.categoria, incomeLabelDictionary) ||
            resolveFromDictionary(it?.nombre, incomeLabelDictionary) ||
            String(it?.nombre || it?.categoria || "Sin nombre"),
          value: n(it?.monto),
        }));
    }
    if (especifica.ingresos && typeof especifica.ingresos === "object") {
      return flattenNumericObject(especifica.ingresos, incomeLabelDictionary, "especifica");
    }
    return [];
  }, [general, especifica, includeGeneral, incomeLabelDictionary]);

  const consejos = useMemo(() => {
    const ctx = {
      ingresosTotales,
      egresosTotales,
      resultado,
      ahorroDeseado,
      capacidadMensual,
      saldoInicial,
      saldoProyectado,
      includeGeneral,
      tieneGeneral: Boolean(general),
      tieneEspecifica: Boolean(especifica),
      graficoIngresos,
      graficoEgresos,
      totalPrestamos,
      totalTarjetas,
      totalCompras,
      totalEstimables,
      ingresosGen,
      ingresosEsp,
      egresosGen,
      egresosEsp,
      activeModeLabel,
    };

    const tipCatalog = [
      // Faltan datos básicos
      { check: (c) => c.ingresosTotales === 0 && c.egresosTotales === 0, message: "Cargá tus ingresos y egresos para ver recomendaciones personalizadas." },
      { check: (c) => c.ingresosTotales > 0 && c.egresosTotales === 0, message: "Agregá tus egresos recurrentes para medir el impacto real de tus ingresos." },
      { check: (c) => c.ingresosTotales === 0 && c.egresosTotales > 0, message: "Registrá tus ingresos para entender cuánto podés cubrir de los gastos actuales." },

      // Situaciones críticas de flujo del mes
      { check: (c) => c.resultado < 0, message: "Tus egresos superan a tus ingresos. Podés revisar rubros variables y, si hace falta, renegociar algunos gastos fijos." },
      { check: (c) => c.saldoProyectado < 0, message: "Con la proyección actual podrías cerrar el mes en negativo. Revisá ingresos, gastos y ahorro deseado para corregirlo a tiempo." },
      { check: (c) => c.ingresosTotales > 0 && c.egresosTotales >= c.ingresosTotales * 0.9, message: "Tus gastos consumen más del 90% del ingreso. Bajar algunos rubros variables puede darte un poco más de margen." },

      // Deudas y compras grandes
      { check: (c) => c.totalPrestamos > c.ingresosTotales * 0.3, message: "Las cuotas de préstamos superan el 30% del ingreso. Si sentís presión, podés evaluar alternativas para reorganizar esas deudas." },
      { check: (c) => c.totalTarjetas > c.ingresosTotales * 0.3, message: "Las tarjetas y suscripciones consumen una parte importante del ingreso. Revisá qué servicios usás realmente y cuáles podrías pausar." },
      { check: (c) => c.totalCompras > c.ingresosTotales * 0.5, message: "Las compras planificadas pesan casi la mitad del ingreso. Podés repartirlas en varios meses para que el impacto sea menor." },
      { check: (c) => c.ingresosTotales > 0 && c.totalTarjetas > 0 && c.capacidadMensual <= 0, message: "Las tarjetas están reduciendo tu margen mensual. Revisá cuotas, montos y fechas para recuperar algo de aire." },
      { check: (c) => c.capacidadMensual < 0 && c.totalPrestamos === 0 && c.totalTarjetas === 0, message: "El rojo proviene principalmente de gastos corrientes. Mirá tus consumos diarios para encontrar recortes posibles." },

      // Margen, ahorro y saldo
      { check: (c) => c.capacidadMensual > 0 && c.capacidadMensual <= c.ingresosTotales * 0.05, message: "Tu margen es menor al 5% del ingreso. Aumentar ingresos o bajar algunos gastos puede darte más respiro." },
      { check: (c) => c.capacidadMensual > c.ingresosTotales * 0.4, message: "Podés guardar parte del margen mensual para objetivos de mediano plazo o, si lo ves conveniente, para futuras inversiones." },
      { check: (c) => c.ahorroDeseado > c.ingresosTotales * 0.5 && c.ingresosTotales > 0, message: "El objetivo de ahorro supera la mitad de tu ingreso mensual. Revisá si es realista para tu situación actual." },
      { check: (c) => c.ahorroDeseado === 0 && c.ingresosTotales > 0, message: "Definí un objetivo de ahorro mensual para aprovechar mejor tus ingresos." },
      { check: (c) => c.capacidadMensual < 0 && c.ahorroDeseado > 0, message: "Si querés evitar terminar en rojo, podés ajustar el ahorro deseado o recortar algunos gastos por este mes." },
      { check: (c) => c.saldoInicial < 0 && c.resultado > 0, message: "Buen dato: generás superávit y podrías ir saliendo del saldo negativo inicial si mantenés la tendencia." },
      { check: (c) => c.saldoInicial > 0 && c.resultado < 0, message: "El saldo inicial ayuda a cubrir el rojo de este mes. Mirá si podés hacer ajustes para no depender siempre de ese colchón." },
      { check: (c) => c.ingresosTotales > 0 && c.egresosTotales <= c.ingresosTotales * 0.5, message: "Gastás menos de la mitad de lo que ganás. Podés destinar una parte a ahorro, objetivos o inversiones futuras." },
      { check: (c) => c.resultado === 0 && c.ingresosTotales > 0, message: "Estás en punto de equilibrio exacto. Un ajuste pequeño puede definir si el mes termina en superávit o déficit." },
      { check: (c) => c.capacidadMensual > 0 && c.saldoProyectado > c.saldoInicial, message: "Tu saldo final crece este mes. Seguilo de cerca para mantener la tendencia." },
      { check: (c) => c.capacidadMensual > 0 && c.totalPrestamos === 0 && c.totalTarjetas === 0, message: "No tenés deudas registradas. Podrías aprovechar el margen para armar un fondo de emergencia." },
      { check: (c) => c.totalCompras > 0 && c.capacidadMensual > 0, message: "Reservá parte del margen para cubrir las compras planificadas sin endeudarte." },

      // Estructura de ingresos y egresos
      { check: (c) => c.graficoIngresos.length >= 6, message: "Tenés varias fuentes de ingreso. Mantenelas actualizadas para medir su peso real." },
      { check: (c) => c.graficoIngresos.length === 1 && c.ingresosTotales > 0, message: "Dependés de una sola fuente de ingreso. A futuro podrías evaluar sumar otra para tener más estabilidad." },
      { check: (c) => c.graficoEgresos.length >= 8, message: "Tus egresos están muy atomizados. Etiquetar bien las categorías ayuda a detectar los gastos que podés reducir." },
      { check: (c) => c.graficoEgresos.length <= 2 && c.egresosTotales > 0, message: "La mayoría de tus gastos está concentrada en pocos rubros. Un ajuste puntual puede lograr mucho." },

      // Consistencia entre modos y estimaciones
      { check: (c) => !c.includeGeneral && c.totalEstimables === 0, message: "Activaste la estimación específica pero no cargaste préstamos ni compras estimables." },
      { check: (c) => c.includeGeneral && c.tieneEspecifica, message: "Ya tenés datos específicos. Si querés usarlos en Home, activá ese modo desde las estimaciones." },
      { check: (c) => !c.includeGeneral && c.tieneGeneral, message: "Recordá revisar la estimación general aunque hoy estés usando la específica." },
      { check: (c) => c.ingresosGen > 0 && c.ingresosEsp > 0, message: "Tanto la estimación general como la específica tienen ingresos. Mantenelas consistentes para evitar confusiones." },
      { check: (c) => c.egresosGen > 0 && c.egresosEsp === 0 && !c.includeGeneral, message: "No hay egresos en la estimación específica. Migrá tus datos antes de usar este modo como referencia principal." },
      { check: (c) => c.egresosEsp > 0 && c.egresosGen === 0 && c.includeGeneral, message: "Solo cargaste egresos en la estimación específica. Activala para ver resultados más cercanos a tu realidad." },

      // Casos de datos incompletos mezclados
      { check: (c) => c.ingresosTotales > 0 && c.totalCompras > 0 && c.egresosTotales === 0, message: "Anotá tus egresos recurrentes para estimar cómo impactan esas compras próximas." },
    ];

    const tips = [];
    tipCatalog.forEach((tip) => {
      try {
        if (tip.check(ctx)) tips.push(tip.message);
      } catch {
        // ignore faulty rule
      }
    });

    if (tips.length === 0) {
      tips.push("Todo en orden. Seguí registrando tus movimientos para mantener el control. Estas sugerencias son solo orientativas.");
    }

    return tips.slice(0, 5);
  }, [
    ingresosTotales,
    egresosTotales,
    resultado,
    ahorroDeseado,
    capacidadMensual,
    saldoInicial,
    saldoProyectado,
    includeGeneral,
    general,
    especifica,
    graficoIngresos,
    graficoEgresos,
    totalPrestamos,
    totalTarjetas,
    totalCompras,
    totalEstimables,
    ingresosGen,
    ingresosEsp,
    egresosGen,
    egresosEsp,
    activeModeLabel,
  ]);

const resumenCards = [
  {
    label: "Resultado del mes",
    value: fmtUYU(resultado),
    icon: resultado >= 0 ? TrendingUp : TrendingDown,
    tone: resultado >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
    cardClass: resultado >= 0 ? "border-emerald-200 bg-emerald-100" : "border-rose-200 bg-rose-100",
    description: resultado >= 0 ? "Superávit" : "Déficit",
  },
  {
    label: "Ingresos totales",
    value: fmtUYU(ingresosTotales),
    icon: TrendingUp,
    tone: "text-emerald-700 bg-emerald-100",
    cardClass: "border-emerald-200 bg-emerald-100",
    description: activeModeLabel,
  },
  {
    label: "Egresos totales",
    value: fmtUYU(egresosTotales),
    icon: TrendingDown,
    tone: "text-rose-700 bg-rose-100",
    cardClass: "border-rose-200 bg-rose-100",
    description:
      gastoSobreIngreso != null
        ? `${gastoSobreIngreso}% del ingreso activo`
        : "Sin ingresos declarados",
  },
  {
    label: "Capacidad mensual",
    value: fmtUYU(capacidadMensual),
    icon: resultado >= 0 ? TrendingUp : TrendingDown,
    tone: resultado >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
    cardClass: resultado >= 0 ? "border-emerald-200 bg-emerald-100" : "border-rose-200 bg-rose-100",
    description:
      capacidadMensual >= 0
        ? "Margen después del ahorro"
        : "Revisá tus objetivos",
  },
];


  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            {format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-white">Hola de nuevo</h2>
          <p className="text-sm text-white/80">
            Consolidá tus ingresos y egresos para ver cómo evoluciona tu economía personal.
          </p>
        </div>
     <div className="flex items-center gap-3 md:justify-end">
  <span className="text-xs uppercase tracking-wide text-white/70">Modo activo</span>
          <span
  className={[
    "rounded-full border px-3 py-1 text-sm font-semibold",
    includeGeneral
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
      : "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  ].join(" ")}
>
  {activeModeLabel}
</span>

        </div>
      </header>

  <section
    id="home-balance-card"
    className={[
      highlightBalance
        ? "relative z-40 rounded-3xl bg-slate-900/90 ring-4 ring-emerald-300/80 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-emerald-500/40 p-3 md:p-4"
        : "p-0",
    ].join(" ")}
  >
    <div className="mx-auto w-full max-w-7xl">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
        {resumenCards.map((card) => (
          <article
            key={card.label}
            className={`rounded-2xl border p-4 md:p-5 shadow-sm flex flex-col gap-2 md:gap-3 ${card.cardClass}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm md:text-lg font-medium text-slate-900">
                {card.label}
              </span>
              <span
                className={`flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full ${card.tone}`}
              >
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            <div className="text-xl md:text-2xl font-semibold text-slate-900">
              {card.value}
            </div>
            <p className="text-xs md:text-sm text-slate-600">{card.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>






      <section className="grid gap-4 lg:grid-cols-2">
        <article
          id="home-categories-chart"
          className={[
            "rounded-2xl border border-slate-100 bg-emerald-100 p-6 text-slate-900 shadow-sm",
            highlightCategories
              ? "relative z-40 rounded-3xl bg-slate-900/90 ring-4 ring-emerald-300/80 ring-offset-2 ring-offset-white shadow-xl shadow-emerald-500/40"
              : "",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold">Distribución de ingresos</h3>
            <span className="text-sm text-emerald-700">
              {graficoIngresos.length ? `${graficoIngresos.length} categorías` : "Sin datos"}
            </span>
          </div>
          <div className="h-[26rem]">
            {graficoIngresos.length ? (
              <ResponsiveContainer>
                <PieChart margin={{ top: 8, bottom: 32 }}>
                  <Pie
                    data={graficoIngresos}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                  >
                    {graficoIngresos.map((entry, index) => (
                      <Cell key={entry.name} fill={incomePalette[index % incomePalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [fmtUYU(value), name]}
                    contentStyle={{ borderRadius: 12, borderColor: "#d1fae5" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    height={32}
                    wrapperStyle={{ color: "#065f46", fontSize: 15 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 text-sm text-emerald-700">
                Registrá al menos un ingreso para ver la distribución.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-rose-100 p-6 text-slate-900 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-slate-900">Distribución de egresos</h3>
            <span className="text-sm text-rose-700">
              {graficoEgresos.length ? `${graficoEgresos.length} categorías` : "Sin datos"}
            </span>
          </div>
          <div className="h-[26rem]">
            {graficoEgresos.length ? (
              <ResponsiveContainer>
                <PieChart margin={{ top: 8, bottom: 10 }}>
                  <Pie
                    data={graficoEgresos}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                  >
                    {graficoEgresos.map((entry, index) => (
                      <Cell key={entry.name} fill={expensePalette[index % expensePalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [fmtUYU(value), name]}
                    contentStyle={{ borderRadius: 12, borderColor: "#fecdd3" }}
                  />
                  <Legend
  verticalAlign="bottom"
  align="center"
  iconType="circle"
  wrapperStyle={{
    color: "#7f1d1d",
    fontSize: 15,
    width: "100%",
    whiteSpace: "normal",
    lineHeight: "1.1",
  }}
/>

                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-rose-200 text-sm text-rose-700">
                Registrá egresos para identificar los rubros más pesados.
              </div>
            )}
          </div>
        </article>
      </section>

<section
  id="home-actions"
  className={[
    "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm",
    highlightActions
      ? "relative z-40 ring-4 ring-emerald-300/80 ring-offset-2 ring-offset-white shadow-xl shadow-emerald-500/40"
      : "",
  ].join(" ")}
>
  <div className="flex items-center gap-2 mb-4">
    <Lightbulb className="h-5 w-5 text-amber-500" />
    <h3 className="text-lg font-semibold text-slate-900">Consejos personalizados</h3>
  </div>

  {consejos.length === 0 ? (
    <p className="text-sm text-slate-600">
      Cargá tus datos básicos para recibir sugerencias puntuales.
    </p>
  ) : (
    <>
      <p className="mb-2 text-xs text-slate-500">
        Estas sugerencias se basan solo en los datos que cargaste este mes y no reemplazan asesoramiento financiero profesional.
      </p>
      <ul className="space-y-2 text-sm text-slate-700">
        {consejos.map((tip, idx) => (
          <li key={idx} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            {tip}
          </li>
        ))}
      </ul>
    </>
  )}


</section>


      {showTour ? (
        <div className="fixed inset-0 z-30 bg-black/40 pointer-events-none" />
      ) : null}

      {showTour ? (
        <OnboardingTour
          steps={TOUR_STEPS}
          currentStep={currentStep}
          onNext={() => {
            const next = currentStep + 1;
            if (next > TOUR_STEPS.length) {
              setShowTour(false);
            } else {
              setCurrentStep(next);
            }
          }}
          onSkip={() => setShowTour(false)}
        />
      ) : null}
    </div>
  );
}

function OnboardingTour({ steps, currentStep, onNext, onSkip }) {
  const step = steps.find((item) => item.id === currentStep);
  if (!step) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:pb-6">
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-4 shadow-2xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Paso {currentStep} de {steps.length}
            </p>
            <h4 className="mt-1 text-sm font-semibold text-white sm:text-base">
              {step.title}
            </h4>
            <p className="mt-1 text-xs text-white/80 sm:text-sm">{step.body}</p>
          </div>
          <div className="flex gap-2 sm:items-center sm:self-center">
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800 sm:text-sm"
            >
              Saltar
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-emerald-400 sm:text-sm"
            >
              {currentStep >= steps.length ? "Cerrar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

