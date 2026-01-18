export function calculateTotals(normalized) {
  const saldoInicial = normalized?.saldoInicial ?? 0;
  const ingresos = normalized?.ingresos ?? 0;
  const egresos = normalized?.egresos ?? 0;
  const ahorroDeseado = normalized?.ahorroDeseado ?? 0;

  const ingresosTotales = saldoInicial + ingresos;
  const egresosTotales = egresos;
  const resultado = saldoInicial + ingresos - egresos;
  const capacidadMensual = resultado - ahorroDeseado;
  const saldoProyectado = resultado;

  return {
    ingresosTotales,
    egresosTotales,
    resultado,
    capacidadMensual,
    saldoProyectado,
  };
}
