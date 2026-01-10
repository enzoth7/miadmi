export type SimpleProfileAnswers = {
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string;
  q5?: string;
  q6?: string;
  q7?: string;
  q8?: string;
  q9?: string;
  q10?: number | null;
};

export type SimpleProfileState = {
  answers: SimpleProfileAnswers;
  completed: boolean;
  updatedAt: string | null;
};

export type ChartSlice = {
  name: string;
  value: number;
};

export type SimpleSummarySnapshot = {
  income: number | null;
  expenses: number | null;
  surplus: number | null;
  incomeLabel: string;
  expensesLabel: string;
  surplusLabel: string;
  chartData: ChartSlice[];
};

const numberFormatter = new Intl.NumberFormat("es-UY", {
  maximumFractionDigits: 0,
});

export function formatCurrencyValue(value: number): string {
  return `$ ${numberFormatter.format(Math.round(value))}`;
}

const EXPENSE_MULTIPLIER_BY_Q1: Record<string, number> = {
  "No llego": 1.1,
  "Llego justo": 1,
  "Me alcanza": 0.9,
  "Puedo ahorrar": 0.8,
};

type ExpenseCategory =
  | "Vivienda"
  | "Comida"
  | "Transporte"
  | "Deudas"
  | "Servicios"
  | "Otros";

const CATEGORY_ORDER: ExpenseCategory[] = [
  "Vivienda",
  "Comida",
  "Transporte",
  "Deudas",
  "Servicios",
  "Otros",
];

const BASE_WEIGHTS: Record<ExpenseCategory, number> = {
  Vivienda: 0.25,
  Comida: 0.25,
  Transporte: 0.12,
  Deudas: 0.1,
  Servicios: 0.1,
  Otros: 0.18,
};

const PRIOR_CATEGORY_BY_OPTION: Record<string, ExpenseCategory> = {
  alquiler: "Vivienda",
  comida: "Comida",
  transporte: "Transporte",
  deudas: "Deudas",
  otro: "Otros",
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numeric = Number(String(value).replace(",", "."));
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
}

function resolveYesNo(value?: string): "yes" | "no" | null {
  if (!value) return null;
  const normalized = normalizeText(value);
  if (normalized === "si") return "yes";
  if (normalized === "no") return "no";
  return null;
}

function addWeight(
  weights: Record<ExpenseCategory, number>,
  key: ExpenseCategory,
  delta: number
): void {
  weights[key] = (weights[key] ?? 0) + delta;
}

function normalizeWeights(
  weights: Record<ExpenseCategory, number>
): Record<ExpenseCategory, number> {
  const next = {} as Record<ExpenseCategory, number>;
  let total = 0;
  CATEGORY_ORDER.forEach((key) => {
    const value = Number.isFinite(weights[key]) ? Math.max(weights[key], 0) : 0;
    next[key] = value;
    total += value;
  });
  if (total <= 0) return { ...BASE_WEIGHTS };
  CATEGORY_ORDER.forEach((key) => {
    next[key] = next[key] / total;
  });
  return next;
}

function resolvePrimaryCategory(
  answers: SimpleProfileAnswers
): ExpenseCategory | null {
  const candidates = [answers.q8, answers.q9];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = normalizeText(candidate);
    const mapped = PRIOR_CATEGORY_BY_OPTION[normalized];
    if (mapped) return mapped;
  }
  return null;
}

export function buildExpenseChartData(
  answers: SimpleProfileAnswers,
  total: number
): ChartSlice[] {
  if (!Number.isFinite(total) || total <= 0) return [];
  const weights = { ...BASE_WEIGHTS };

  if (typeof answers.q2 === "string") {
    const living = normalizeText(answers.q2);
    if (living === "de alquiler" || living === "alquiler") {
      addWeight(weights, "Vivienda", 0.12);
    } else if (living === "comparto alquiler") {
      addWeight(weights, "Vivienda", 0.07);
    } else if (living === "casa propia") {
      addWeight(weights, "Vivienda", -0.08);
      addWeight(weights, "Servicios", 0.05);
    } else if (living === "con familia") {
      addWeight(weights, "Vivienda", -0.12);
    }
  }

  if (typeof answers.q3 === "string") {
    const debt = resolveYesNo(answers.q3);
    if (debt === "yes") addWeight(weights, "Deudas", 0.08);
    if (debt === "no") addWeight(weights, "Deudas", -0.06);
  }

  [answers.q6, answers.q7, answers.q8].forEach((answer) => {
    const impulse = resolveYesNo(typeof answer === "string" ? answer : undefined);
    if (impulse === "yes") addWeight(weights, "Otros", 0.05);
    if (impulse === "no") addWeight(weights, "Otros", -0.04);
  });

  const primaryCategory = resolvePrimaryCategory(answers);
  if (primaryCategory) {
    const maxWeight = Math.max(...CATEGORY_ORDER.map((key) => weights[key]));
    const target =
      primaryCategory === "Vivienda"
        ? maxWeight
        : Math.max(maxWeight, weights.Vivienda);
    if (weights[primaryCategory] < target) {
      weights[primaryCategory] = target;
    }
  }

  const normalized = normalizeWeights(weights);
  const roundedTotal = Math.round(total);
  const slices = CATEGORY_ORDER.map((name) => ({
    name,
    value: Math.round(roundedTotal * normalized[name]),
  }));

  const diff = roundedTotal - slices.reduce((acc, item) => acc + item.value, 0);
  if (diff !== 0) {
    const primaryIndex = primaryCategory
      ? slices.findIndex((item) => item.name === primaryCategory)
      : -1;
    const fallbackIndex =
      primaryIndex >= 0
        ? primaryIndex
        : slices.reduce(
            (maxIdx, item, idx, arr) =>
              item.value > arr[maxIdx].value ? idx : maxIdx,
            0
          );
    slices[fallbackIndex].value = Math.max(slices[fallbackIndex].value + diff, 0);
  }

  return slices.filter((item) => item.value > 0);
}

export function buildSimpleSummary(
  answers: SimpleProfileAnswers
): SimpleSummarySnapshot {
  const income = toNumber(answers.q10);
  const q1 = typeof answers.q1 === "string" ? answers.q1.trim() : undefined;
  const multiplier = q1 ? EXPENSE_MULTIPLIER_BY_Q1[q1] : undefined;

  let surplus: number | null = null;
  let expenses: number | null = null;

  // Heuristica simple: usamos la sensacion de fin de mes para estimar egresos.
  if (income !== null && multiplier !== undefined) {
    expenses = Math.round(income * multiplier);
    surplus = Math.round(income - expenses);
  }

  const incomeLabel =
    income !== null ? formatCurrencyValue(income) : "Sin dato";
  const expensesLabel =
    expenses !== null ? formatCurrencyValue(expenses) : "Sin dato";
  const surplusLabel =
    surplus !== null ? formatCurrencyValue(surplus) : "No lo sabemos aún";

  const chartData =
    income !== null && expenses !== null && expenses > 0
      ? buildExpenseChartData(answers, expenses)
      : [];

  return {
    income,
    expenses,
    surplus,
    incomeLabel,
    expensesLabel,
    surplusLabel,
    chartData,
  };
}
