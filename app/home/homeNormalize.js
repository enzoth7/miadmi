import { toNumber, sumArrayMonto } from "./homeNumbers";
import {
  buildGeneralEgresos,
  buildGeneralIngresos,
  buildEspecificaEgresos,
  buildEspecificaIngresos,
} from "./homeCharts";

export const createEmptyNormalized = () => ({
  saldoInicial: 0,
  ingresos: 0,
  egresos: 0,
  ahorroDeseado: 0,
  ingresosPorCategoria: [],
  egresosPorCategoria: [],
});

const getGeneralIngresosValues = (general) => {
  const sueldos = toNumber(
    general?.sueldos ??
      general?.sueldo ??
      general?.ingresos ??
      general?.ingreso
  );
  const otros = toNumber(
    general?.otrosIngresos ??
      general?.otros_ingresos ??
      general?.otros ??
      general?.extra ??
      general?.extras
  );
  return { sueldos, otros };
};

const sumGeneralEgresos = (egresos) => {
  if (Array.isArray(egresos)) {
    return egresos.reduce((acc, it) => acc + toNumber(it?.monto), 0);
  }
  if (egresos && typeof egresos === "object") {
    return Object.values(egresos).reduce(
      (acc, v) => acc + toNumber(v?.monto ?? v),
      0
    );
  }
  return 0;
};

export function normalizeGeneral(general, dictionaries) {
  if (!general || typeof general !== "object") return createEmptyNormalized();

  const expenseLabels = dictionaries?.expenseLabels;
  const { sueldos, otros } = getGeneralIngresosValues(general);
  const ingresos = sueldos + otros;
  const egresos = sumGeneralEgresos(general?.egresos);

  const saldoInicial = toNumber(
    general?.saldoInicial ?? general?.saldo_inicial
  );
  const ahorroDeseado = toNumber(
    general?.ahorroDeseado ?? general?.ahorro_deseado
  );

  return {
    saldoInicial,
    ingresos,
    egresos,
    ahorroDeseado,
    ingresosPorCategoria: buildGeneralIngresos({ sueldos, otros }),
    egresosPorCategoria: buildGeneralEgresos(general?.egresos, expenseLabels),
  };
}

export function normalizeEspecifica(especifica, dictionaries) {
  if (!especifica || typeof especifica !== "object") return createEmptyNormalized();

  const incomeLabels = dictionaries?.incomeLabels;
  const expenseLabels = dictionaries?.expenseLabels;

  const ingresosRaw = especifica?.ingresos;
  const egresosRaw = especifica?.egresos;

  let ingresos = 0;
  let ingresosPorCategoria = [];

  if (Array.isArray(ingresosRaw)) {
    ingresos = sumArrayMonto(ingresosRaw);
    ingresosPorCategoria = buildEspecificaIngresos(ingresosRaw, incomeLabels);
  } else if (ingresosRaw && typeof ingresosRaw === "object") {
    ingresosPorCategoria = buildEspecificaIngresos(ingresosRaw, incomeLabels);
    ingresos = ingresosPorCategoria.reduce((acc, it) => acc + it.value, 0);
  }

  let egresos = 0;
  let egresosPorCategoria = [];

  if (Array.isArray(egresosRaw)) {
    egresos = sumArrayMonto(egresosRaw);
    egresosPorCategoria = buildEspecificaEgresos(egresosRaw, expenseLabels);
  } else if (egresosRaw && typeof egresosRaw === "object") {
    egresosPorCategoria = buildEspecificaEgresos(egresosRaw, expenseLabels);
    egresos = egresosPorCategoria.reduce((acc, it) => acc + it.value, 0);
  }

  const saldoInicial = toNumber(
    especifica?.saldoInicial ?? especifica?.saldo_inicial
  );
  const ahorroDeseado = toNumber(
    especifica?.ahorroMensual ??
      especifica?.ahorro_mensual ??
      especifica?.ahorroDeseado
  );

  return {
    saldoInicial,
    ingresos,
    egresos,
    ahorroDeseado,
    ingresosPorCategoria,
    egresosPorCategoria,
  };
}

export function hasMeaningfulData(normalized) {
  if (!normalized) return false;
  if (normalized.ingresos !== 0) return true;
  if (normalized.egresos !== 0) return true;
  if (normalized.saldoInicial !== 0) return true;
  if (normalized.ahorroDeseado !== 0) return true;
  if ((normalized.ingresosPorCategoria || []).length > 0) return true;
  if ((normalized.egresosPorCategoria || []).length > 0) return true;
  return false;
}
