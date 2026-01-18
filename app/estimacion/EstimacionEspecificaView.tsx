"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useSessionInfo } from "../../components/SessionProvider";
import { useRouter } from "next/navigation";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  LS_ESPECIFICA,
  LS_ESTIMABLES,
  LS_CUSTOM_CATEGORIES,
  LS_PROJECTION_SERIES,
  ensureMonthArray,
  buildMonthLabels,
} from "./especifica/constants";
import {
  DEFAULT_ESTIMATION_MODE,
  fetchCustomCategories,
  fetchEstimationMode,
  fetchEstimacionEspecifica,
  fetchEstimablesGrouped,
  getSupabaseSession,
  saveCustomCategories,
  saveEstimationMode,
  upsertEstimacionEspecifica,
} from "../../lib/app-data";
import { buildInstallmentSeries, buildPlannedPurchaseSeries, monthDiff } from "../../lib/installments";
import { triggerPremiumBlock } from "../../lib/premiumBlocker";

const INCOME_ORDER = [
  "sueldos",
  "extraordinarios",
  "devolucion",
  "prestamosIngresos",
  "familia",
  "otros",
];
const EXPENSE_ORDER = [
  "super",
  "alquiler",
  "gastosFijos",
  "gym",
  "otrasActividades",
  "salud",
  "transporte",
  "generales",
  "ropa",
  "entretenimiento",
  "viajes",
  "educacion",
  "adquisiciones",
  "reparaciones",
  "prestamos",
  "tarjetas",
];

const BASE_ORDERED_INCOME_CATEGORIES = INCOME_ORDER.map((id) =>
  INCOME_CATEGORIES.find((cat) => cat.id === id)
).filter(Boolean);

const BASE_ORDERED_EXPENSE_CATEGORIES = EXPENSE_ORDER.map((id) =>
  EXPENSE_CATEGORIES.find((cat) => cat.id === id)
).filter(Boolean);

const BASE_MANUAL_EXPENSE_CATEGORIES = BASE_ORDERED_EXPENSE_CATEGORIES.filter(
  (cat) => cat.source !== "estimables"
);

const ESTIMABLE_EXPENSE_CATEGORIES = BASE_ORDERED_EXPENSE_CATEGORIES.filter(
  (cat) => cat.source === "estimables"
);

const MODE_KEY = "miadmi:estimacion_mode";

export default function EstimacionEspecificaView({
  highlightSpecificAdjust = false,
  modeOverride = null,
  hideModeToggle = false,
} = {}) {
  const [ingresos, setIngresos] = useState(() => buildEmptyState(BASE_ORDERED_INCOME_CATEGORIES));
  const [egresos, setEgresos] = useState(() => buildEmptyState(BASE_MANUAL_EXPENSE_CATEGORIES));
  const [saldoInicial, setSaldoInicial] = useState("");
  const [ahorroMensual, setAhorroMensual] = useState("");
  const [session, setSession] = useState({ supabase: null, userId: null });
  const ensureSupabaseCtx = useCallback(async () => {
    if (session.supabase && session.userId) return session;
    try {
      const ctx = await getSupabaseSession();
      if (ctx.supabase && ctx.userId) {
        setSession(ctx);
      }
      return ctx;
    } catch {
      return session;
    }
  }, [session]);
  const [recordId, setRecordId] = useState(null);
  const [projection, setProjection] = useState(null);
  const [legacyDetalles, setLegacyDetalles] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [estimablesTotals, setEstimablesTotals] = useState({
    prestamos: 0,
    tarjetas: 0,
    comprasMes: 0,
  });
  const [showPremiumCatsNotice, setShowPremiumCatsNotice] = useState(false);
  const [customIncomeCategories, setCustomIncomeCategories] = useState([]);
  const [customExpenseCategories, setCustomExpenseCategories] = useState([]);
  const [categoryMenu, setCategoryMenu] = useState(null);
  const [categoryPanel, setCategoryPanel] = useState(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [categoryEdits, setCategoryEdits] = useState({});
  const [categoryError, setCategoryError] = useState("");
  const [estimablesPayload, setEstimablesPayload] = useState({
    prestamos: [],
    tarjetas: [],
    compras: [],
  });
  const { plan, premiumUntil } = useSessionInfo();
  const [activeMode, setActiveMode] = useState(() => modeOverride ?? DEFAULT_ESTIMATION_MODE);
  const [modeSaving, setModeSaving] = useState(false);
  const [modeError, setModeError] = useState("");
  const hydratingRef = useRef(false);
  const isPremium =
    plan === "premium" &&
    (!premiumUntil || new Date(premiumUntil).getTime() > Date.now());
  const monthCount = isPremium ? 24 : 6;
  const resolvedMode = modeOverride ?? activeMode;
  const isActive = resolvedMode === "especifica";
  const shouldSyncMode = !modeOverride;
  const incomeCategories = useMemo(
    () => [...BASE_ORDERED_INCOME_CATEGORIES, ...customIncomeCategories],
    [customIncomeCategories]
  );
  const manualExpenseCategoriesWithCustom = useMemo(
    () => [...BASE_MANUAL_EXPENSE_CATEGORIES, ...customExpenseCategories],
    [customExpenseCategories]
  );
  const expenseCategories = useMemo(
    () => [...manualExpenseCategoriesWithCustom, ...ESTIMABLE_EXPENSE_CATEGORIES],
    [manualExpenseCategoriesWithCustom]
  );

  const markDirty = () => {
    if (!loaded || hydratingRef.current) return;
    setDirty(true);
    setSaveError("");
    setSaveSuccess("");
  };

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    setIngresos((prev) => {
      const next = { ...prev };
      let changed = false;
      const baseIds = new Set(BASE_ORDERED_INCOME_CATEGORIES.map((cat) => cat.id));
      const customIds = new Set(customIncomeCategories.map((cat) => cat.id));
      customIncomeCategories.forEach((cat) => {
        if (!Object.prototype.hasOwnProperty.call(next, cat.id)) {
          next[cat.id] = "";
          changed = true;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!baseIds.has(key) && !customIds.has(key)) {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [customIncomeCategories]);

  useEffect(() => {
    setEgresos((prev) => {
      const next = { ...prev };
      let changed = false;
      const baseIds = new Set(BASE_MANUAL_EXPENSE_CATEGORIES.map((cat) => cat.id));
      const customIds = new Set(customExpenseCategories.map((cat) => cat.id));
      customExpenseCategories.forEach((cat) => {
        if (!Object.prototype.hasOwnProperty.call(next, cat.id)) {
          next[cat.id] = "";
          changed = true;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!baseIds.has(key) && !customIds.has(key)) {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [customExpenseCategories]);

// adentro de tu componente (EstimaciónEspecífica / EspecificaClient / etc.)
const emitDataUpdated = (() => {
  let t = null;
  return () => {
    if (typeof window === "undefined") return;
    if (t) return;
    t = window.setTimeout(() => {
      t = null;
      window.dispatchEvent(new Event("miadmi:data-updated"));
    }, 150);
  };
})();


const router = useRouter();



  useEffect(() => {
    persistCustomCategoriesToStorage({
      ingresos: customIncomeCategories,
      egresos: customExpenseCategories,
    });
  }, [customIncomeCategories, customExpenseCategories]);

 const clearProjectionOverrides = useCallback((section, id?: string) => {
  setProjection((prev) => {
    if (!prev) return prev;
    const next = { ...prev };

    if (section === "ahorro") {
      if (Array.isArray(next.ahorro)) {
        delete next.ahorro;
      } else {
        return prev;
      }
    } else {
      if (!id) return prev; // 👈 guard para TS y runtime
      const sectionData = { ...(next[section] ?? {}) };
      if (!Object.prototype.hasOwnProperty.call(sectionData, id)) {
        return prev;
      }
      delete sectionData[id];
      if (Object.keys(sectionData).length > 0) {
        next[section] = sectionData;
      } else {
        delete next[section];
      }
    }

    const hasIngresos = next.ingresos && Object.keys(next.ingresos).length > 0;
    const hasEgresos = next.egresos && Object.keys(next.egresos).length > 0;
    const hasAhorro = Array.isArray(next.ahorro) && next.ahorro.length > 0;
    if (!hasIngresos && !hasEgresos && !hasAhorro) {
      return null;
    }
    return next;
  });
}, []);


  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;

    const loadEstimables = async () => {
      if (!active) return;
      try {
        const ctx = await ensureSupabaseCtx();
        let payload = null;
        if (ctx.supabase && ctx.userId) {
          try {
            payload = await fetchEstimablesGrouped(ctx.supabase, ctx.userId);
          } catch {
            // ignore remote fetch errors
          }
        }
        if (!payload) {
          try {
            const raw = window.localStorage.getItem(LS_ESTIMABLES);
            emitDataUpdated();
            if (raw) payload = JSON.parse(raw) ?? null;
          } catch {
            // ignore storage issues
          }
        }

        const prestamosList = Array.isArray(payload?.prestamos) ? payload.prestamos : [];
        const tarjetasList = Array.isArray(payload?.tarjetas) ? payload.tarjetas : [];
        const comprasList = Array.isArray(payload?.compras) ? payload.compras : [];

        const normalizedPrestamos = preparePrestamosForSeries(prestamosList);
        const prestamosSchedule = buildInstallmentSeries(
          normalizedPrestamos,
          currentMonthKey,
          monthCount
        );
        const tarjetasSchedule = buildInstallmentSeries(
          tarjetasList,
          currentMonthKey,
          monthCount
        );
        const comprasMes = comprasList.reduce(
          (acc, item) => (String(item?.mes ?? "") === currentMonthKey ? acc + n(item?.valor) : acc),
          0
        );

        setEstimablesTotals({
          prestamos: prestamosSchedule.currentTotal,
          tarjetas: tarjetasSchedule.currentTotal,
          comprasMes,
        });
        setEstimablesPayload({
          prestamos: prestamosList,
          tarjetas: tarjetasList,
          compras: comprasList,
        });
      } catch {
        // ignore hydration issues
      }
    };

    const handleUpdate = () => {
      loadEstimables();
    };

    loadEstimables();
    window.addEventListener("miadmi:data-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      active = false;
      window.removeEventListener("miadmi:data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [currentMonthKey, ensureSupabaseCtx, monthCount]);

  const applySnapshot = (snapshot, incomeCats, manualCats) => {
    setRecordId(snapshot.id ?? null);
    setIngresos(buildStateFromSnapshot(incomeCats, snapshot.ingresos));
    setEgresos(buildStateFromSnapshot(manualCats, snapshot.egresos));
    setSaldoInicial(snapshot.saldoInicial != null ? String(snapshot.saldoInicial) : "");
    if (snapshot.ahorroMensual != null) {
      setAhorroMensual(String(snapshot.ahorroMensual));
    } else if (snapshot.ahorroDeseado != null) {
      setAhorroMensual(String(snapshot.ahorroDeseado));
    } else {
      setAhorroMensual("");
    }
    setLegacyDetalles(snapshot.detalles ?? null);
    setProjection(snapshot.projection ?? null);
  };

  const generateCustomCategoryId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      try {
        return crypto.randomUUID();
      } catch {
        // fallback below
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
      emitDataUpdated();
      if (!raw) return { ingresos: [], egresos: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return { ingresos: [], egresos: [] };
      }
      return normalizeCustomCategoriesPayload(parsed);
    } catch {
      return { ingresos: [], egresos: [] };
    }
  };

  const persistCustomCategoriesToStorage = (data) => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        ingresos: data.ingresos.map((cat) => ({ id: cat.id, nombre: cat.label })),
        egresos: data.egresos.map((cat) => ({ id: cat.id, nombre: cat.label })),
      };
      window.localStorage.setItem(LS_CUSTOM_CATEGORIES, JSON.stringify(payload));
      emitDataUpdated();
    } catch {
      // ignore
    }
  };

  const persistCustomCategoryState = async (next) => {
    setCustomIncomeCategories(next.ingresos);
    setCustomExpenseCategories(next.egresos);
    persistCustomCategoriesToStorage(next);
    markDirty();
    setCategoryError("");
    const ctx = await ensureSupabaseCtx();
    if (ctx.supabase && ctx.userId) {
      try {
        await saveCustomCategories(ctx.supabase, ctx.userId, {
          ingresos: next.ingresos.map((cat) => ({ id: cat.id, nombre: cat.label })),
          egresos: next.egresos.map((cat) => ({ id: cat.id, nombre: cat.label })),
        });
      } catch (err) {
        console.error(err);
        setCategoryError("No se pudieron sincronizar las categorías.");
      }
    }
  };

  const toggleCategoryMenu = (type) => {
    setCategoryPanel(null);
    setCategoryMenu((prev) =>
      prev?.type === type && prev.open ? null : { type, open: true }
    );
  };

  const openCategoryPanel = (type, mode) => {
    setCategoryMenu(null);
    setCategoryPanel({ type, mode });
    setCategoryError("");
    if (mode === "add") setCategoryInput("");
  };

  const handleCategoryAction = (type, mode) => {
    if (mode === "edit") {
      const entries =
        type === "income" ? customIncomeCategories : customExpenseCategories;
      const edits = entries.reduce((acc, cat) => {
        acc[cat.id] = cat.label;
        return acc;
      }, {});
      setCategoryEdits(edits);
    }
    openCategoryPanel(type, mode);
  };

  const handleAddCustomCategory = async (type) => {
    const trimmed = categoryInput.trim();
    if (!trimmed) {
      setCategoryError("Escribe un nombre válido.");
      return;
    }
    const normalized = trimmed.toLowerCase();
    const list = type === "income" ? customIncomeCategories : customExpenseCategories;
    if (list.some((cat) => cat.label.toLowerCase() === normalized)) {
      setCategoryError("Ya existe una categoría con ese nombre.");
      return;
    }
    const entry = {
      id: generateCustomCategoryId(),
      label: trimmed,
      source: "custom",
    };
    const next =
      type === "income"
        ? { ingresos: [...customIncomeCategories, entry], egresos: customExpenseCategories }
        : { ingresos: customIncomeCategories, egresos: [...customExpenseCategories, entry] };
    await persistCustomCategoryState(next);
    setCategoryPanel(null);
    setCategoryInput("");
  };

  const handleApplyCategoryEdits = async () => {
    if (!categoryPanel) return;
    const type = categoryPanel.type;
    const entries =
      type === "income" ? customIncomeCategories : customExpenseCategories;
    if (!entries.length) {
      setCategoryPanel(null);
      return;
    }
    const updated = entries.map((cat) => {
      const nextLabel = String(categoryEdits[cat.id] ?? cat.label).trim();
      return { ...cat, label: nextLabel || cat.label };
    });
    if (updated.some((cat) => !cat.label.trim())) {
      setCategoryError("Todas las categorías deben tener un nombre.");
      return;
    }
    const next =
      type === "income"
        ? { ingresos: updated, egresos: customExpenseCategories }
        : { ingresos: customIncomeCategories, egresos: updated };
    await persistCustomCategoryState(next);
    setCategoryPanel(null);
    setCategoryEdits({});
  };

  const handleDeleteCustomCategory = async (type, id) => {
    const next =
      type === "income"
        ? {
            ingresos: customIncomeCategories.filter((cat) => cat.id !== id),
            egresos: customExpenseCategories,
          }
        : {
            ingresos: customIncomeCategories,
            egresos: customExpenseCategories.filter((cat) => cat.id !== id),
          };
    await persistCustomCategoryState(next);
  };

  const renderCategoryPanel = (type) => {
    if (!categoryPanel || categoryPanel.type !== type) return null;
    const list = type === "income" ? customIncomeCategories : customExpenseCategories;
    const baseStyle =
      "absolute right-0 top-full z-10 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-sm text-slate-900";
    if (categoryPanel.mode === "add") {
      return (
        <div className={baseStyle}>
          <p className="text-xs uppercase tracking-wide text-slate-500">Categoría propia</p>
          <input
            className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-400"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            placeholder="Ingresos extra, comida, etc."
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCategoryPanel(null)}
              className="text-xs uppercase tracking-wide text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleAddCustomCategory(type)}
              className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              Guardar
            </button>
          </div>
          {categoryError ? (
            <p className="mt-2 text-xs text-rose-600">{categoryError}</p>
          ) : null}
        </div>
      );
    }
    if (categoryPanel.mode === "edit") {
      return (
        <div className={baseStyle}>
          <p className="text-xs uppercase tracking-wide text-slate-500">Renombrar categorías</p>
          {list.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">Sin categorías propias aún.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {list.map((cat) => (
                <input
                  key={cat.id}
                  className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-400"
                  value={categoryEdits[cat.id] ?? cat.label}
                  onChange={(e) =>
                    setCategoryEdits((prev) => ({ ...prev, [cat.id]: e.target.value }))
                  }
                />
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCategoryPanel(null)}
              className="text-xs uppercase tracking-wide text-slate-500 hover:text-slate-700"
            >
              Cerrar
            </button>
            {list.length > 0 ? (
              <button
                type="button"
                onClick={handleApplyCategoryEdits}
                className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
              >
                Guardar cambios
              </button>
            ) : null}
          </div>
          {categoryError ? (
            <p className="mt-2 text-xs text-rose-600">{categoryError}</p>
          ) : null}
        </div>
      );
    }
    return (
      <div className={baseStyle}>
        <p className="text-xs uppercase tracking-wide text-slate-500">Eliminar categoría</p>
        {list.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No hay categorías que eliminar.</p>
        ) : (
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
            {list.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{cat.label}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomCategory(type, cat.id)}
                  className="text-xs font-semibold uppercase tracking-wide text-rose-600 hover:text-rose-700"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setCategoryPanel(null)}
            className="text-xs uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  };

  const renderCategoryControls = (type) => {
  const open = categoryMenu?.open && categoryMenu.type === type;

  const palette =
    type === "income"
      ? "border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-400"
      : "border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-400";

 const handlePlusClick = () => {
  if (isPremium) {
    toggleCategoryMenu(type);
    return;
  }

  // Free: abrir modal premium (mismo cartel que el resto)
  triggerPremiumBlock("general"); // o "general" si preferís
};

return (
  <div className="relative">
    <button
      type="button"
      onClick={handlePlusClick}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2",
        palette,
        !isPremium ? "opacity-90" : "",
      ].join(" ")}
      aria-label="Gestionar categorías propias"
    >
      <Plus className="h-4 w-4" />
    </button>

    {/* Menú y panel SOLO para premium */}
    {isPremium && open ? (
      <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 shadow-lg">
        <button
          type="button"
          onClick={() => handleCategoryAction(type, "add")}
          className="w-full rounded-md px-2 py-1 text-left hover:bg-slate-50"
        >
          Agregar categoría propia
        </button>
        <button
          type="button"
          onClick={() => handleCategoryAction(type, "edit")}
          className="w-full rounded-md px-2 py-1 text-left hover:bg-slate-50"
        >
          Modificar categorías
        </button>
        <button
          type="button"
          onClick={() => handleCategoryAction(type, "delete")}
          className="w-full rounded-md px-2 py-1 text-left hover:bg-slate-50"
        >
          Eliminar categoría
        </button>
      </div>
    ) : null}

    {isPremium ? renderCategoryPanel(type) : null}

    {/* ✅ eliminar este aviso */}
    {/* {!isPremium && showPremiumCatsNotice ? (... ) : null} */}
  </div>
);

};


  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      hydratingRef.current = true;
      try {
        const ctx = await getSupabaseSession();
        if (!active) return;
        setSession(ctx);

        let modeValue = modeOverride ?? DEFAULT_ESTIMATION_MODE;
        let hasRemoteMode = false;

        let remote = null;
        if (ctx.supabase && ctx.userId) {
          try {
            remote = await fetchEstimacionEspecifica(ctx.supabase, ctx.userId);
          } catch {
            // ignore remote errors
          }
          if (shouldSyncMode) {
            try {
              modeValue = await fetchEstimationMode(ctx.supabase, ctx.userId);
              hasRemoteMode = true;
            } catch {
              modeValue = DEFAULT_ESTIMATION_MODE;
            }
          }
        }

        let resolvedCustomCategories = null;
        if (ctx.supabase && ctx.userId) {
          try {
            const fetched = await fetchCustomCategories(ctx.supabase, ctx.userId);
            resolvedCustomCategories = normalizeCustomCategoriesPayload(fetched);
            persistCustomCategoriesToStorage(resolvedCustomCategories);
          } catch {
            resolvedCustomCategories = null;
          }
        }

        let cached = null;
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(LS_ESPECIFICA);
            emitDataUpdated();
            if (raw) cached = JSON.parse(raw) ?? null;
          } catch {
            // ignore
          }
        }

        if (!resolvedCustomCategories) {
          resolvedCustomCategories = readCustomCategoriesFromStorage();
        }

        if (!hasRemoteMode && shouldSyncMode && typeof window !== "undefined") {
          try {
            const storedMode = window.localStorage.getItem(MODE_KEY);
            emitDataUpdated();
            if (storedMode === "especifica" || storedMode === "general") {
              modeValue = storedMode;
            }
          } catch {
            // ignore storage errors
          }
        }

const snapshot = {
  id: remote?.id ?? null,
  ingresos: remote?.ingresos ?? cached?.ingresos ?? {},
  egresos: remote?.egresos ?? cached?.egresos ?? {},
saldoInicial: remote?.saldo_inicial ?? cached?.saldoInicial ?? "",
  ahorroMensual: cached?.ahorroMensual ?? cached?.ahorroDeseado ?? "",
  detalles: cached?.detalles ?? null,
  projection: cached?.projection ?? null,
};


        setCustomIncomeCategories(resolvedCustomCategories.ingresos);
        setCustomExpenseCategories(resolvedCustomCategories.egresos);
        applySnapshot(
          snapshot,
          [...BASE_ORDERED_INCOME_CATEGORIES, ...resolvedCustomCategories.ingresos],
          [...BASE_MANUAL_EXPENSE_CATEGORIES, ...resolvedCustomCategories.egresos]
        );
        if (active) {
          if (shouldSyncMode) {
            setActiveMode(modeValue);
          }
          setModeError("");
        }
      } finally {
        hydratingRef.current = false;
        if (active) setLoaded(true);
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, [modeOverride, shouldSyncMode]);

  const prestamosSchedule = useMemo(() => {
    const normalized = preparePrestamosForSeries(estimablesPayload.prestamos);
    return buildInstallmentSeries(normalized, currentMonthKey, monthCount);
  }, [estimablesPayload.prestamos, currentMonthKey, monthCount]);

  const tarjetasSchedule = useMemo(
    () =>
      buildInstallmentSeries(
        estimablesPayload.tarjetas,
        currentMonthKey,
        monthCount
      ),
    [estimablesPayload.tarjetas, currentMonthKey, monthCount]
  );

  const comprasPlanValues = useMemo(
    () =>
      buildPlannedPurchaseSeries(
        estimablesPayload.compras,
        currentMonthKey,
        monthCount
      ),
    [estimablesPayload.compras, currentMonthKey, monthCount]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        monthCount,
        prestamos: prestamosSchedule.series,
        tarjetas: tarjetasSchedule.series,
        compras: comprasPlanValues,
      };
      window.localStorage.setItem(LS_PROJECTION_SERIES, JSON.stringify(payload));
      emitDataUpdated();
    } catch {
      // ignore sync issues
    }
  }, [
    prestamosSchedule.series,
    tarjetasSchedule.series,
    comprasPlanValues,
    monthCount,
  ]);

  const buildSnapshot = () => ({
    id: recordId ?? null,
    ingresos: incomeCategories.reduce((acc, cat) => {
      acc[cat.id] = n(ingresos[cat.id]);
      return acc;
    }, {}),
    egresos: expenseCategories.reduce((acc, cat) => {
      if (cat.source === "estimables") {
        acc[cat.id] =
          cat.id === "prestamos"
            ? estimablesTotals.prestamos
            : cat.id === "tarjetas"
            ? estimablesTotals.tarjetas
            : 0;
      } else if (cat.id === "adquisiciones") {
        acc[cat.id] = n(egresos[cat.id]) + estimablesTotals.comprasMes;
      } else {
        acc[cat.id] = n(egresos[cat.id]);
      }
      return acc;
    }, {}),
    saldoInicial: n(saldoInicial),
    ahorroMensual: n(ahorroMensual),
    detalles: legacyDetalles ?? undefined,
    projection: projection ?? undefined,
  });

  useEffect(() => {
    if (!loaded || hydratingRef.current) return;
    const snapshot = buildSnapshot();
    try {
      window.localStorage.setItem(LS_ESPECIFICA, JSON.stringify(snapshot));
      emitDataUpdated();
    } catch {
      // ignore storage errors
    }
  }, [loaded, ingresos, egresos, saldoInicial, ahorroMensual, recordId, projection, estimablesTotals]);

  useEffect(() => {
    if (!shouldSyncMode || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(MODE_KEY, activeMode);
      emitDataUpdated();
    } catch {
      // ignore storage errors
    }
  }, [activeMode, shouldSyncMode]);

  useEffect(() => {
    if (!loaded) return;
    setDirty(false);
  }, [loaded]);

const ingresosNumbers = useMemo(() => {
  const map: Record<string, number> = {};
  incomeCategories.forEach((cat) => {
    map[cat.id] = n(ingresos[cat.id]);
  });
  return map;
}, [ingresos, incomeCategories]);

const egresosFull = useMemo(() => {
  const map: Record<string, number> = {};
  manualExpenseCategoriesWithCustom.forEach((cat) => {
    let value = n(egresos[cat.id]);
    if (cat.id === "adquisiciones") value += estimablesTotals.comprasMes;
    map[cat.id] = value;
  });
  ESTIMABLE_EXPENSE_CATEGORIES.forEach((cat) => {
    if (cat.source === "estimables") {
      if (cat.id === "prestamos") map[cat.id] = estimablesTotals.prestamos;
      if (cat.id === "tarjetas") map[cat.id] = estimablesTotals.tarjetas;
    }
  });
  return map;
}, [egresos, estimablesTotals, manualExpenseCategoriesWithCustom]);

const totalIngresos = useMemo(
  () => Object.values(ingresosNumbers).reduce((acc: number, value) => acc + value, 0),
  [ingresosNumbers]
);

  const totalEgresos = useMemo(
    () => Object.values(egresosFull).reduce((acc, value) => acc + value, 0),
    [egresosFull]
  );

  const saldoInicialNumber = n(saldoInicial);
  const ahorroMensualNumber = n(ahorroMensual);
  const resultadoMes = totalIngresos - totalEgresos;
  const saldoFinalDisplay = saldoInicialNumber + resultadoMes - ahorroMensualNumber;

  const monthLabels = useMemo(() => buildMonthLabels(monthCount), [monthCount]);

  const projectionData = useMemo(() => {
    const ingresosSeries = incomeCategories.map((cat) =>
      buildSeries(cat, ingresosNumbers[cat.id] ?? 0, projection?.ingresos?.[cat.id], monthCount)
    );
    const egresosSeries = expenseCategories.map((cat) => {
      let baseValue: number | number[] = egresosFull[cat.id] ?? 0;
      if (cat.source === "estimables") {
        if (cat.id === "prestamos") baseValue = prestamosSchedule.series;
        if (cat.id === "tarjetas") baseValue = tarjetasSchedule.series;
      }
      const overrides =
        cat.source === "estimables" ? undefined : projection?.egresos?.[cat.id];
      return buildSeries(cat, baseValue, overrides, monthCount);
    });
    const resumenIngresos = sumSeriesValues(ingresosSeries, monthCount);
    const resumenEgresos = sumSeriesValues(egresosSeries, monthCount);
    const ahorroSeries = buildSeries(
      { id: "ahorro", label: "Ahorro mensual" },
      ahorroMensualNumber,
      projection?.ahorro,
      monthCount
    );
    const resultadoSeries = resumenIngresos.map(
      (value, idx) => value - resumenEgresos[idx]
    );
    const saldoSeries = [];
    let saldoPrev = saldoInicialNumber;
    for (let i = 0; i < monthCount; i++) {
      const saldoMes = saldoPrev + resultadoSeries[i] - ahorroSeries.values[i];
      saldoSeries.push(saldoMes);
      saldoPrev = saldoMes;
    }
    return {
      ingresosSeries,
      egresosSeries,
      resumen: {
        ingresos: resumenIngresos,
        egresos: resumenEgresos,
        resultado: resultadoSeries,
        ahorro: ahorroSeries.values,
        saldo: saldoSeries,
      },
    };
  }, [
    ingresosNumbers,
    egresosFull,
    projection,
    ahorroMensualNumber,
    saldoInicialNumber,
    incomeCategories,
    expenseCategories,
    prestamosSchedule,
    tarjetasSchedule,
    monthCount,
  ]);

  const incomeSeriesMap = useMemo(() => {
    const map = new Map();
    projectionData.ingresosSeries.forEach((row) => map.set(row.id, row.values));
    return map;
  }, [projectionData.ingresosSeries]);

  const expenseSeriesMap = useMemo(() => {
    const map = new Map();
    projectionData.egresosSeries.forEach((row) => map.set(row.id, row.values));
    return map;
  }, [projectionData.egresosSeries]);

  const saldoInicialRow = useMemo(() => {
    return monthLabels.map((_, idx) => {
      if (idx === 0) return saldoInicialNumber;
      return projectionData.resumen.saldo[idx - 1] ?? 0;
    });
  }, [monthLabels, saldoInicialNumber, projectionData.resumen.saldo]);

  const resumenAcumulado = useMemo(() => {
    const ahorroTotal = projectionData.resumen.ahorro.reduce(
      (acc, value) => acc + (Number.isFinite(value) ? value : 0),
      0
    );
    const saldoFinal =
      projectionData.resumen.saldo.length > 0
        ? projectionData.resumen.saldo[projectionData.resumen.saldo.length - 1]
        : saldoInicialNumber;
    return { ahorroTotal, saldoFinal };
  }, [projectionData.resumen.ahorro, projectionData.resumen.saldo, saldoInicialNumber]);

  const handleExportCsv = () => {
    if (typeof window === "undefined") return;
    if (!isPremium) {
      triggerPremiumBlock("export");
      return;
    }
    const rows = [];
    const safeNumber = (value) =>
      Number.isFinite(value) ? Number(value) : 0;
    rows.push(["Concepto", ...monthLabels]);
    rows.push(["Saldo inicial", ...saldoInicialRow.map((value) => safeNumber(value))]);
    rows.push(["Ingresos", ...projectionData.resumen.ingresos.map((value) => safeNumber(value))]);
    incomeCategories.forEach((cat) => {
      const values = incomeSeriesMap.get(cat.id) ?? Array(monthLabels.length).fill(0);
      rows.push([cat.label, ...values.map((value) => safeNumber(value))]);
    });
    rows.push(["Egresos", ...projectionData.resumen.egresos.map((value) => safeNumber(value))]);
    expenseCategories.forEach((cat) => {
      const values = expenseSeriesMap.get(cat.id) ?? Array(monthLabels.length).fill(0);
      rows.push([cat.label, ...values.map((value) => safeNumber(value))]);
    });
    rows.push(["Compras planificadas", ...comprasPlanValues.map((value) => safeNumber(value))]);
    rows.push(["Ahorro", ...projectionData.resumen.ahorro.map((value) => safeNumber(value))]);
    rows.push(["Saldo final", ...projectionData.resumen.saldo.map((value) => safeNumber(value))]);

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const normalized = String(cell ?? "").replace(/"/g, '""');
            return `"${normalized}"`;
          })
          .join(";")
      )
      .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "estimacion-especifica.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleModeToggle = async () => {
    if (!shouldSyncMode) return;
    const previousMode = activeMode;
    const nextMode = previousMode === "especifica" ? "general" : "especifica";
    setActiveMode(nextMode);
    setModeError("");

    const notify = () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("miadmi:data-updated"));
      }
    };

    if (session.supabase && session.userId) {
      setModeSaving(true);
      try {
        const confirmed = await saveEstimationMode(
          session.supabase,
          session.userId,
          nextMode
        );
        setActiveMode(confirmed);
        notify();
      } catch (err) {
        setActiveMode(previousMode);
        const message =
          err?.message ?? "No se pudo actualizar el estado. Intenta nuevamente.";
        setModeError(message);
      } finally {
        setModeSaving(false);
      }
    } else {
      notify();
    }
  };

  const handleSave = async () => {
    if (!loaded) return;
    setSaving(true);
    setSaveError("");
    try {
      const snapshot = buildSnapshot();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_ESPECIFICA, JSON.stringify(snapshot));
        emitDataUpdated();
      }
      const ctx = await ensureSupabaseCtx();
      if (ctx.supabase && ctx.userId) {
  const newId = await upsertEstimacionEspecifica(ctx.supabase, ctx.userId, {
  id: snapshot.id,
  ingresos: snapshot.ingresos,
  egresos: snapshot.egresos,
  saldo_inicial: snapshot.saldoInicial,
});

        setRecordId(newId ?? snapshot.id ?? null);
      }
      setDirty(false);
      setSaveSuccess(
        session.userId ? "Cambios guardados en la nube." : "Cambios guardados en este dispositivo."
      );
      // HISTORIAL: este flujo termina llamando a upsertEstimacionEspecifica (guarda estado + snapshot mensual)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("miadmi:data-updated"));
      }
    } catch (error) {
      console.error(error);
      setSaveError("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = loaded && dirty && !saving;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Estimación avanzada
          </h1>
          <p className="text-sm text-white/80 md:text-base">
            Trabajá tus ingresos y egresos puntuales, revisá la proyección y haz ajustes premium cuando lo necesites.
          </p>
          {!isActive ? (
            <p className="mt-2 text-sm text-amber-100/90">
              Esta estimación no se incluye en Inicio hasta volver a activarla.
            </p>
          ) : null}
        </div>
        {hideModeToggle || !shouldSyncMode ? null : (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className="text-xs uppercase tracking-wide text-white/70">Incluir en Inicio</span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={handleModeToggle}
              disabled={modeSaving}
              className={[
                "relative inline-flex h-8 w-16 items-center rounded-full border px-1 transition focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-slate-800",
                isActive ? "border-emerald-300 bg-emerald-500/90" : "border-white/40 bg-white/30",
                modeSaving ? "cursor-wait opacity-70" : "cursor-pointer hover:brightness-105",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-6 w-6 transform rounded-full bg-white shadow transition",
                  isActive ? "translate-x-8" : "translate-x-0",
                ].join(" ")}
              />
              <span
                className={[
                  "absolute left-2 text-[11px] font-semibold uppercase tracking-wide",
                  isActive ? "text-white" : "text-white/50",
                ].join(" ")}
              >
                on
              </span>
              <span
                className={[
                  "absolute right-2 text-[11px] font-semibold uppercase tracking-wide",
                  !isActive ? "text-white" : "text-white/50",
                ].join(" ")}
              >
                off
              </span>
            </button>
            {modeSaving ? (
              <span className="text-[11px] text-white/70">Actualizando modo...</span>
            ) : null}
            {modeError ? (
              <span className="text-[11px] text-rose-200">{modeError}</span>
            ) : null}
          </div>
        )}
      </header>

      <section>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sky-900 shadow-sm">
          <p className="text-base font-semibold">Saldo inicial del mes</p>
          <p className="text-xs text-sky-700">Cuánto traes del mes anterior.</p>
          <input
            className="mt-3 w-full rounded border border-sky-200 bg-white px-3 py-2 text-right text-sm outline-none transition focus:border-sky-400"
            value={saldoInicial}
            onChange={(e) => {
              setSaldoInicial(e.target.value);
              markDirty();
            }}
            inputMode="decimal"
            placeholder="0"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-emerald-900 shadow">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold md:text-xl">Ingresos</h2>
              <p className="text-sm text-emerald-700">Distribuí los ingresos según su origen.</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <div className="text-right">
                <p className="text-xs font-medium text-emerald-700">Total</p>
                <p className="text-lg font-semibold tabular-nums">{formatUYU(totalIngresos)}</p>
              </div>
              {renderCategoryControls("income")}
            </div>
          </div>
          <ul className="space-y-3">
            {incomeCategories.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white/70 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-emerald-900">{cat.label}</p>
                </div>
                <input
                  className="w-28 rounded border border-emerald-200 bg-white px-3 py-1.5 text-right text-sm text-emerald-900 outline-none transition focus:border-emerald-400"
                  value={ingresos[cat.id]}
                  onChange={(e) => {
                    setIngresos((prev) => ({ ...prev, [cat.id]: e.target.value }));
                    clearProjectionOverrides("ingresos", cat.id);
                    markDirty();
                  }}
                  inputMode="decimal"
                  placeholder="0"
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-rose-900 shadow">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold md:text-xl">Egresos</h2>
              <p className="text-sm text-rose-700">Distribuí los egresos según su origen.</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <div className="text-right">
                <p className="text-xs font-medium text-rose-700">Total</p>
                <p className="text-lg font-semibold tabular-nums">{formatUYU(totalEgresos)}</p>
              </div>
              {renderCategoryControls("expense")}
            </div>
          </div>
          <ul className="space-y-3">
            {expenseCategories.map((cat) => {
              const isEstimable = cat.source === "estimables";
              let helper = null;
              if (cat.id === "adquisiciones" && estimablesTotals.comprasMes > 0) {
                helper = `Incluye ${formatUYU(estimablesTotals.comprasMes)} en compras del mes.`;
              }
              return (
                <li
                  key={cat.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-white/70 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-rose-900">{cat.label}</p>
                    {helper ? <p className="text-xs text-rose-600">{helper}</p> : null}
                  </div>
                  {isEstimable ? (
                    <p className="text-base font-semibold tabular-nums">
                      {formatUYU(
                        cat.id === "prestamos"
                          ? estimablesTotals.prestamos
                          : cat.id === "tarjetas"
                          ? estimablesTotals.tarjetas
                          : 0
                      )}
                    </p>
                  ) : (
                    <input
                      className="w-28 rounded border border-rose-200 bg-white px-3 py-1.5 text-right text-sm text-rose-900 outline-none transition focus:border-rose-400"
                      value={egresos[cat.id] ?? ""}
                      onChange={(e) => {
                        setEgresos((prev) => ({ ...prev, [cat.id]: e.target.value }));
                        clearProjectionOverrides("egresos", cat.id);
                        markDirty();
                      }}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-900 shadow flex h-full items-center justify-between">
          <div>
            <p className="text-base font-semibold">Resultado de mes</p>
            <p className="text-xs text-emerald-700">Ingresos - Egresos.</p>
          </div>
          <p
            className={[
              "text-2xl font-semibold tabular-nums",
              resultadoMes >= 0 ? "text-emerald-700" : "text-rose-600",
            ].join(" ")}
          >
            {formatUYU(resultadoMes)}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sky-900 shadow">
          <p className="text-base font-semibold">Ahorro mensual</p>
          <p className="text-xs text-sky-700">Cuánto querés reservar cada mes.</p>
          <input
            className="mt-3 w-full rounded border border-sky-200 bg-white px-3 py-2 text-right text-sm outline-none transition focus:border-sky-400"
            value={ahorroMensual}
            onChange={(e) => {
              setAhorroMensual(e.target.value);
              clearProjectionOverrides("ahorro");
              markDirty();
            }}
            inputMode="decimal"
            placeholder="0"
          />
          <p className="mt-2 text-xs text-sky-600">
            Podés ahorrar hasta <span className="font-semibold">{formatUYU(saldoFinalDisplay)}</span> este mes.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-900 shadow flex flex-col justify-between gap-3">
          <div>
            <p className="text-base font-semibold">Egresos estimables</p>
            <p className="text-xs text-emerald-700">Accedé al detalle de préstamos, tarjetas y compras planificadas.</p>
          </div>
          <Link
            href="/estimacion/egresos-estimables"
            className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100 hover:border-emerald-300"
          >
            Ir a egresos estimables
          </Link>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-4 text-slate-900 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 md:text-xl">Proyección</h2>
          </div>
        <div
          id="estim-specific-adjust"
          className={[
            "flex items-center flex-wrap gap-2",
            highlightSpecificAdjust
              ? "relative z-40 rounded-2xl ring-4 ring-emerald-300/80 ring-offset-2 ring-offset-white shadow-xl shadow-emerald-500/40"
              : "",
          ].join(" ")}
        >
            <button
              type="button"
              onClick={() => {
                if (!isPremium) {
                  triggerPremiumBlock("export");
                  return;
                }
                handleExportCsv();
              }}
              className={[
                "inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                isPremium
                  ? "border-sky-200 bg-sky-100 text-sky-800 hover:bg-sky-200"
                  : "border-sky-200 bg-sky-100 text-sky-800 hover:bg-sky-200",
              ].join(" ")}
              aria-disabled={!isPremium}
            >
              Exportar CSV
            </button>
         <button
  type="button"
  onClick={() => {
    if (!isPremium) {
      triggerPremiumBlock("adjustments");
      return;
    }
    // premium: ir a la pantalla de ajustes
    window.location.href = "/estimacion/especifica/ajustes";
  }}
  className={[
    "inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold transition",
    isPremium
      ? "border-sky-200 bg-white text-sky-800 hover:bg-sky-100"
      : "border-sky-200 bg-white/80 text-sky-600 hover:bg-white",
  ].join(" ")}
>
  Hacer ajustes
</button>

        </div>
        </div>

<div className="w-full overflow-x-auto overflow-y-visible rounded-xl border border-slate-100 pb-2">
  <div className="min-w-[980px]">
  <table className="min-w-max w-full table-auto border-collapse text-sm whitespace-nowrap">
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
              <tr className="bg-blue-100 text-blue-900 font-semibold">
                <td className="px-3 py-2">Saldo mes pasado</td>
                {monthLabels.map((_, idx) => (
                  <td key={`saldo-inicial-${idx}`} className="px-3 py-2 text-right">
                    <span className="tabular-nums">{formatUYU(saldoInicialRow[idx])}</span>
                  </td>
                ))}
              </tr>

              <tr className="bg-emerald-300 text-emerald-950 font-semibold uppercase tracking-wide">
                <td className="px-3 py-2">Ingresos</td>
                {projectionData.resumen.ingresos.map((value, idx) => (
                  <td key={`ingresos-total-${idx}`} className="px-3 py-2 text-right">
                    {formatUYU(value)}
                  </td>
                ))}
              </tr>

              {incomeCategories.map((cat) => {
                const values = incomeSeriesMap.get(cat.id) ?? Array(monthLabels.length).fill(0);
                return (
                  <tr key={cat.id} className="bg-emerald-100">
                    <td className="px-3 py-2 text-sm font-medium text-emerald-900">{cat.label}</td>
                    {monthLabels.map((_, idx) => (
                      <td key={`${cat.id}-${idx}`} className="px-3 py-2 text-right">
                        <span className="tabular-nums">{formatUYU(values[idx] ?? 0)}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}

              <tr className="bg-rose-300 text-rose-950 font-semibold uppercase tracking-wide">
                <td className="px-3 py-2">Egresos</td>
                {projectionData.resumen.egresos.map((value, idx) => (
                  <td key={`egresos-total-${idx}`} className="px-3 py-2 text-right">
                    {formatUYU(value)}
                  </td>
                ))}
              </tr>

              {expenseCategories.map((cat) => {
                const values = expenseSeriesMap.get(cat.id) ?? Array(monthLabels.length).fill(0);
                return (
                  <tr key={cat.id} className="bg-rose-100">
                    <td className="px-3 py-2 text-sm font-medium text-rose-900">{cat.label}</td>
                    {monthLabels.map((_, idx) => (
                      <td key={`${cat.id}-${idx}`} className="px-3 py-2 text-right">
                        <span className="tabular-nums">{formatUYU(values[idx] ?? 0)}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}

              <tr className="bg-rose-100">
                <td className="px-3 py-2 text-sm font-medium text-rose-900">Compras planificadas</td>
                {monthLabels.map((_, idx) => (
                  <td key={`compras-plan-${idx}`} className="px-3 py-2 text-right">
                    <span className="tabular-nums">{formatUYU(comprasPlanValues[idx] ?? 0)}</span>
                  </td>
                ))}
              </tr>

              <tr className="bg-blue-50 text-blue-900 font-semibold">
                <td className="px-3 py-2">Ahorro</td>
                {monthLabels.map((_, idx) => (
                  <td key={`ahorro-row-${idx}`} className="px-3 py-2 text-right">
                    <span className="tabular-nums">
                      {formatUYU(projectionData.resumen.ahorro[idx] ?? 0)}
                    </span>
                  </td>
                ))}
              </tr>

              <tr className="bg-blue-100 text-blue-950 font-semibold uppercase tracking-wide">
                <td className="px-3 py-2">Saldo final</td>
                {projectionData.resumen.saldo.map((value, idx) => (
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
        </div>
        

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
          <p className="text-lg font-semibold">Ahorro acumulado</p>
          <p className="text-2xl font-semibold">{formatUYU(resumenAcumulado.ahorroTotal)}</p>
          <div>
        <Link
          href="/estimacion/ahorros"
          className="mt-4 inline-flex items-center justify-center rounded-full border border-blue-400 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 transition hover:border-white/40 hover:bg-white/10"
        >
          Ver detalle de ahorros
        </Link>
      </div>
        </div>
      </section>

      

      <div className="sticky bottom-0 left-0 right-0 mt-6 flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          {!loaded
            ? "Cargando datos..."
            : dirty
            ? "Tienes cambios sin guardar."
            : saveSuccess
            ? saveSuccess
            : "Últimos cambios guardados."}
          {saveError ? <span className="ml-2 text-rose-600">{saveError}</span> : null}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={[
            "inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition",
            canSave
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "cursor-not-allowed bg-slate-300 text-slate-600",
          ].join(" ")}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function buildEmptyState(categories) {
  return categories.reduce((acc, cat) => {
    acc[cat.id] = "";
    return acc;
  }, {});
}

function buildStateFromSnapshot(categories, source) {
  const next = buildEmptyState(categories);
  if (!source || typeof source !== "object") return next;
  categories.forEach((cat) => {
    const value = source[cat.id];
    if (value !== undefined && value !== null) {
      next[cat.id] = String(value);
    }
  });
  return next;
}

function buildSeries(cat, baseValue, overrides, length) {
  const list = overrides ? ensureMonthArray(overrides, length) : null;
  const baseList = Array.isArray(baseValue)
    ? ensureMonthArray(baseValue, length).map((item) => n(item))
    : null;
  const numericBase = Number.isFinite(baseValue) ? Number(baseValue) : null;
  return {
    id: cat.id,
    label: cat.label,
    values: Array.from({ length }, (_, idx) => {
      if (list && list[idx] !== "") return n(list[idx]);
      if (baseList) return baseList[idx] ?? 0;
      if (Number.isFinite(numericBase)) return numericBase;
      return 0;
    }),
  };
}

function sumSeriesValues(series, length) {
  return Array.from({ length }, (_, idx) =>
    series.reduce((acc, row) => acc + (row.values[idx] ?? 0), 0)
  );
}

function preparePrestamosForSeries(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ensurePrestamoForSeries(item));
}

function ensurePrestamoForSeries(item) {
  if (!item) return item;
  const cuotasValue = Math.max(0, Math.round(n(item.cuotas)));
  if (cuotasValue > 0) {
    return { ...item, cuotas: cuotasValue };
  }
  const diff = monthDiff(item?.mesInicio, item?.mesFin);
  if (diff >= 0) {
    return { ...item, cuotas: diff + 1 };
  }
  return item;
}

function n(value) {
  const numeric = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatUYU(value) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value || 0);
}
