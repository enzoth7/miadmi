export function titleCase(s) {
  try {
    return String(s)
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase());
  } catch {
    return String(s || "");
  }
}

export function stripAccents(s) {
  try {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  } catch {
    return String(s || "").toLowerCase();
  }
}

export function normalizeKey(value) {
  return stripAccents(String(value || "")).replace(/[^a-z0-9]/g, "");
}

export function resolveCategoryLabel(raw, dictionary) {
  if (dictionary) {
    const normalized = normalizeKey(raw);
    if (dictionary[normalized]) return dictionary[normalized];
  }
  if (typeof raw === "string" && raw.trim()) {
    return titleCase(raw);
  }
  return "Sin nombre";
}

export function resolveFromDictionary(value, dictionary) {
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
