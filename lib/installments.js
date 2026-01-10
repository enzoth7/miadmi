const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;
const MONTH_KEY_WITH_DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toNumber(value) {
  const numeric = Number(String(value ?? "").replace(",", ".").trim());
  return Number.isFinite(numeric) ? numeric : 0;
}

export function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function normalizeMonthKey(value, fallback = null) {
  if (value === null || value === undefined || value === "") {
    return fallback ?? null;
  }
  const raw = String(value).trim();
  if (MONTH_KEY_REGEX.test(raw)) return raw;
  if (MONTH_KEY_WITH_DAY_REGEX.test(raw)) return raw.slice(0, 7);
  return fallback ?? null;
}

export function addMonths(baseKey, offset) {
  const normalized = normalizeMonthKey(baseKey);
  if (!normalized || !Number.isFinite(offset)) return null;
  const [yearStr, monthStr] = normalized.split("-");
  const baseDate = new Date(Number(yearStr), Number(monthStr) - 1 + offset, 1);
  return getCurrentMonthKey(baseDate);
}

export function monthDiff(baseKey, targetKey) {
  const base = normalizeMonthKey(baseKey);
  const target = normalizeMonthKey(targetKey);
  if (!base || !target) return 0;
  const [baseYear, baseMonth] = base.split("-").map((part) => Number(part));
  const [targetYear, targetMonth] = target.split("-").map((part) => Number(part));
  return (targetYear - baseYear) * 12 + (targetMonth - baseMonth);
}

export function buildInstallmentSeries(items, currentMonthKey, horizon = 12) {
  const monthKey = normalizeMonthKey(currentMonthKey, getCurrentMonthKey());
  const months = Math.max(1, horizon || 12);
  const series = Array.from({ length: months }, () => 0);

  if (!Array.isArray(items)) {
    return { series, currentTotal: series[0] ?? 0 };
  }

  items.forEach((item) => {
    const amount = toNumber(item?.montoCuota);
    const cuotas = Math.max(0, Math.round(toNumber(item?.cuotas)));
    if (!amount || cuotas <= 0) return;
    const startKey =
      normalizeMonthKey(item?.mesInicio) ??
      normalizeMonthKey(item?.inicio) ??
      monthKey;

    for (let i = 0; i < cuotas; i++) {
      const paymentKey = addMonths(startKey, i);
      if (!paymentKey) continue;
      const offset = monthDiff(monthKey, paymentKey);
      if (offset >= 0 && offset < months) {
        series[offset] += amount;
      }
    }
  });

  return { series, currentTotal: series[0] ?? 0 };
}

export function buildPlannedPurchaseSeries(items, currentMonthKey, horizon = 12) {
  const monthKey = normalizeMonthKey(currentMonthKey, getCurrentMonthKey());
  const months = Math.max(1, horizon || 12);
  const series = Array.from({ length: months }, () => 0);

  if (!Array.isArray(items)) {
    return series;
  }

  items.forEach((item) => {
    const amount = toNumber(item?.valor);
    if (!amount) return;
    const targetKey = normalizeMonthKey(item?.mes);
    const offset = monthDiff(monthKey, targetKey);
    if (offset >= 0 && offset < months) {
      series[offset] += amount;
    }
  });

  return series;
}
