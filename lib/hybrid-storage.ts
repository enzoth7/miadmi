import {
  fetchAppSettings,
  fetchEstimablesGrouped,
  fetchEstimacionEspecifica,
  fetchEstimacionGeneral,
  replaceEstimables,
  saveCustomCategories,
  saveEstimationMode,
  upsertEstimacionEspecifica,
  upsertEstimacionGeneral,
} from "./app-data";

export const ACTIVE_STORAGE_KEYS = [
  "miadmi:estimacion_general",
  "miadmi:estimacion_especifica",
  "miadmi:egresos_estimables",
  "miadmi:estimacion_mode",
  "miadmi:custom_categories",
  "miadmi:projection_series",
  "miadmi:projection_anchor_month",
] as const;

type Scope = "guest" | `user:${string}`;
type Dataset = "general" | "especifica" | "estimables" | "settings";

export type SyncedRecord<T> = {
  userId: string;
  modifiedAt: string;
  content: T;
};

const keyFor = (scope: Scope, key: string) => `miadmi:space:${scope}:${key}`;
const metaKey = (scope: Scope, dataset: Dataset) => `miadmi:meta:${scope}:${dataset}`;
const keyMap: Record<Dataset, string[]> = {
  general: ["miadmi:estimacion_general"],
  especifica: [
    "miadmi:estimacion_especifica",
    "miadmi:projection_series",
    "miadmi:projection_anchor_month",
  ],
  estimables: ["miadmi:egresos_estimables"],
  settings: ["miadmi:estimacion_mode", "miadmi:custom_categories"],
};

const parse = <T>(value: string | null): T | null => {
  try {
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
};

const fingerprint = (dataset: Dataset) =>
  JSON.stringify(keyMap[dataset].map((key) => localStorage.getItem(key)));

function setMeta(scope: Scope, dataset: Dataset, modifiedAt = new Date().toISOString()) {
  localStorage.setItem(metaKey(scope, dataset), JSON.stringify({ modifiedAt, fingerprint: fingerprint(dataset) }));
}

function getMeta(scope: Scope, dataset: Dataset) {
  return parse<{ modifiedAt?: string; fingerprint?: string }>(localStorage.getItem(metaKey(scope, dataset)));
}

export function saveActiveSpace(scope: Scope) {
  ACTIVE_STORAGE_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value == null) localStorage.removeItem(keyFor(scope, key));
    else localStorage.setItem(keyFor(scope, key), value);
  });
}

export function restoreSpace(scope: Scope) {
  ACTIVE_STORAGE_KEYS.forEach((key) => {
    const value = localStorage.getItem(keyFor(scope, key));
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  });
  window.dispatchEvent(new Event("miadmi:data-updated"));
}

export function ensureGuestSpace() {
  const hasGuest = ACTIVE_STORAGE_KEYS.some((key) => localStorage.getItem(keyFor("guest", key)) != null);
  if (!hasGuest) saveActiveSpace("guest");
}

async function remoteUpdatedAt(supabase: any, table: string, userId: string) {
  const { data } = await supabase.from(table).select("updated_at").eq("user_id", userId).maybeSingle();
  return data?.updated_at ? String(data.updated_at) : null;
}

async function downloadDataset(supabase: any, userId: string, dataset: Dataset) {
  if (dataset === "general") {
    const value = await fetchEstimacionGeneral(supabase, userId);
    if (value) localStorage.setItem(keyMap.general[0], JSON.stringify(value));
    return Boolean(value);
  }
  if (dataset === "especifica") {
    const value = await fetchEstimacionEspecifica(supabase, userId);
    if (value) {
      localStorage.setItem(keyMap.especifica[0], JSON.stringify(value));
      if (value.projection) localStorage.setItem(keyMap.especifica[1], JSON.stringify(value.projection));
      if (value.projection_anchor) localStorage.setItem(keyMap.especifica[2], value.projection_anchor);
    }
    return Boolean(value);
  }
  if (dataset === "estimables") {
    const value = await fetchEstimablesGrouped(supabase, userId);
    const exists = await remoteUpdatedAt(supabase, "egresos_estimables", userId);
    if (exists) localStorage.setItem(keyMap.estimables[0], JSON.stringify(value));
    return Boolean(exists);
  }
  const settings = await fetchAppSettings(supabase, userId);
  const exists = await remoteUpdatedAt(supabase, "app_settings", userId);
  if (exists) {
    localStorage.setItem(keyMap.settings[0], settings?.estimations?.active === "especifica" ? "especifica" : "general");
    if (settings?.customCategories) localStorage.setItem(keyMap.settings[1], JSON.stringify(settings.customCategories));
  }
  return Boolean(exists);
}

async function uploadDataset(supabase: any, userId: string, dataset: Dataset) {
  if (dataset === "general") {
    const value = parse<any>(localStorage.getItem(keyMap.general[0]));
    if (value) await upsertEstimacionGeneral(supabase, userId, { ...value, id: null });
    return;
  }
  if (dataset === "especifica") {
    const value = parse<any>(localStorage.getItem(keyMap.especifica[0]));
    if (value) await upsertEstimacionEspecifica(supabase, userId, { ...value, id: null });
    return;
  }
  if (dataset === "estimables") {
    const value = parse<any>(localStorage.getItem(keyMap.estimables[0]));
    if (value) await replaceEstimables(supabase, userId, value);
    return;
  }
  const mode = localStorage.getItem(keyMap.settings[0]);
  if (mode) await saveEstimationMode(supabase, userId, mode === "especifica" ? "especifica" : "general");
  const categories = parse<any>(localStorage.getItem(keyMap.settings[1]));
  if (categories) await saveCustomCategories(supabase, userId, categories);
}

const remoteTable: Record<Dataset, string> = {
  general: "estimacion_general",
  especifica: "estimacion_especifica",
  estimables: "egresos_estimables",
  settings: "app_settings",
};

export async function reconcileUserSpace(supabase: any, userId: string) {
  const scope = `user:${userId}` as const;
  const hadUserCache = ACTIVE_STORAGE_KEYS.some((key) => localStorage.getItem(keyFor(scope, key)) != null);
  if (hadUserCache) restoreSpace(scope);

  for (const dataset of Object.keys(keyMap) as Dataset[]) {
    const meta = getMeta(scope, dataset);
    const remoteAt = await remoteUpdatedAt(supabase, remoteTable[dataset], userId);
    const hasLocal = keyMap[dataset].some((key) => localStorage.getItem(key) != null);
    const localAt = meta?.modifiedAt || null;

    if (remoteAt && (!localAt || new Date(remoteAt) >= new Date(localAt))) {
      await downloadDataset(supabase, userId, dataset);
      setMeta(scope, dataset, remoteAt);
    } else if (hasLocal) {
      await uploadDataset(supabase, userId, dataset);
      setMeta(scope, dataset, localAt || new Date().toISOString());
    }
  }
  saveActiveSpace(scope);
  window.dispatchEvent(new Event("miadmi:data-updated"));
}

export async function syncChangedUserData(supabase: any, userId: string) {
  const scope = `user:${userId}` as const;
  for (const dataset of Object.keys(keyMap) as Dataset[]) {
    const currentFingerprint = fingerprint(dataset);
    const meta = getMeta(scope, dataset);
    if (currentFingerprint !== meta?.fingerprint) {
      const modifiedAt = new Date().toISOString();
      setMeta(scope, dataset, modifiedAt);
      await uploadDataset(supabase, userId, dataset);
      setMeta(scope, dataset, modifiedAt);
    }
  }
  saveActiveSpace(scope);
}
