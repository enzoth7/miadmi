"use strict";

import type {
  EstimacionEspecifica,
  EstimacionGeneral,
  EstimablesGrouped,
  EstimationActiveMode,
} from "./app-data";

const toNumber = (value: unknown): number => {
  const numeric = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
};

const sumArray = (items: Array<{ monto?: unknown } | null | undefined>): number =>
  (Array.isArray(items) ? items : []).reduce(
    (acc, item) => acc + toNumber(item?.monto),
    0
  );

const sumNested = (value: unknown): number => {
  if (value === null || value === undefined) return 0;

  if (Array.isArray(value)) {
    return value.reduce((acc, entry) => acc + sumNested(entry), 0);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if ("monto" in record || "valor" in record) {
      return toNumber(record.monto ?? record.valor);
    }

    return Object.entries(record).reduce<number>(
      (acc, [key, entry]) =>
        key.startsWith("_") ? acc : acc + sumNested(entry),
      0
    );
  }

  return toNumber(value);
};

const extractSaldoInicial = (value: unknown): number => {
  if (value && typeof value === "object") {
    const record = value as Record<string, any>;
    if (record?._meta && typeof record._meta === "object") {
      return toNumber(record._meta.saldoInicial);
    }
    if (record?.saldoInicial !== undefined && record?.saldoInicial !== null) {
      return toNumber(record.saldoInicial);
    }
  }
  return 0;
};

const keysToTitle = (key: string): string =>
  key
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());

export type DashboardSummary = {
  general: {
    ingresos: number;
    egresos: number;
    ahorroDeseado: number;
    saldoInicial: number;
  };
  especifica: {
    ingresos: number;
    egresos: number;
    saldoInicial: number;
    breakdown: Record<string, number>;
  };
  estimables: {
    prestamos: number;
    tarjetas: number;
    compras: number;
    total: number;
  };
  totals: {
    ingresos: number;
    egresos: number;
    egresosFijos: number;
    egresosVariables: number;
    estimables: number;
    ahorroDeseado: number;
    resultado: number;
    capacidadMensual: number;
    saldoProyectado: number;
  };
  activeMode: EstimationActiveMode;
};

type SummaryInput = {
  general?: Partial<EstimacionGeneral> | null;
  especifica?: Partial<EstimacionEspecifica> | null;
  estimables?: Partial<EstimablesGrouped> | null;
  activeMode?: EstimationActiveMode | null;
};

export function buildDashboardSummary(input: SummaryInput): DashboardSummary {
  const general = input.general ?? {};
  const especifica = input.especifica ?? {};
  const estimables = input.estimables ?? {};
  const activeMode: EstimationActiveMode =
    input.activeMode === "especifica" ? "especifica" : "general";
  const includeGeneral = activeMode === "general";
  const includeEspecifica = activeMode === "especifica";

  const rawGeneralIngresos =
    toNumber(general.sueldos) + toNumber(general.otrosIngresos);
  const rawGeneralEgresos = sumArray(
    Array.isArray(general.egresos) ? general.egresos : []
  );

  const rawAhorroDeseado = toNumber(general.ahorroDeseado);
  const rawSaldoInicial = toNumber(general.saldoInicial);

  const generalIngresos = includeGeneral ? rawGeneralIngresos : 0;
  const generalEgresos = includeGeneral ? rawGeneralEgresos : 0;
  const ahorroDeseado = includeGeneral ? rawAhorroDeseado : 0;
  const generalSaldoInicial = includeGeneral ? rawSaldoInicial : 0;

  let rawEspecificaIngresos = 0;
  const rawEspecificaBreakdown: Record<string, number> = {};
  let rawEspecificaEgresos = 0;
  let rawEspecificaSaldoInicial = 0;

  if (Array.isArray(especifica?.ingresos)) {
    rawEspecificaIngresos = especifica.ingresos.reduce(
      (acc, item) => acc + toNumber((item as any)?.monto ?? (item as any)),
      0
    );
  } else if (especifica?.ingresos && typeof especifica.ingresos === "object") {
    rawEspecificaIngresos = sumNested(especifica.ingresos);
  }
  rawEspecificaSaldoInicial = extractSaldoInicial(especifica?.ingresos);

  if (Array.isArray(especifica?.egresos)) {
    rawEspecificaEgresos = (especifica.egresos as Array<any>).reduce(
      (acc, entry) => acc + toNumber(entry?.monto ?? entry),
      0
    );
    if (rawEspecificaEgresos > 0) {
      rawEspecificaBreakdown["Otros"] = rawEspecificaEgresos;
    }
  } else if (especifica?.egresos && typeof especifica.egresos === "object") {
    for (const [key, value] of Object.entries(especifica.egresos)) {
      const subtotal = sumNested(value);
      if (subtotal > 0) {
        rawEspecificaBreakdown[keysToTitle(key)] = subtotal;
        rawEspecificaEgresos += subtotal;
      }
    }
  }

  const especificaIngresos = includeEspecifica ? rawEspecificaIngresos : 0;
  const especificaEgresos = includeEspecifica ? rawEspecificaEgresos : 0;
  const especificaSaldoInicial = includeEspecifica
    ? rawEspecificaSaldoInicial
    : 0;
  const especificaBreakdown = includeEspecifica ? rawEspecificaBreakdown : {};

  const rawPrestamos = (Array.isArray(estimables?.prestamos)
    ? estimables?.prestamos
    : []
  ).reduce((acc, item) => acc + Math.max(0, toNumber(item?.montoCuota)), 0);

  const rawTarjetas = (Array.isArray(estimables?.tarjetas)
    ? estimables?.tarjetas
    : []
  ).reduce((acc, item) => acc + Math.max(0, toNumber(item?.montoCuota)), 0);

  const rawCompras = (Array.isArray(estimables?.compras)
    ? estimables?.compras
    : []
  ).reduce((acc, item) => acc + Math.max(0, toNumber(item?.valor)), 0);

  const includeEstimables = includeEspecifica;
  const prestamos = includeEstimables ? rawPrestamos : 0;
  const tarjetas = includeEstimables ? rawTarjetas : 0;
  const compras = includeEstimables ? rawCompras : 0;

  const estimablesTotal = prestamos + tarjetas + compras;

  const egresosVariables = especificaEgresos;
  const ingresosTotales = generalIngresos + especificaIngresos;
  const egresosTotales = generalEgresos + egresosVariables;
  const resultado = ingresosTotales - egresosTotales;
  const capacidadMensual = resultado;
  const saldoInicial = includeGeneral
    ? rawSaldoInicial
    : includeEspecifica
    ? rawEspecificaSaldoInicial
    : 0;
  const saldoProyectado = saldoInicial + resultado;

  return {
    general: {
      ingresos: generalIngresos,
      egresos: generalEgresos,
      ahorroDeseado,
      saldoInicial: generalSaldoInicial,
    },
    especifica: {
      ingresos: especificaIngresos,
      egresos: especificaEgresos,
      saldoInicial: especificaSaldoInicial,
      breakdown: especificaBreakdown,
    },
    estimables: {
      prestamos,
      tarjetas,
      compras,
      total: estimablesTotal,
    },
    totals: {
    ingresos: ingresosTotales,
    egresos: egresosTotales,
    egresosFijos: generalEgresos,
    egresosVariables,
    estimables: estimablesTotal,
    ahorroDeseado,
    resultado,
    capacidadMensual,
    saldoProyectado,
  },
  activeMode,
  };
}
