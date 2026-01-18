import { toNumber } from "./homeNumbers";
import { resolveCategoryLabel, resolveFromDictionary } from "./homeLabels";

export function flattenNumericObject(obj, dictionary, kindLabel) {
  if (!obj || typeof obj !== "object") return [];
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const val = toNumber(v?.monto ?? v);
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

export function buildGeneralIngresos(values) {
  const sueldos = toNumber(values?.sueldos);
  const otros = toNumber(values?.otros);
  const out = [];
  if (sueldos > 0) out.push({ name: "Sueldos / Honorarios", value: sueldos });
  if (otros > 0) out.push({ name: "Otros ingresos", value: otros });
  return out;
}

export function buildGeneralEgresos(egresos, expenseLabelDictionary) {
  if (Array.isArray(egresos)) {
    return egresos
      .filter((it) => toNumber(it?.monto) > 0)
      .map((it) => ({
        name:
          resolveFromDictionary(it?.nombre, expenseLabelDictionary) ||
          resolveFromDictionary(it?.categoria, expenseLabelDictionary) ||
          resolveFromDictionary(it?.id, expenseLabelDictionary) ||
          String(it?.nombre || it?.categoria || "Sin nombre"),
        value: toNumber(it?.monto),
      }));
  }
  if (egresos && typeof egresos === "object") {
    return flattenNumericObject(egresos, expenseLabelDictionary, "general");
  }
  return [];
}

export function buildEspecificaIngresos(ingresos, incomeLabelDictionary) {
  if (Array.isArray(ingresos)) {
    return ingresos
      .filter((it) => toNumber(it?.monto) > 0)
      .map((it) => ({
        name:
          resolveFromDictionary(it?.id, incomeLabelDictionary) ||
          resolveFromDictionary(it?.categoria, incomeLabelDictionary) ||
          resolveFromDictionary(it?.nombre, incomeLabelDictionary) ||
          String(it?.nombre || it?.categoria || "Sin nombre"),
        value: toNumber(it?.monto),
      }));
  }
  if (ingresos && typeof ingresos === "object") {
    return flattenNumericObject(ingresos, incomeLabelDictionary, "especifica");
  }
  return [];
}

export function buildEspecificaEgresos(egresos, expenseLabelDictionary) {
  if (Array.isArray(egresos)) {
    return egresos
      .filter((it) => toNumber(it?.monto) > 0)
      .map((it) => ({
        name:
          resolveFromDictionary(it?.id, expenseLabelDictionary) ||
          resolveFromDictionary(it?.categoria, expenseLabelDictionary) ||
          resolveFromDictionary(it?.nombre, expenseLabelDictionary) ||
          String(it?.nombre || it?.categoria || "Sin nombre"),
        value: toNumber(it?.monto),
      }));
  }
  if (egresos && typeof egresos === "object") {
    return flattenNumericObject(egresos, expenseLabelDictionary, "especifica");
  }
  return [];
}
