"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarCheck,
  Coins,
  Crown,
  HandCoins,
  Lock,
  Medal,
  PiggyBank,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";
import {
  buildInstallmentSeries,
  getCurrentMonthKey,
} from "../../lib/installments";
import { ObjetivosLogrosOnboardingTour } from "../../components/onboarding/ObjetivosLogrosOnboardingTour";

const LS_GEN = "miadmi:estimacion_general";
const LS_ESP = "miadmi:estimacion_especifica";
const LS_ESTIMABLES = "miadmi:egresos_estimables";
const LS_CTRL = "miadmi:control_mensual";
const MODE_KEY = "miadmi:estimacion_mode";
const ACHIEVEMENTS_PER_PAGE = 12;

const DEFAULT_GOAL_POOL = [
  { key: strip("supermercado"), label: "Supermercado", limit: 7000 },
  { key: strip("salidas"), label: "Salidas", limit: 4000 },
  { key: strip("transporte"), label: "Transporte", limit: 3500 },
  { key: strip("servicios"), label: "Servicios fijos", limit: 4500 },
  { key: strip("entretenimiento"), label: "Entretenimiento", limit: 2500 },
  { key: strip("tarjetas"), label: "Tarjetas", limit: 5000 },
];

const GOAL_LEVELS = [
  {
    id: "focus",
    difficulty: "facil",
    label: "Facil",
    multiplier: 0.95,
    badgeClass: "bg-emerald-100 text-emerald-700",
    accentClass: "text-emerald-600",
    progressClass: "bg-emerald-500",
    fallbackLimit: 4500,
    fallbackLabel: "Compras basicas",
    description: "Reduci un 5% los gastos de {category}.",
  },
  {
    id: "steady",
    difficulty: "media",
    label: "Media",
    multiplier: 0.9,
    badgeClass: "bg-amber-100 text-amber-700",
    accentClass: "text-amber-600",
    progressClass: "bg-amber-500",
    fallbackLimit: 5200,
    fallbackLabel: "Gastos variables",
    description: "Baja al menos 10% tu gasto en {category}.",
  },
  {
    id: "expert",
    difficulty: "dificil",
    label: "Dificil",
    multiplier: 0.8,
    badgeClass: "bg-rose-100 text-rose-700",
    accentClass: "text-rose-600",
    progressClass: "bg-rose-500",
    fallbackLimit: 6000,
    fallbackLabel: "Gastos premium",
    description: "Reta tu presupuesto y gasta solo 80% en {category}.",
  },
];

const ACHIEVEMENT_LIBRARY = [
  {
    id: "save-500",
    tier: "Bronce I",
    icon: PiggyBank,
    title: "Primer colchon",
    description: "Ahorra al menos 500 UYU este mes.",
    condition: (ctx) => ctx.savings >= 500,
  },
  {
    id: "save-1000",
    tier: "Bronce II",
    icon: PiggyBank,
    title: "Chanchito feliz",
    description: "Guarda 1.000 UYU antes de fin de mes.",
    condition: (ctx) => ctx.savings >= 1000,
  },
  {
    id: "save-3000",
    tier: "Bronce III",
    icon: Coins,
    title: "Reserva basica",
    description: "Acumula 3.000 UYU de saldo positivo este mes.",
    condition: (ctx) => ctx.savings >= 3000,
  },
  {
    id: "save-6000",
    tier: "Bronce IV",
    icon: HandCoins,
    title: "Dos sueldos adelante",
    description: "Termina el mes con mas de 6.000 UYU libres.",
    condition: (ctx) => ctx.savings >= 6000,
  },
  {
    id: "save-10000",
    tier: "Bronce V",
    icon: Crown,
    title: "Fondo de tranquilidad",
    description: "Alcanza un ahorro mensual de 10.000 UYU.",
    condition: (ctx) => ctx.savings >= 10000,
  },
  {
    id: "balance-positive",
    tier: "Plata I",
    icon: TrendingUp,
    title: "Balance en verde",
    description: "Gasta menos de lo que ingreso este mes.",
    condition: (ctx) => ctx.savings > 0,
  },
  {
    id: "balance-5",
    tier: "Plata II",
    icon: TrendingUp,
    title: "5% de margen",
    description: "Manten un balance positivo del 5% o mas este mes.",
    condition: (ctx) => ctx.balancePct >= 5,
  },
  {
    id: "balance-10",
    tier: "Plata III",
    icon: TrendingUp,
    title: "10% de respiro",
    description: "Logra que tu balance supere el 10% este mes.",
    condition: (ctx) => ctx.balancePct >= 10,
  },
  {
    id: "balance-20",
    tier: "Plata IV",
    icon: TrendingUp,
    title: "Ahorro inteligente",
    description: "Cierra el mes con mas del 20% de tus ingresos este mes.",
    condition: (ctx) => ctx.balancePct >= 20,
  },
  {
    id: "balance-30",
    tier: "Plata V",
    icon: TrendingUp,
    title: "Maquina de ahorro",
    description: "Sostene un balance del 30% o mas este mes.",
    condition: (ctx) => ctx.balancePct >= 30,
  },
  {
    id: "balance-40",
    tier: "Plata VI",
    icon: TrendingUp,
    title: "Modo leyenda",
    description: "Guarda el 40% de tus ingresos mensuales este mes.",
    condition: (ctx) => ctx.balancePct >= 40,
  },
  {
    id: "goal-one",
    tier: "Mision I",
    icon: Target,
    title: "Primer objetivo",
    description: "Completa al menos una mision mensual.",
    condition: (ctx) => ctx.goalsCompleted >= 1,
  },
  {
    id: "goal-two",
    tier: "Mision II",
    icon: Target,
    title: "Combo doble",
    description: "Cumple dos misiones del mes.",
    condition: (ctx) => ctx.goalsCompleted >= 2,
  },
  {
    id: "goal-full",
    tier: "Mision III",
    icon: Target,
    title: "Trifecta perfecta",
    description: "Completa las tres misiones activas.",
    condition: (ctx) => ctx.goalsCompleted >= 3,
  },
  {
    id: "goal-hard",
    tier: "Mision Pro",
    icon: Medal,
    title: "Experto ON",
    description: "Supera la mision de dificultad dificil.",
    condition: (ctx) => ctx.hardGoalCompleted,
  },
  {
    id: "goal-savings",
    tier: "Mision Elite",
    icon: Award,
    title: "Ahorro disciplinado",
    description: "Ahorra al menos 4.000 UYU comparado con tus presupuestos.",
    condition: (ctx) => ctx.goalSavings >= 4000,
  },
  {
    id: "activity-5",
    tier: "Habito I",
    icon: CalendarCheck,
    title: "Registro constante",
    description: "Carga al menos 5 movimientos este mes.",
    condition: (ctx) => ctx.movCount >= 5,
  },
  {
    id: "activity-10",
    tier: "Habito II",
    icon: CalendarCheck,
    title: "Rutina financiera",
    description: "Carga al menos 10 movimientos este mes.",
    condition: (ctx) => ctx.movCount >= 10,
  },
  {
    id: "activity-20",
    tier: "Habito III",
    icon: CalendarCheck,
    title: "Flow semanal",
    description: "Registra 20 movimientos o mas este mes.",
    condition: (ctx) => ctx.movCount >= 20,
  },
  {
    id: "activity-40",
    tier: "Habito IV",
    icon: CalendarCheck,
    title: "Modo tracker",
    description: "Registra 40 movimientos este mes.",
    condition: (ctx) => ctx.movCount >= 40,
  },
  {
    id: "activity-60",
    tier: "Habito V",
    icon: CalendarCheck,
    title: "Arquitecto de datos",
    description: "Alcanza 60 movimientos registrados este mes.",
    condition: (ctx) => ctx.movCount >= 60,
  },
  {
    id: "debt-10k",
    tier: "Blindaje I",
    icon: ShieldCheck,
    title: "Cuotas controladas",
    description: "Mantene tus cuotas totales de este mes por debajo de 10.000 UYU.",
    condition: (ctx) => ctx.debtLoad <= 10000,
  },
  {
    id: "debt-5k",
    tier: "Blindaje II",
    icon: ShieldCheck,
    title: "Deuda ligera",
    description: "Reduce tus cuotas totales de este mes a menos de 5.000 UYU.",
    condition: (ctx) => ctx.debtLoad > 0 && ctx.debtLoad <= 5000,
  },
  {
    id: "debt-2k",
    tier: "Blindaje III",
    icon: ShieldCheck,
    title: "Ultimos pasos",
    description: "Lleva tus cuotas totales de este mes por debajo de 2.000 UYU.",
    condition: (ctx) => ctx.debtLoad > 0 && ctx.debtLoad <= 2000,
  },
  {
    id: "debt-free",
    tier: "Blindaje IV",
    icon: ShieldCheck,
    title: "Libre de cuotas",
    description: "No tener cuotas activas este mes.",
    condition: (ctx) => ctx.debtLoad === 0,
  },
  {
    id: "purchase-guard",
    tier: "Compras I",
    icon: ShoppingBag,
    title: "Compras bajo control",
    description: "Mantene tus compras planificadas de este mes debajo de 5.000 UYU.",
    condition: (ctx) => ctx.purchaseLoad <= 5000,
  },
  {
    id: "purchase-zero",
    tier: "Compras II",
    icon: ShoppingBag,
    title: "Sin tentaciones",
    description: "No tener compras planificadas para este mes.",
    condition: (ctx) => ctx.purchaseLoad === 0,
  },
  {
    id: "income-20k",
    tier: "Potencia I",
    icon: Wallet,
    title: "Ingresos solidos",
    description: "Registrar ingresos este mes mayores a 20.000 UYU.",
    condition: (ctx) => ctx.ingresos >= 20000,
  },
  {
    id: "income-40k",
    tier: "Potencia II",
    icon: Wallet,
    title: "Motor financiero",
    description: "Superar los 40.000 UYU de ingresos este mes.",
    condition: (ctx) => ctx.ingresos >= 40000,
  },
  {
    id: "income-60k",
    tier: "Potencia III",
    icon: Wallet,
    title: "Estratega senior",
    description: "Mantener ingresos por encima de 60.000 UYU este mes.",
    condition: (ctx) => ctx.ingresos >= 60000,
  },
];
export default function ObjetivosLogrosPage() {
  const [general, setGeneral] = useState(null);
  const [especifica, setEspecifica] = useState(null);
  const [estimables, setEstimables] = useState(() => normalizeEstimables(null));
  const [ctrl, setCtrl] = useState(null);
  const [activeMode, setActiveMode] = useState("general");
  const [achPage, setAchPage] = useState(0);
  const [selectedAchievementId, setSelectedAchievementId] = useState(null);
  const [showTour, setShowTour] = useState(false);

  const refreshLocalData = useCallback(() => {
    if (typeof window === "undefined") return;
    setGeneral(readStorageJSON(LS_GEN));
    setEspecifica(readStorageJSON(LS_ESP));
    setEstimables(normalizeEstimables(readStorageJSON(LS_ESTIMABLES)));
    setCtrl(readStorageJSON(LS_CTRL));
    const storedMode = window.localStorage.getItem(MODE_KEY);
    setActiveMode(storedMode === "especifica" ? "especifica" : "general");
  }, []);

  useEffect(() => {
    refreshLocalData();
    if (typeof window === "undefined") return;
    const handler = () => refreshLocalData();
    window.addEventListener("storage", handler);
    window.addEventListener("miadmi:data-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("miadmi:data-updated", handler);
    };
  }, [refreshLocalData]);

  useEffect(() => {
  if (typeof window === "undefined") return;

  const key = "miadmi:tour-objetivos-logros";

  try {
    const stored = window.localStorage.getItem(key);

    if (!stored) {
      // primera vez que entra
      window.localStorage.setItem(key, "pending");
    }

    if (window.localStorage.getItem(key) === "pending") {
      setShowTour(true);
      window.localStorage.setItem(key, "done");
    }
  } catch {
    // ignore storage issues
  }
}, []);

  const generalIngresos = useMemo(
    () => n(general?.sueldos) + n(general?.otrosIngresos),
    [general]
  );
  const generalEgresosList = Array.isArray(general?.egresos) ? general.egresos : [];
  const generalEgresos = useMemo(
    () => generalEgresosList.reduce((acc, entry) => acc + n(entry?.monto), 0),
    [generalEgresosList]
  );

  const ingresosEsp = useMemo(() => {
    if (!especifica?.ingresos) return 0;
    if (Array.isArray(especifica.ingresos)) {
      return especifica.ingresos.reduce((acc, entry) => acc + n(entry?.monto), 0);
    }
    return Object.values(especifica.ingresos).reduce((acc, value) => acc + n(value), 0);
  }, [especifica]);

  const egrosObjEsp = useMemo(() => {
    if (especifica?.egresos && typeof especifica.egresos === "object") {
      return especifica.egresos;
    }
    if (
      especifica &&
      !especifica.ingresos &&
      !especifica.egresos &&
      typeof especifica === "object"
    ) {
      return especifica;
    }
    return {};
  }, [especifica]);

  const egresosEsp = useMemo(
    () => Object.values(egrosObjEsp).reduce((acc, value) => acc + n(value), 0),
    [egrosObjEsp]
  );

  const currentMonthKey = getCurrentMonthKey();

  const prestamosSchedule = useMemo(
    () => buildInstallmentSeries(estimables.prestamos, currentMonthKey),
    [estimables.prestamos, currentMonthKey]
  );
  const tarjetasSchedule = useMemo(
    () => buildInstallmentSeries(estimables.tarjetas, currentMonthKey),
    [estimables.tarjetas, currentMonthKey]
  );

  const totalPrestamos = prestamosSchedule.currentTotal;
  const totalTarjetas = tarjetasSchedule.currentTotal;
  const totalComprasMes = useMemo(
    () =>
      estimables.compras.reduce(
        (acc, compra) =>
          acc + (String(compra?.mes || "").startsWith(currentMonthKey) ? n(compra?.valor) : 0),
        0
      ),
    [estimables.compras, currentMonthKey]
  );

  const espKeys = useMemo(() => Object.keys(egrosObjEsp || {}), [egrosObjEsp]);
  const hasPrest = espKeys.some((key) => keyEquals(key, "prestamos"));
  const hasTarj = espKeys.some((key) => keyEquals(key, "tarjetas"));
  const hasComp = espKeys.some((key) => keyEquals(key, "posibles compras"));

  const effPrest = hasPrest ? 0 : totalPrestamos;
  const effTarj = hasTarj ? 0 : totalTarjetas;
  const effComp = hasComp ? 0 : totalComprasMes;

  const ingresosBase = activeMode === "especifica" ? ingresosEsp : generalIngresos;
  const egresosBase = activeMode === "especifica" ? egresosEsp : generalEgresos;

  const ingresos = Math.max(0, ingresosBase);
  const egresos = Math.max(0, egresosBase + effPrest + effTarj + effComp);
  const saldo = ingresos - egresos;
  const balancePct = ingresos > 0 ? Math.round(((ingresos - egresos) / ingresos) * 1000) / 10 : 0;
  const hasFinData = ingresos > 0 || egresos > 0;

  const balanceMood = useMemo(() => {
    if (!hasFinData) {
      return {
        label: "Sin datos",
        badge: "bg-slate-200 text-slate-600",
        card: "border-slate-200 bg-white",
          hint: "Carga al menos una estimacion para ver el balance de este mes.",
      };
    }
    if (balancePct >= 15) {
      return {
        label: "Saludable",
        badge: "bg-emerald-200 text-emerald-800",
        card: "border-emerald-200 bg-emerald-50",
          hint: "Estas generando ahorro real este mes. Aprovecha para adelantar objetivos si queres.",
      };
    }
    if (balancePct >= 0) {
      return {
        label: "Vigilado",
        badge: "bg-amber-200 text-amber-800",
        card: "border-amber-200 bg-amber-50",
          hint: "Vas justo este mes, controla los gastos hormiga y variables.",
      };
    }
    return {
      label: "En rojo",
      badge: "bg-rose-200 text-rose-800",
      card: "border-rose-200 bg-rose-50",
          hint: "Tus egresos superan los ingresos este mes. Proba ajustar al menos una categoria para mejorar el siguiente.",
    };
  }, [balancePct, hasFinData]);

  const sourceLabel = activeMode === "especifica" ? "Estimacion especifica" : "Estimacion general";

  const movsMes = useMemo(() => {
    if (!Array.isArray(ctrl?.movimientos)) return [];
    return ctrl.movimientos.filter((mov) =>
      String(mov?.fecha || "").startsWith(currentMonthKey)
    );
  }, [ctrl, currentMonthKey]);

  const movsMesEgresos = useMemo(
    () =>
      movsMes.filter((mov) => String(mov?.tipo || "egreso").toLowerCase() !== "ingreso"),
    [movsMes]
  );

  const spentByCategory = useMemo(() => {
    const map = new Map();
    movsMesEgresos.forEach((mov) => {
      const key = strip(mov?.categoria || "otros");
      map.set(key, (map.get(key) || 0) + n(mov?.monto));
    });
    return map;
  }, [movsMesEgresos]);

  const budgetsPool = useMemo(() => {
    if (activeMode === "especifica") {
      return Object.entries(egrosObjEsp || {})
        .map(([key, value]) => ({
          key: strip(key),
          label: titleCase(key),
          limit: n(value),
        }))
        .filter((entry) => entry.limit > 0);
    }
    return generalEgresosList
      .map((entry) => {
        const label = titleCase(entry?.nombre || entry?.id || "Categoria");
        return {
          key: strip(entry?.id || entry?.nombre || label),
          label,
          limit: n(entry?.monto),
        };
      })
      .filter((entry) => entry.limit > 0);
  }, [activeMode, egrosObjEsp, generalEgresosList]);

  const monthlyGoals = useMemo(() => {
    const pool = budgetsPool.length ? budgetsPool : DEFAULT_GOAL_POOL;
    if (!pool.length) return [];
    const fallbackSource = pool[0];
    const monthSeed = Number(currentMonthKey.replace("-", "")) || 0;
    const rotated = rotateArray(pool, monthSeed % pool.length);
    const sizedPool = Array.from({ length: GOAL_LEVELS.length }, (_, idx) => rotated[idx % rotated.length]);
    return GOAL_LEVELS.map((level, idx) => {
      const source = sizedPool[idx] ?? fallbackSource;
      const limit = source?.limit > 0 ? source.limit : level.fallbackLimit;
      const allowed = Math.max(0, Math.round(limit * level.multiplier));
      const spent = source ? spentByCategory.get(source.key) ?? 0 : 0;
      const gap = allowed - spent;
      const headroom = Math.max(0, gap);
      const overshoot = gap < 0 ? Math.abs(gap) : 0;
      const pct = allowed > 0 ? Math.max(0, Math.min(100, Math.round((headroom / allowed) * 100))) : 0;
      const label = source?.label ?? level.fallbackLabel;
      return {
        id: `${source?.key ?? "default"}-${level.id}`,
        label,
        difficulty: level.difficulty,
        difficultyLabel: level.label,
        badgeClass: level.badgeClass,
        accentClass: level.accentClass,
        progressClass: level.progressClass,
        allowed,
        limit,
        spent,
        headroom,
        overshoot,
        pct,
        completed: allowed > 0 && spent <= allowed,
        description: level.description.replace("{category}", label),
        savedAgainstLimit: Math.max(0, limit - spent),
        realSpent: spent,
        hasRealData: !!source && spentByCategory.has(source.key),
      };
    });
  }, [budgetsPool, currentMonthKey, spentByCategory]);

  const goalsCompleted = useMemo(
    () => monthlyGoals.filter((goal) => goal.completed).length,
    [monthlyGoals]
  );
  const hardGoalCompleted = useMemo(
    () => monthlyGoals.some((goal) => goal.difficulty === "dificil" && goal.completed),
    [monthlyGoals]
  );
  const goalSavings = useMemo(
    () => monthlyGoals.reduce((acc, goal) => acc + goal.savedAgainstLimit, 0),
    [monthlyGoals]
  );

  const movementCount = movsMes.length;
  const achievementsContext = useMemo(
    () => ({
      savings: Math.max(0, saldo),
      balancePct,
      goalsCompleted,
      hardGoalCompleted,
      goalSavings,
      movCount: movementCount,
      debtLoad: Math.max(0, effPrest + effTarj),
      purchaseLoad: Math.max(0, effComp),
      ingresos,
    }),
    [
      saldo,
      balancePct,
      goalsCompleted,
      hardGoalCompleted,
      goalSavings,
      movementCount,
      effPrest,
      effTarj,
      effComp,
      ingresos,
    ]
  );

  const achievements = useMemo(
    () =>
      ACHIEVEMENT_LIBRARY.map((entry) => ({
        ...entry,
        unlocked: entry.condition(achievementsContext),
      })),
    [achievementsContext]
  );

  const unlockedCount = achievements.filter((entry) => entry.unlocked).length;
  const totalPages = Math.max(1, Math.ceil(achievements.length / ACHIEVEMENTS_PER_PAGE));
  const currentPage = Math.min(achPage, totalPages - 1);

  useEffect(() => {
    if (achPage > totalPages - 1) {
      setAchPage(totalPages - 1);
    }
  }, [achPage, totalPages]);

  const visibleAchievements = achievements.slice(
    currentPage * ACHIEVEMENTS_PER_PAGE,
    currentPage * ACHIEVEMENTS_PER_PAGE + ACHIEVEMENTS_PER_PAGE
  );
  const selectedAchievement =
    achievements.find((entry) => entry.id === selectedAchievementId) ?? null;
  const SelectedIcon = selectedAchievement?.icon ?? null;

  useEffect(() => {
    if (!selectedAchievement && achievements.length) {
      setSelectedAchievementId(achievements[0].id);
    }
  }, [achievements, selectedAchievement]);

  const handlePrevPage = () => setAchPage((prev) => Math.max(0, prev - 1));
  const handleNextPage = () =>
    setAchPage((prev) => Math.min(totalPages - 1, prev + 1));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Objetivos y logros</h1>
        <p className="text-white/80">
          Tomamos solo los datos del modo que tengas activado (simple o avanzado).
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs text-white/80">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span>
            Fuente ON:{" "}
            <span className="font-semibold text-white">{sourceLabel}</span>
          </span>
        </div>
      </header>

      <section
        id="objetivos-balance-card"
        className="rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70"
      >
        <div className={`rounded-xl border p-5 shadow-sm ${balanceMood.card}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <p className="text-sm text-gray-600">Balance del mes actual</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-4xl font-semibold">{balancePct}%</span>
                <span
                  className={[
                    "text-xs font-semibold uppercase tracking-wide rounded-full px-2 py-0.5",
                    balanceMood.badge,
                  ].join(" ")}
                >
                  {balanceMood.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{balanceMood.hint}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm text-gray-700">
              <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Ingresos</p>
                <p className="text-lg font-semibold">{fmtUYU(ingresos)}</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Egresos</p>
                <p className="text-lg font-semibold">{fmtUYU(egresos)}</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Saldo</p>
                <p className="text-lg font-semibold">{fmtUYU(saldo)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="objetivos-misiones-section"
        className="rounded-2xl p-6 bg-white/90 text-gray-900 shadow border border-white/60"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg md:text-xl font-semibold">Misiones del mes</h2>
            </div>
            <p className="text-sm text-gray-600">
              Solo mostramos tres objetivos activos para el mes actual: uno facil, uno medio y uno dificil. Cada inicio de mes rotamos la categoria.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {monthlyGoals.map((goal) => (
            <article
              key={goal.id}
              className="rounded-2xl border border-gray-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={["px-2 py-0.5 rounded-full", goal.badgeClass].join(" ")}>
                  {goal.difficultyLabel}
                </span>
                {goal.completed ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <Award className="h-4 w-4" />
                    Logrado
                  </span>
                ) : (
                  <span className={[goal.accentClass, "text-xs"].join(" ")}>
                    En curso
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-base font-semibold">{goal.label}</h3>
              <p className="text-sm text-gray-600">{goal.description}</p>
            <div className="mt-3 text-xs text-gray-600 space-y-1">
              <p>
                Meta: hasta <b>{fmtUYU(goal.allowed)}</b> (presupuesto {fmtUYU(goal.limit)}).
              </p>
              <p>
                {goal.hasRealData ? (
                  <>
                    Gastaste <b>{fmtUYU(goal.realSpent)}</b>.
                  </>
                ) : (
                  <>
                    Estimás gastar <b>{fmtUYU(goal.allowed)}</b>.
                  </>
                )}
              </p>
            </div>
              <div className="mt-3 h-2 rounded bg-gray-100 overflow-hidden">
                <div
                  className={["h-2 rounded", goal.progressClass].join(" ")}
                  style={{ width: `${goal.pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {goal.allowed === 0
                  ? "Carga un presupuesto para activar esta mision."
                  : goal.completed
                  ? "Objetivo listo, mantene el gasto asi."
                  : goal.headroom > 0
                  ? `Te quedan ${fmtUYU(goal.headroom)} de margen.`
                  : `Te pasaste por ${fmtUYU(goal.overshoot)}.`}
              </p>
            </article>
          ))}
        </div>
            <p className="mt-1 text-xs text-gray-500">
            Presupuesto base y meta ajustada se calculan segun la categoria elegida y el modo activo. Si cargas movimientos en Control mensual usamos tus gastos reales; si no, usamos solo los montos estimados.
          </p>
      </section>

      <section
        id="objetivos-logros-section"
        className="rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg md:text-xl font-semibold">Logros coleccionables</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Star className="h-4 w-4 text-amber-500" />
            <span>
              {unlockedCount}/{achievements.length} desbloqueados
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-600">
          Presiona un icono para conocer la meta y la descripcion. Solo mostramos doce por pagina para dejar logros por descubrir.
        </p>
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {visibleAchievements.map((ach) => {
            const Icon = ach.icon;
            const isSelected = selectedAchievementId === ach.id;
            return (
              <button
                key={ach.id}
                type="button"
                onClick={() => setSelectedAchievementId(ach.id)}
                aria-label={ach.title}
                aria-pressed={isSelected}
                className={[
                  "relative flex aspect-square items-center justify-center rounded-2xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
                  ach.unlocked
                    ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white"
                    : "border-slate-200 bg-slate-50",
                  isSelected ? "ring-2 ring-sky-300" : "hover:border-sky-300",
                ].join(" ")}
              >
                <Icon
                  className={
                    ach.unlocked
                      ? "h-7 w-7 text-emerald-600"
                      : "h-7 w-7 text-slate-400 opacity-70"
                  }
                />
                {ach.unlocked ? (
                  <Sparkles className="absolute bottom-1 right-1 h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Lock className="absolute bottom-1 right-1 h-3.5 w-3.5 text-slate-400" />
                )}
              </button>
            );
          })}
        </div>
        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className={[
                "rounded-full border px-3 py-1",
                currentPage === 0
                  ? "cursor-not-allowed border-slate-200 text-slate-400"
                  : "border-slate-300 text-slate-600 hover:border-slate-400",
              ].join(" ")}
            >
              Anterior
            </button>
            <span>
              Pagina {currentPage + 1} de {totalPages}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              className={[
                "rounded-full border px-3 py-1",
                currentPage >= totalPages - 1
                  ? "cursor-not-allowed border-slate-200 text-slate-400"
                  : "border-slate-300 text-slate-600 hover:border-slate-400",
              ].join(" ")}
            >
              Siguiente
            </button>
          </div>
        ) : null}
        {selectedAchievement && SelectedIcon ? (
          <div className="mt-4 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={[
                  "rounded-full p-3",
                  selectedAchievement.unlocked ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                <SelectedIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">
                  {selectedAchievement.tier}
                </p>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedAchievement.title}
                </h3>
                <p className="text-sm text-gray-600">{selectedAchievement.description}</p>
                <p
                  className={[
                    "text-xs font-semibold",
                    selectedAchievement.unlocked ? "text-emerald-600" : "text-gray-500",
                  ].join(" ")}
                >
                  {selectedAchievement.unlocked
                    ? "Listo! segui sumando logros."
                    : "Aun esta bloqueado. Cumpli la consigna para desbloquearlo."}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      {showTour ? (
        <ObjetivosLogrosOnboardingTour onClose={() => setShowTour(false)} />
      ) : null}
    </div>
  );
}

function readStorageJSON(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeEstimables(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    prestamos: Array.isArray(source.prestamos) ? source.prestamos : [],
    tarjetas: Array.isArray(source.tarjetas) ? source.tarjetas : [],
    compras: Array.isArray(source.compras) ? source.compras : [],
  };
}

const n = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

const fmtUYU = (v) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(v || 0);

function strip(value) {
  try {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  } catch {
    return String(value || "").toLowerCase().trim();
  }
}

function keyEquals(a, b) {
  return strip(a) === strip(b);
}

function titleCase(value) {
  try {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  } catch {
    return String(value || "");
  }
}

function rotateArray(list, shift) {
  if (!Array.isArray(list) || !list.length) return [];
  const offset = ((shift % list.length) + list.length) % list.length;
  return [...list.slice(offset), ...list.slice(0, offset)];
}
