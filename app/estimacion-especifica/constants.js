export const LS_ESPECIFICA = "miadmi:estimacion_especifica";
export const LS_ESTIMABLES = "miadmi:egresos_estimables";

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

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const ensureMonthArray = (value) => {
  const out = Array.isArray(value) ? [...value] : [];
  while (out.length < 12) out.push("");
  return out.slice(0, 12).map((item) => String(item ?? ""));
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
