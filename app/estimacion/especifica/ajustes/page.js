"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  LS_CUSTOM_CATEGORIES,
  LS_ESPECIFICA,
  LS_ESTIMABLES,
  LS_PROJECTION_SERIES,
  LS_PROJECTION_ANCHOR,
  buildMonthLabels,
  ensureMonthArray,
  normalizeKey,
  diffMonths,
  shiftMonthArray,
  shiftProjection,
} from "../constants";
import {
  getSupabaseSession,
  fetchEstimacionEspecifica,
  upsertEstimacionEspecifica,
  fetchEstimablesGrouped,
  fetchCustomCategories,
} from "../../../../lib/app-data";
import {
  buildInstallmentSeries,
  buildPlannedPurchaseSeries,
  getCurrentMonthKey,
} from "../../../../lib/installments";

const LOCKED_ESTIMABLE_EXPENSE_IDS = new Set(["prestamos", "tarjetas"]);

const n = (value) => {
  const numeric = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatUYU = (value) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value || 0);

const buildZeroMap = (categories) =>
  categories.reduce((acc, cat) => {
    acc[cat.id] = 0;
    return acc;
  }, {});

const pickCategoryValue = (collection, cat) => {
  if (!collection || typeof collection !== "object") return null;
  if (collection[cat.label] !== undefined) return collection[cat.label];
  if (collection[cat.id] !== undefined) return collection[cat.id];
  const aliases = cat.aliases ?? [];
  const normalizedTargets = new Set(
    [cat.label, cat.id, ...aliases].map((value) => normalizeKey(value))
  );
  for (const [key, value] of Object.entries(collection)) {
    if (normalizedTargets.has(normalizeKey(key))) return value;
  }
  return null;
};

const buildNumberMap = (categories, source) => {
  const base = buildZeroMap(categories);
  if (!source || typeof source !== "object") return base;
  categories.forEach((cat) => {
    base[cat.id] = n(pickCategoryValue(source, cat));
  });
  return base;
};

const deriveLegacyEgresos = (detalles) => {
  const totals = {};
  if (!detalles || typeof detalles !== "object") return totals;
  const lookup = new Map();
  EXPENSE_CATEGORIES.forEach((cat) => {
    const candidates = [cat.id, cat.label, ...(cat.aliases ?? [])];
    candidates.forEach((key) => lookup.set(normalizeKey(key), cat.id));
  });
  Object.entries(detalles).forEach(([key, value]) => {
    const catId = lookup.get(normalizeKey(key));
    if (!catId) return;
    const arr = Array.isArray(value) ? value : [];
    const sum = arr.reduce((acc, item) => acc + n(item?.monto), 0);
    if (sum > 0) totals[catId] = sum;
  });
  return totals;
};

const generateCustomCategoryId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return `custom-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeCustomCategoriesPayload = (raw) => {
  const ensureEntry = (entry) => {
    if (!entry || typeof entry !== "object") return null;
    const label = String(entry?.label ?? entry?.nombre ?? "").trim();
    if (!label) return null;
    const rawId = String(entry?.id ?? "").trim();
    return {
      id: rawId || generateCustomCategoryId(),
      label,
      source: "custom",
    };
  };
  const normalizeList = (list) =>
    Array.isArray(list)
      ? list.map(ensureEntry).filter(Boolean)
      : [];
  return {
    ingresos: normalizeList(raw?.ingresos),
    egresos: normalizeList(raw?.egresos),
  };
};

const readCustomCategoriesFromStorage = () => {
  if (typeof window === "undefined") {
    return { ingresos: [], egresos: [] };
  }
  try {
    const raw = window.localStorage.getItem(LS_CUSTOM_CATEGORIES);
    if (!raw) return { ingresos: [], egresos: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ingresos: [], egresos: [] };
    return normalizeCustomCategoriesPayload(parsed);
  } catch {
    return { ingresos: [], egresos: [] };
  }
};

const sanitizeProjection = (
  raw,
  incomeCatalog = INCOME_CATEGORIES,
  expenseCatalog = EXPENSE_CATEGORIES,
  lockedExpenseIds = LOCKED_ESTIMABLE_EXPENSE_IDS
) => {
  const sanitizeSection = (data, catalog, lockedIds = new Set()) => {
    if (!data || typeof data !== "object") return {};
    return catalog.reduce((acc, cat) => {
      if (lockedIds.has(cat.id)) return acc;
      const source = data[cat.id] ?? data[cat.label];
      if (source) acc[cat.id] = ensureMonthArray(source);
      return acc;
    }, {});
  };
  if (!raw || typeof raw !== "object") {
    return {
      ingresos: {},
      egresos: {},
      ahorro: ensureMonthArray([]),
    };
  }
  return {
    ingresos: sanitizeSection(raw.ingresos, incomeCatalog),
    egresos: sanitizeSection(raw.egresos, expenseCatalog, lockedExpenseIds),
    ahorro: ensureMonthArray(raw.ahorro ?? []),
  };
};

const cleanSection = (section) => {
  const cleaned = {};
  Object.entries(section ?? {}).forEach(([key, series]) => {
    const sanitized = ensureMonthArray(series);
    if (sanitized.some((value) => value !== "")) cleaned[key] = sanitized;
  });
  return cleaned;
};

const buildSeriesFromBase = (existing, baseValue) => {
  const sanitized = ensureMonthArray(existing ?? []);
  const hasData = sanitized.some((value) => value !== "");
  if (hasData) {
    return sanitized.map((value) =>
      value === null || value === undefined ? "" : String(value)
    );
  }
  const baseString =
    baseValue === null || baseValue === undefined ? "" : String(baseValue);
  return Array.from({ length: 12 }, () => baseString);
};

const hydrateProjectionWithBase = (
  projection,
  baseIngresos,
  baseEgresos,
  baseAhorro,
  incomeCatalog = INCOME_CATEGORIES,
  expenseCatalog = EXPENSE_CATEGORIES,
  lockedExpenseIds = LOCKED_ESTIMABLE_EXPENSE_IDS
) => {
  const next = {
    ingresos: {},
    egresos: {},
    ahorro: [],
  };

  incomeCatalog.forEach((cat) => {
    next.ingresos[cat.id] = buildSeriesFromBase(
      projection.ingresos?.[cat.id],
      baseIngresos[cat.id] ?? 0
    );
  });

  expenseCatalog.forEach((cat) => {
    if (lockedExpenseIds.has(cat.id)) {
      return;
    }
    next.egresos[cat.id] = buildSeriesFromBase(
      projection.egresos?.[cat.id],
      baseEgresos[cat.id] ?? 0
    );
  });

  next.ahorro = buildSeriesFromBase(projection.ahorro, baseAhorro);
  return next;
};

export default function AjustesEstimacionEspecificaPage() {
  const [baseIngresos, setBaseIngresos] = useState(() =>
    buildZeroMap(INCOME_CATEGORIES)
  );
  const [baseEgresos, setBaseEgresos] = useState(() =>
    buildZeroMap(EXPENSE_CATEGORIES)
  );
  const [baseSaldo, setBaseSaldo] = useState(0);
  const [baseAhorro, setBaseAhorro] = useState(0);
  const [projection, setProjection] = useState(() => ({
    ingresos: {},
    egresos: {},
    ahorro: ensureMonthArray([]),
  }));
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "idle", message: "" });
  const [session, setSession] = useState({ supabase: null, userId: null });
  const [recordId, setRecordId] = useState(null);
  const [prestamosSeries, setPrestamosSeries] = useState(() => Array(12).fill(0));
  const [tarjetasSeries, setTarjetasSeries] = useState(() => Array(12).fill(0));
  const [comprasPlanSeries, setComprasPlanSeries] = useState(() => Array(12).fill(0));
  const currentMonthKey = getCurrentMonthKey();
  const [customIncomeCategories, setCustomIncomeCategories] = useState([]);
  const [customExpenseCategories, setCustomExpenseCategories] = useState([]);

  const monthLabels = useMemo(() => buildMonthLabels(12), []);
  const seriesLength = monthLabels.length;

  const normalizeSeries = useCallback(
    (primary, fallback = []) => {
      const base = Array.isArray(primary) ? primary : Array.isArray(fallback) ? fallback : [];
      return Array.from({ length: seriesLength }, (_, idx) => n(base[idx] ?? 0));
    },
    [seriesLength]
  );

  const activeIncomeCategories = useMemo(
    () => [...INCOME_CATEGORIES, ...customIncomeCategories],
    [customIncomeCategories]
  );
  const activeExpenseCategories = useMemo(
    () => [...EXPENSE_CATEGORIES, ...customExpenseCategories],
    [customExpenseCategories]
  );

  useEffect(() => {
    setBaseIngresos((prev) => {
      const next = { ...prev };
      let changed = false;
      const baseIds = new Set(Object.keys(prev));
      customIncomeCategories.forEach((cat) => {
        if (!baseIds.has(cat.id)) {
          next[cat.id] = 0;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [customIncomeCategories]);

  useEffect(() => {
    setBaseEgresos((prev) => {
      const next = { ...prev };
      let changed = false;
      const baseIds = new Set(Object.keys(prev));
      customExpenseCategories.forEach((cat) => {
        if (!baseIds.has(cat.id)) {
          next[cat.id] = 0;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [customExpenseCategories]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => {
      const stored = readCustomCategoriesFromStorage();
      setCustomIncomeCategories(stored.ingresos);
      setCustomExpenseCategories(stored.egresos);
    };
    refresh();
    window.addEventListener("miadmi:data-updated", refresh);
    const handleStorage = (event) => {
      if (event?.key === LS_CUSTOM_CATEGORIES) {
        refresh();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("miadmi:data-updated", refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, [currentMonthKey, normalizeSeries, seriesLength]);

  const resolvedIngresos = useMemo(() => {
    return activeIncomeCategories.map((cat) => {
      const baseValue = baseIngresos[cat.id] ?? 0;
      const overrides = projection.ingresos?.[cat.id];
      const values = Array.from({ length: 12 }, (_, idx) => {
        const raw = overrides?.[idx];
        return raw !== undefined && raw !== "" ? n(raw) : baseValue;
      });
      return { id: cat.id, label: cat.label, values };
    });
  }, [baseIngresos, projection.ingresos]);

  const resolvedEgresos = useMemo(() => {
    return activeExpenseCategories.map((cat) => {
      let baseValue = baseEgresos[cat.id] ?? 0;
      if (LOCKED_ESTIMABLE_EXPENSE_IDS.has(cat.id)) {
        baseValue = cat.id === "tarjetas" ? tarjetasSeries : prestamosSeries;
      }
      const overrides = LOCKED_ESTIMABLE_EXPENSE_IDS.has(cat.id)
        ? null
        : projection.egresos?.[cat.id];
      const values = Array.from({ length: 12 }, (_, idx) => {
        const raw = overrides?.[idx];
        if (raw !== undefined && raw !== "") return n(raw);
        if (Array.isArray(baseValue)) {
          return n(baseValue[idx] ?? 0);
        }
        return n(baseValue);
      });
      return { id: cat.id, label: cat.label, values };
    });
  }, [baseEgresos, projection.egresos, prestamosSeries, tarjetasSeries]);
  const resolvedAhorro = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const raw = projection.ahorro?.[idx];
      return raw !== undefined && raw !== "" ? n(raw) : baseAhorro;
    });
  }, [projection.ahorro, baseAhorro]);

  const previewTotals = useMemo(() => {
    const ingresos = Array(12).fill(0);
    const egresos = Array(12).fill(0);
    resolvedIngresos.forEach((series) => {
      series.values.forEach((value, idx) => {
        ingresos[idx] += value;
      });
    });
    resolvedEgresos.forEach((series) => {
      series.values.forEach((value, idx) => {
        egresos[idx] += value;
      });
    });
    const saldo = [];
    let saldoAnterior = baseSaldo;
    for (let i = 0; i < 12; i++) {
      const resultado = ingresos[i] - egresos[i];
      const ahorroMes = resolvedAhorro[i];
      const saldoMes = saldoAnterior + resultado - ahorroMes;
      saldo.push(saldoMes);
      saldoAnterior = saldoMes;
    }
    return { ingresos, egresos, ahorro: resolvedAhorro, saldo };
  }, [resolvedIngresos, resolvedEgresos, resolvedAhorro, baseSaldo]);

  const resumenAcumulado = useMemo(() => {
    const ahorroTotal = previewTotals.ahorro.reduce((acc, value) => acc + value, 0);
    const saldoFinal =
      previewTotals.saldo.length > 0
        ? previewTotals.saldo[previewTotals.saldo.length - 1]
        : baseSaldo;
    return {
      saldoInicial: baseSaldo,
      ahorroTotal,
      saldoFinal,
    };
  }, [previewTotals, baseSaldo]);

  const saldoInicialRow = useMemo(() => {
    return Array.from({ length: monthLabels.length }, (_, idx) => {
      if (idx === 0) return baseSaldo;
      return previewTotals.saldo[idx - 1] ?? 0;
    });
  }, [baseSaldo, previewTotals.saldo, monthLabels.length]);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const ctx = await getSupabaseSession();
        if (!active) return;
        setSession(ctx);

        let remote = null;
        if (ctx.supabase && ctx.userId) {
          try {
            remote = await fetchEstimacionEspecifica(ctx.supabase, ctx.userId);
          } catch {
            // ignore remote errors
          }
        }

        let cached = null;
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(LS_ESPECIFICA);
            if (raw) cached = JSON.parse(raw) ?? null;
          } catch {
            // ignore cache errors
          }
        }

        let estimablesPayload = null;
        if (ctx.supabase && ctx.userId) {
          try {
            estimablesPayload = await fetchEstimablesGrouped(ctx.supabase, ctx.userId);
          } catch {
            // ignore estimables fetch errors
          }
        }
        if (!estimablesPayload && typeof window !== "undefined") {
          try {
            const rawEstimables = window.localStorage.getItem(LS_ESTIMABLES);
            if (rawEstimables) estimablesPayload = JSON.parse(rawEstimables) ?? null;
          } catch {
            // ignore cache errors
          }
        }

        let projectionMirror = null;
        if (typeof window !== "undefined") {
          try {
            const rawProjection = window.localStorage.getItem(LS_PROJECTION_SERIES);
            if (rawProjection) projectionMirror = JSON.parse(rawProjection) ?? null;
          } catch {
            // ignore projection cache errors
          }
        }

// === REALINEAR PROJECTION CUANDO CAMBIA EL MES ===
let anchor = null;
if (typeof window !== "undefined") {
  anchor = window.localStorage.getItem(LS_PROJECTION_ANCHOR);
}

const delta = diffMonths(anchor, currentMonthKey);

// 1) correr el mirror de series (prestamos/tarjetas/compras)
if (projectionMirror && delta) {
  projectionMirror = {
    ...projectionMirror,
    prestamos: shiftMonthArray(projectionMirror.prestamos, delta, seriesLength),
    tarjetas: shiftMonthArray(projectionMirror.tarjetas, delta, seriesLength),
    compras: shiftMonthArray(projectionMirror.compras, delta, seriesLength),
  };
}

// 2) correr la projection (overrides) del snapshot local
if (cached?.projection && delta) {
  cached = {
    ...cached,
    projection: shiftProjection(cached.projection, delta, seriesLength),
  };
}

if (typeof window !== "undefined" && delta) {
  window.localStorage.setItem(LS_PROJECTION_ANCHOR, currentMonthKey);

  // Guardar el snapshot local ya corregido (con projection corrida)
  if (cached) {
    window.localStorage.setItem(LS_ESPECIFICA, JSON.stringify(cached));
  }

  // Guardar también el projectionMirror corregido (series)
  if (projectionMirror) {
    window.localStorage.setItem(LS_PROJECTION_SERIES, JSON.stringify(projectionMirror));
  }
}



        let customPayload = readCustomCategoriesFromStorage();
        if (ctx.supabase && ctx.userId) {
          try {
            const remoteCustom = await fetchCustomCategories(ctx.supabase, ctx.userId);
            if (remoteCustom) {
              customPayload = normalizeCustomCategoriesPayload(remoteCustom);
              try {
                if (typeof window !== "undefined") {
                  const payload = {
                    ingresos: customPayload.ingresos.map((cat) => ({
                      id: cat.id,
                      nombre: cat.label,
                    })),
                    egresos: customPayload.egresos.map((cat) => ({
                      id: cat.id,
                      nombre: cat.label,
                    })),
                  };
                  window.localStorage.setItem(LS_CUSTOM_CATEGORIES, JSON.stringify(payload));
                }
              } catch {
                // ignore storage sync issues
              }
            }
          } catch {
            // ignore remote failures, fall back to cached payload
          }
        }
        setCustomIncomeCategories(customPayload.ingresos);
        setCustomExpenseCategories(customPayload.egresos);

        const runtimeIncomeCats = [...INCOME_CATEGORIES, ...customPayload.ingresos];
        const runtimeExpenseCats = [...EXPENSE_CATEGORIES, ...customPayload.egresos];

        const mergedIngresos = {
          ...(cached?.ingresos ?? {}),
          ...(remote?.ingresos ?? {}),
        };
        const mergedEgresosSource = {
          ...(cached?.egresos ?? {}),
          ...(remote?.egresos ?? {}),
        };

        const ingresosMap = buildNumberMap(runtimeIncomeCats, mergedIngresos);
        const legacyTotals = deriveLegacyEgresos(cached?.detalles);
        const egresosMap = buildNumberMap(runtimeExpenseCats, mergedEgresosSource);
        const mergedEgresos = {
          ...buildZeroMap(runtimeExpenseCats),
          ...egresosMap,
          ...legacyTotals,
        };
        const prestamosSchedule = buildInstallmentSeries(
          Array.isArray(estimablesPayload?.prestamos) ? estimablesPayload.prestamos : [],
          currentMonthKey,
          seriesLength
        );
        const tarjetasSchedule = buildInstallmentSeries(
          Array.isArray(estimablesPayload?.tarjetas) ? estimablesPayload.tarjetas : [],
          currentMonthKey,
          seriesLength
        );
        const plannedPurchasesSeries = buildPlannedPurchaseSeries(
          Array.isArray(estimablesPayload?.compras) ? estimablesPayload.compras : [],
          currentMonthKey,
          seriesLength
        );
        const comprasEstimables = Array.isArray(estimablesPayload?.compras)
          ? estimablesPayload.compras.reduce(
              (acc, item) =>
                String(item?.mes ?? "") === currentMonthKey ? acc + n(item?.valor) : acc,
              0
            )
          : 0;
        // Guardar las series completas de 12 meses
        setPrestamosSeries(
          normalizeSeries(projectionMirror?.prestamos, prestamosSchedule.series)
        );
        setTarjetasSeries(
          normalizeSeries(projectionMirror?.tarjetas, tarjetasSchedule.series)
        );
        setComprasPlanSeries(
          normalizeSeries(projectionMirror?.compras, plannedPurchasesSeries)
        );
        // Para compatibilidad, también guardar el total del mes actual
        mergedEgresos.prestamos = prestamosSchedule.currentTotal;
        mergedEgresos.tarjetas = tarjetasSchedule.currentTotal;
        mergedEgresos.adquisiciones = n(mergedEgresos.adquisiciones) + comprasEstimables;
        const saldoBase = n(cached?.saldoInicial ?? 0);
const ahorroBase = n(remote?.ahorro_mensual ?? cached?.ahorroMensual ?? cached?.ahorroDeseado ?? 0);

const sanitizedProj = sanitizeProjection(
  (remote?.projection ?? cached?.projection) ?? null,
  runtimeIncomeCats,
  runtimeExpenseCats,
  LOCKED_ESTIMABLE_EXPENSE_IDS
);

        setRecordId(remote?.id ?? cached?.id ?? null);

        setBaseIngresos(ingresosMap);
        setBaseEgresos(mergedEgresos);
        setBaseSaldo(saldoBase);
        setBaseAhorro(ahorroBase);
        setProjection(
          hydrateProjectionWithBase(
            sanitizedProj ?? { ingresos: {}, egresos: {}, ahorro: [] },
            ingresosMap,
            mergedEgresos,
            ahorroBase,
            runtimeIncomeCats,
            runtimeExpenseCats,
            LOCKED_ESTIMABLE_EXPENSE_IDS
          )
        );

        if (typeof window !== "undefined" && remote?.projection_anchor) {
  window.localStorage.setItem(LS_PROJECTION_ANCHOR, remote.projection_anchor);
}

      } 
      
      
      finally {
        if (active) setLoaded(true);
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  // Actualizar las series de préstamos y tarjetas cuando cambien los estimables
  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    const refreshEstimablesSeries = async () => {
      if (!active) return;
      try {
        let estimablesPayload = null;
        if (session.supabase && session.userId) {
          try {
            estimablesPayload = await fetchEstimablesGrouped(session.supabase, session.userId);
          } catch {
            // ignore estimables fetch errors
          }
        }
        if (!estimablesPayload && typeof window !== "undefined") {
          try {
            const rawEstimables = window.localStorage.getItem(LS_ESTIMABLES);
            if (rawEstimables) estimablesPayload = JSON.parse(rawEstimables) ?? null;
          } catch {
            // ignore cache errors
          }
        }
        if (active) {
          const projectionMirror =
            typeof window !== "undefined"
              ? JSON.parse(window.localStorage.getItem(LS_PROJECTION_SERIES) ?? "null")
              : null;
          const prestamosSchedule = buildInstallmentSeries(
            Array.isArray(estimablesPayload?.prestamos) ? estimablesPayload.prestamos : [],
            currentMonthKey,
            seriesLength
          );
          const tarjetasSchedule = buildInstallmentSeries(
            Array.isArray(estimablesPayload?.tarjetas) ? estimablesPayload.tarjetas : [],
            currentMonthKey,
            seriesLength
          );
          const plannedPurchasesSeries = buildPlannedPurchaseSeries(
            Array.isArray(estimablesPayload?.compras) ? estimablesPayload.compras : [],
            currentMonthKey,
            seriesLength
          );
          setPrestamosSeries(
            normalizeSeries(projectionMirror?.prestamos, prestamosSchedule.series)
          );
          setTarjetasSeries(
            normalizeSeries(projectionMirror?.tarjetas, tarjetasSchedule.series)
          );
          setComprasPlanSeries(
            normalizeSeries(projectionMirror?.compras, plannedPurchasesSeries)
          );
        }
      } catch {
        // ignore errors
      }
    };
    const handleStorage = (event) => {
      if (
        event?.key &&
        event.key !== LS_ESTIMABLES &&
        event.key !== LS_PROJECTION_SERIES
      )
        return;
      refreshEstimablesSeries();
    };
    refreshEstimablesSeries();
    window.addEventListener("miadmi:data-updated", refreshEstimablesSeries);
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      window.removeEventListener("miadmi:data-updated", refreshEstimablesSeries);
      window.removeEventListener("storage", handleStorage);
    };
  }, [session.supabase, session.userId, currentMonthKey, normalizeSeries, seriesLength]);

const handleCellChange = (section, id, monthIdx, value) => {
  if (section === "egresos" && LOCKED_ESTIMABLE_EXPENSE_IDS.has(id)) {
    return;
  }
    setProjection((prev) => {
      const next = {
        ingresos: { ...(prev.ingresos ?? {}) },
        egresos: { ...(prev.egresos ?? {}) },
        ahorro: ensureMonthArray(prev.ahorro ?? []),
      };
      const formatted = value.trim();
      if (section === "ahorro") {
        const updated = ensureMonthArray(next.ahorro);
        updated[monthIdx] = formatted;
        next.ahorro = updated;
        return next;
      }
      const target = section === "ingresos" ? next.ingresos : next.egresos;
      const currentRow = ensureMonthArray(target[id] ?? []);
      currentRow[monthIdx] = formatted;
      target[id] = currentRow;
      return next;
    });
  };

  const getCellValue = (section, catId, idx) => {
    const overrideRow = projection[section]?.[catId];
    if (overrideRow && overrideRow[idx] !== undefined && overrideRow[idx] !== "") {
      return overrideRow[idx];
    }
    // Para préstamos y tarjetas, usar las series completas de 12 meses
    if (section === "egresos") {
      if (catId === "prestamos") {
        const value = prestamosSeries[idx] ?? 0;
        return String(value);
      }
      if (catId === "tarjetas") {
        const value = tarjetasSeries[idx] ?? 0;
        return String(value);
      }
    }
    const baseMap = section === "ingresos" ? baseIngresos : baseEgresos;
    const fallback = baseMap[catId] ?? 0;
    return String(fallback);
  };

  const getAhorroValue = (idx) => {
    if (projection.ahorro && projection.ahorro[idx] !== "") {
      return projection.ahorro[idx];
    }
    return baseAhorro || baseAhorro === 0 ? String(baseAhorro) : "";
  };

  const hasOverride = (section, catId, idx) => {
    if (section === "ahorro") {
      const value = projection.ahorro?.[idx];
      const baseString =
        baseAhorro === null || baseAhorro === undefined ? "" : String(baseAhorro);
      return value !== undefined && value !== baseString;
    }
    const value = projection[section]?.[catId]?.[idx];
    // Para préstamos y tarjetas, comparar con las series completas
    if (section === "egresos") {
      if (catId === "prestamos") {
        const baseValue = prestamosSeries[idx] ?? 0;
        const baseString = String(baseValue);
        return value !== undefined && value !== baseString;
      }
      if (catId === "tarjetas") {
        const baseValue = tarjetasSeries[idx] ?? 0;
        const baseString = String(baseValue);
        return value !== undefined && value !== baseString;
      }
    }
    const baseMap = section === "ingresos" ? baseIngresos : baseEgresos;
    const baseString =
      baseMap[catId] === null || baseMap[catId] === undefined
        ? ""
        : String(baseMap[catId]);
    return value !== undefined && value !== baseString;
  };

  const handleSave = async () => {
    if (!loaded) return;
    setSaving(true);
    setFeedback({ type: "idle", message: "" });
    try {
      const updatedBaseIngresos = { ...baseIngresos };
      const updatedBaseEgresos = { ...baseEgresos };
      let updatedBaseAhorro = baseAhorro ?? 0;

      const overrides = {
        ingresos: {},
        egresos: {},
        ahorro: ensureMonthArray(projection.ahorro ?? []),
      };

      activeIncomeCategories.forEach((cat) => {
        const row = ensureMonthArray(projection.ingresos?.[cat.id] ?? []);
        if (row[0] !== "") {
          updatedBaseIngresos[cat.id] = n(row[0]);
          row[0] = "";
        }
        if (row.some((cell) => cell !== "")) {
          overrides.ingresos[cat.id] = row;
        }
      });

      activeExpenseCategories.forEach((cat) => {
        if (LOCKED_ESTIMABLE_EXPENSE_IDS.has(cat.id)) return;
        const row = ensureMonthArray(projection.egresos?.[cat.id] ?? []);
        if (row[0] !== "") {
          updatedBaseEgresos[cat.id] = n(row[0]);
          row[0] = "";
        }
        if (row.some((cell) => cell !== "")) {
          overrides.egresos[cat.id] = row;
        }
      });

      if (overrides.ahorro[0] !== "") {
        updatedBaseAhorro = n(overrides.ahorro[0]);
        overrides.ahorro[0] = "";
      }
      if (overrides.ahorro.every((value) => value === "")) {
        overrides.ahorro = [];
      }

      const supaIngresos = {};
      activeIncomeCategories.forEach((cat) => {
        supaIngresos[cat.id] = updatedBaseIngresos[cat.id] ?? 0;
      });
      const supaEgresos = {};
      activeExpenseCategories.forEach((cat) => {
        supaEgresos[cat.id] = updatedBaseEgresos[cat.id] ?? 0;
      });

      if (session.supabase && session.userId) {
  const newId = await upsertEstimacionEspecifica(session.supabase, session.userId, {
    id: recordId,
    ingresos: supaIngresos,
    egresos: supaEgresos,
    projection: overrides,
    projection_anchor: currentMonthKey,
    ahorro_mensual: updatedBaseAhorro,
  });
  setRecordId(newId ?? recordId);
}

      const raw = typeof window !== "undefined"
        ? window.localStorage.getItem(LS_ESPECIFICA)
        : null;
      const snapshot = raw ? JSON.parse(raw) ?? {} : {};
      const payload = {
        ...snapshot,
        id: recordId ?? snapshot.id ?? null,
        ingresos: supaIngresos,
        egresos: supaEgresos,
        saldoInicial: baseSaldo,
        ahorroMensual: updatedBaseAhorro,
        ahorroDeseado: updatedBaseAhorro,
        projection: overrides,
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_ESPECIFICA, JSON.stringify(payload));
        window.localStorage.setItem(LS_PROJECTION_ANCHOR, currentMonthKey);
      }

      setBaseIngresos(updatedBaseIngresos);
      setBaseEgresos(updatedBaseEgresos);
      setBaseAhorro(updatedBaseAhorro);
      setProjection(
        hydrateProjectionWithBase(
          sanitizeProjection(
            overrides,
            activeIncomeCategories,
            activeExpenseCategories,
            LOCKED_ESTIMABLE_EXPENSE_IDS
          ) ?? { ingresos: {}, egresos: {}, ahorro: [] },
          updatedBaseIngresos,
          updatedBaseEgresos,
          updatedBaseAhorro,
          activeIncomeCategories,
          activeExpenseCategories,
          LOCKED_ESTIMABLE_EXPENSE_IDS
        )
      );
      setFeedback({
        type: "success",
        message: session.userId
          ? "Ajustes guardados y sincronizados."
          : "Ajustes guardados en este dispositivo.",
      });
      // HISTORIAL: este flujo termina llamando a upsertEstimacionEspecifica (guarda estado + snapshot mensual)
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "No se pudieron guardar los ajustes." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-amber-200">Premium</p>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Hacer ajustes
          </h1>
          <p className="text-sm text-white/80 md:text-base">
            Editá celdas como en Excel: cada categoría por mes. Los cambios impactan la
            tabla de Proyección en Estimación específica.
          </p>
        </div>
        <Link
          href="/estimacion/especifica"
          className="inline-flex items-center rounded-lg border border-white/30 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          Volver a Estimación específica
        </Link>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 text-slate-900 shadow">
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full table-fixed border-collapse text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Concepto</th>
                {monthLabels.map((label, idx) => (
                  <th key={label + idx} className="px-3 py-2 text-right">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-blue-50 text-blue-900 font-semibold">
                <td className="px-3 py-2">Saldo inicial</td>
                {monthLabels.map((_, idx) => (
                  <td key={`saldo-inicial-${idx}`} className="px-3 py-2 text-right">
                    {idx === 0 ? (
                      <input
                        className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-right text-sm text-blue-900 outline-none focus:border-blue-400"
                        value={String(baseSaldo ?? 0)}
                        onChange={(e) => setBaseSaldo(n(e.target.value))}
                        inputMode="decimal"
                        placeholder="0"
                      />
                    ) : (
                      formatUYU(saldoInicialRow[idx])
                    )}
                  </td>
                ))}
              </tr>

              <tr className="bg-emerald-200 text-emerald-950 font-semibold uppercase tracking-wide">
                <td className="px-3 py-2">Ingresos</td>
                {previewTotals.ingresos.map((value, idx) => (
                  <td key={`ingresos-total-${idx}`} className="px-3 py-2 text-right">
                    {formatUYU(value)}
                  </td>
                ))}
              </tr>

              {activeIncomeCategories.map((cat) => (
                <AdjustmentRow
                  key={cat.id}
                  label={cat.label}
                  monthLabels={monthLabels}
                  getValue={(idx) => getCellValue("ingresos", cat.id, idx)}
                  hasOverride={(idx) => hasOverride("ingresos", cat.id, idx)}
                  onChange={(idx, value) => handleCellChange("ingresos", cat.id, idx, value)}
                  tone="income"
                />
              ))}

              <tr className="bg-rose-200 text-rose-950 font-semibold uppercase tracking-wide">
                <td className="px-3 py-2">Egresos</td>
                {previewTotals.egresos.map((value, idx) => (
                  <td key={`egresos-total-${idx}`} className="px-3 py-2 text-right">
                    {formatUYU(value)}
                  </td>
                ))}
              </tr>

              {activeExpenseCategories.map((cat) => (
                <AdjustmentRow
                  key={cat.id}
                  label={cat.label}
                  monthLabels={monthLabels}
                  getValue={(idx) => getCellValue("egresos", cat.id, idx)}
                  hasOverride={(idx) => hasOverride("egresos", cat.id, idx)}
                  onChange={(idx, value) => handleCellChange("egresos", cat.id, idx, value)}
                  tone="expense"
                  readOnly={LOCKED_ESTIMABLE_EXPENSE_IDS.has(cat.id)}
                />
              ))}

              <tr className="bg-white">
                <td className="px-3 py-2 text-sm font-medium text-slate-900">
                  Compras planificadas
                </td>
                {monthLabels.map((_, idx) => (
                  <td key={`compras-plan-${idx}`} className="px-3 py-2 text-right">
                    <span className="tabular-nums">{formatUYU(comprasPlanSeries[idx] ?? 0)}</span>
                  </td>
                ))}
              </tr>

              <AdjustmentRow
                label="Ahorro"
                monthLabels={monthLabels}
                getValue={(idx) => getAhorroValue(idx)}
                hasOverride={(idx) => hasOverride("ahorro", "ahorro", idx)}
                onChange={(idx, value) => handleCellChange("ahorro", "ahorro", idx, value)}
                tone="savings"
              />

              <tr className="bg-blue-100 text-blue-950 font-semibold uppercase tracking-wide">
                <td className="px-3 py-2">Saldo final</td>
                {previewTotals.saldo.map((value, idx) => (
                  <td
                    key={`saldo-final-${idx}`}
                    className={["px-3 py-2 text-right", value < 0 ? "text-rose-600" : ""].join(" ")}
                  >
                    {formatUYU(value)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
          <p className="text-xs uppercase tracking-wide text-blue-700">KPI</p>
          <p className="text-lg font-semibold">Ahorro acumulado</p>
          <p className="text-2xl font-semibold">{formatUYU(resumenAcumulado.ahorroTotal)}</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            {feedback.message
              ? feedback.message
              : loaded
              ? "Modificá los valores y guardá tus ajustes premium."
              : "Cargando datos guardados..."}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!loaded || saving}
            className={[
              "inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition",
              !loaded || saving
                ? "cursor-not-allowed border border-slate-300 bg-slate-200 text-slate-500"
                : "border border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-600",
            ].join(" ")}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </section>
    </div>
  );
}

function AdjustmentRow({
  label,
  monthLabels,
  getValue,
  hasOverride,
  onChange,
  tone = "neutral",
  readOnly = false,
}) {
  const toneConfig = {
    income: {
      row: "bg-emerald-50/60",
      input: "border-emerald-200 focus:border-emerald-400",
    },
    expense: {
      row: "bg-rose-50/60",
      input: "border-rose-200 focus:border-rose-400",
    },
    savings: {
      row: "bg-blue-50/60",
      input: "border-blue-200 focus:border-blue-400",
    },
    neutral: {
      row: "bg-slate-50/60",
      input: "border-slate-200 focus:border-slate-400",
    },
  };
  const config = toneConfig[tone] ?? toneConfig.neutral;

  return (
    <tr className={["align-top", config.row].join(" ")}>
      <td className="px-3 py-2 font-medium text-slate-700">{label}</td>
      {monthLabels.map((_, idx) => {
        const override = hasOverride(idx);
        return (
          <td key={`${label}-${idx}`} className="px-2 py-1 text-right">
            <input
              className={[
                "w-20 rounded border px-2 py-1 text-right text-sm text-slate-900 outline-none transition bg-white",
                override
                  ? "border-amber-400 bg-amber-50 text-amber-900"
                  : readOnly
                  ? "border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                  : config.input,
              ].join(" ")}
              value={getValue(idx)}
              onChange={(e) => onChange(idx, e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
              tabIndex={readOnly ? -1 : undefined}
              inputMode="decimal"
              placeholder="0"
            />
          </td>
        );
      })}
    </tr>
  );
}
