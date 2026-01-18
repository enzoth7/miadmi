export const toNumber = (v) => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  let s = String(v).trim();
  if (!s) return 0;

  s = s.replace(/\s+/g, "");
  s = s.replace(/[^\d,.-]/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    s = s.replace(",", ".");
  }

  const x = Number(s);
  return Number.isFinite(x) ? x : 0;
};

export const sumArrayMonto = (arr) =>
  Array.isArray(arr)
    ? arr.reduce((acc, it) => acc + toNumber(it?.monto), 0)
    : 0;
