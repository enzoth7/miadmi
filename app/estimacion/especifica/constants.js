export const LS_ESPECIFICA = "miadmi:estimacion_especifica";
export const LS_ESTIMABLES = "miadmi:egresos_estimables";
export const LS_CUSTOM_CATEGORIES = "miadmi:custom_categories";
export const LS_PROJECTION_SERIES = "miadmi:projection_series";
export const LS_PROJECTION_ANCHOR = "miadmi:projection_anchor_month";


export const INCOME_CATEGORIES = [
  { id: "sueldos", label: "Sueldos / Ingresos", aliases: ["sueldos", "ingresos"] },
  {
    id: "extraordinarios",
    label: "Ingresos extraordinarios",
    aliases: ["extraordinarios", "aguinaldos"],
  },
  { id: "devolucion", label: "Devolución de impuestos", aliases: ["devolucion", "impuestos"] },
  { id: "prestamosIngresos", label: "Préstamos", aliases: ["prestamos"] },
  { id: "familia", label: "Familia" },
  { id: "otros", label: "Otros" },
];

export const EXPENSE_CATEGORIES = [
  { id: "super", label: "Super" },
  { id: "alquiler", label: "Alquiler/Hipoteca", aliases: ["alquiler", "hipoteca"] },
  {
    id: "gastosFijos",
    label: "Gastos fijos (UTE, OSE, Internet)",
    aliases: ["gastos fijos"],
  },
  { id: "gym", label: "Gym" },
  { id: "otrasActividades", label: "Otras actividades" },
  { id: "salud", label: "Salud y estética", aliases: ["salud"] },
  { id: "transporte", label: "Transporte/Combustible", aliases: ["transporte", "combustible"] },
  { id: "generales", label: "Gastos generales", aliases: ["imprevistos"] },
  { id: "ropa", label: "Ropa" },
  { id: "entretenimiento", label: "Entretenimiento y salidas", aliases: ["entretenimiento"] },
  { id: "viajes", label: "Viajes" },
  { id: "educacion", label: "Educación" },
  {
    id: "adquisiciones",
    label: "Adquisiciones (compras grandes)",
    aliases: ["adquisiciones", "posibles compras"],
  },
  { id: "reparaciones", label: "Reparaciones de vehiculo", aliases: ["reparacion vehiculo"] },
  { id: "prestamos", label: "Préstamos", source: "estimables", aliases: ["prestamos"] },
  { id: "tarjetas", label: "Tarjetas", source: "estimables", aliases: ["tarjetas"] },
];

const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat("es-UY", { month: "short" });

const cleanMonthLabel = (raw) =>
  String(raw || "")
    .replace(/\./g, "")
    .toUpperCase()
    .trim();

export const formatMonthLabel = (date) => {
  const safeDate = date instanceof Date ? date : new Date();
  const month = cleanMonthLabel(SHORT_MONTH_FORMATTER.format(safeDate));
  const yearSuffix = String(safeDate.getFullYear()).slice(-2);
  return `${month} '${yearSuffix}`;
};

export const buildMonthLabels = (length = 12, startDate = new Date()) =>
  Array.from({ length }, (_, idx) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + idx, 1);
    return formatMonthLabel(date);
  });

export const ensureMonthArray = (value, targetLength = 12) => {
  const out = Array.isArray(value) ? [...value] : [];
  while (out.length < targetLength) out.push("");
  if (out.length > targetLength) {
    out.length = targetLength;
  }
  return out.map((item) => String(item ?? ""));
};

export const normalizeKey = (value) => {
  try {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  } catch {
    return String(value ?? "").toLowerCase().trim();
  }
};

const parseMonthKey = (key) => {
  // asumo formato "YYYY-MM" (si es distinto, ajustamos)
  const [y, m] = String(key || "").split("-");
  const year = Number(y);
  const month = Number(m);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return { year, month };
};

export const diffMonths = (fromKey, toKey) => {
  const a = parseMonthKey(fromKey);
  const b = parseMonthKey(toKey);
  if (!a || !b) return 0;
  return (b.year - a.year) * 12 + (b.month - a.month);
};

export const shiftMonthArray = (arr, delta, length = 12) => {
  const base = ensureMonthArray(arr ?? [], length);
  if (!delta) return base;

  if (delta > 0) {
    // avanzó el tiempo: dropeo del inicio y agrego "" al final
    const sliced = base.slice(delta);
    return ensureMonthArray([...sliced, ...Array(delta).fill("")], length);
  }

  // delta < 0: retrocedió el tiempo (raro pero por seguridad)
  const d = Math.abs(delta);
  const sliced = base.slice(0, length - d);
  return ensureMonthArray([...Array(d).fill(""), ...sliced], length);
};

export const shiftProjection = (proj, delta, length = 12) => {
  if (!proj || typeof proj !== "object") return proj;
  const next = {
    ingresos: {},
    egresos: {},
    ahorro: shiftMonthArray(proj.ahorro ?? [], delta, length),
  };

  Object.entries(proj.ingresos ?? {}).forEach(([catId, row]) => {
    next.ingresos[catId] = shiftMonthArray(row, delta, length);
  });

  Object.entries(proj.egresos ?? {}).forEach(([catId, row]) => {
    next.egresos[catId] = shiftMonthArray(row, delta, length);
  });

  return next;
};

