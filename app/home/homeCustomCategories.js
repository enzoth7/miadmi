import { normalizeKey } from "./homeLabels";

export const createEmptyCategoryDictionary = () => ({ ingresos: {}, egresos: {} });

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

export const readCustomCategoriesFromStorage = (storageKey) => {
  if (typeof window === "undefined") {
    return createEmptyCategoryDictionary();
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
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

export const areCustomDictionariesEqual = (a, b) =>
  shallowEqualMap(a?.ingresos ?? {}, b?.ingresos ?? {}) &&
  shallowEqualMap(a?.egresos ?? {}, b?.egresos ?? {});
