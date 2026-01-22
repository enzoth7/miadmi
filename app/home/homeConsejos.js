export function buildConsejos(params) {
  const {
    totals,
    activeNormalized,
    generalNormalized,
    especificaNormalized,
    includeGeneral,
    activeModeLabel,
    graficoIngresos,
    graficoEgresos,
    totalPrestamos,
    totalTarjetas,
    totalCompras,
    totalEstimables,
    tieneGeneral,
    tieneEspecifica,
  } = params || {};

  const ctx = {
    ingresosTotales: totals?.ingresosTotales ?? 0,
    egresosTotales: totals?.egresosTotales ?? 0,
    resultado: totals?.resultado ?? 0,
    ahorroDeseado: activeNormalized?.ahorroDeseado ?? 0,
    capacidadMensual: totals?.capacidadMensual ?? 0,
    saldoInicial: activeNormalized?.saldoInicial ?? 0,
    saldoProyectado: totals?.saldoProyectado ?? 0,
    includeGeneral: Boolean(includeGeneral),
    tieneGeneral: Boolean(tieneGeneral),
    tieneEspecifica: Boolean(tieneEspecifica),
    graficoIngresos: graficoIngresos ?? [],
    graficoEgresos: graficoEgresos ?? [],
    totalPrestamos: totalPrestamos ?? 0,
    totalTarjetas: totalTarjetas ?? 0,
    totalCompras: totalCompras ?? 0,
    totalEstimables: totalEstimables ?? 0,
    ingresosGen: generalNormalized?.ingresos ?? 0,
    ingresosEsp: especificaNormalized?.ingresos ?? 0,
    egresosGen: generalNormalized?.egresos ?? 0,
    egresosEsp: especificaNormalized?.egresos ?? 0,
    activeModeLabel: activeModeLabel ?? "",
  };

  const tipCatalog = [
    { check: (c) => c.ingresosTotales === 0 && c.egresosTotales === 0, message: "Cargá tus ingresos y egresos para ver recomendaciones personalizadas." },
    { check: (c) => c.ingresosTotales > 0 && c.egresosTotales === 0, message: "Agregrá tus egresos recurrentes para medir el impacto real de tus ingresos." },
    { check: (c) => c.ingresosTotales === 0 && c.egresosTotales > 0, message: "Registrá tus ingresos para entender cuánto podés cubrir de los gastos actuales." },
    { check: (c) => c.resultado < 0, message: "Tus egresos superan a tus ingresos. Podés revisar rubros variables y, si hace falta, renegociar algunos gastos fijos." },
    { check: (c) => c.saldoProyectado < 0, message: "Con la proyección actual podras cerrar el mes en negativo. Revisá ingresos, gastos y ahorro deseado para corregirlo a tiempo." },
    { check: (c) => c.ingresosTotales > 0 && c.egresosTotales >= c.ingresosTotales * 0.9, message: "Tus gastos consumen más del 90% del ingreso. Bajar algunos rubros variables puede darte un poco más de margen." },
    { check: (c) => c.totalPrestamos > c.ingresosTotales * 0.3, message: "Las cuotas de préstamos superan el 30% del ingreso. Si sentís presión, podés evaluar alternativas para reorganizar esas deudas." },
    { check: (c) => c.totalTarjetas > c.ingresosTotales * 0.3, message: "Las tarjetas y suscripciones consumen una parte importante del ingreso. Revisá qué servicios usás realmente y cuáles podrías pausar." },
    { check: (c) => c.totalCompras > c.ingresosTotales * 0.5, message: "Las compras planificadas pesan casi la mitad del ingreso. Podés repartirlas en varios meses para que el impacto sea menor." },
    { check: (c) => c.ingresosTotales > 0 && c.totalTarjetas > 0 && c.capacidadMensual <= 0, message: "Las tarjetas están reduciendo tu margen mensual. Revisá cuotas, montos y fechas para recuperar algo de aire." },
    { check: (c) => c.capacidadMensual < 0 && c.totalPrestamos === 0 && c.totalTarjetas === 0, message: "El rojo proviene principalmente de gastos corrientes. Mirá tus consumos diarios para encontrar recortes posibles." },
    { check: (c) => c.capacidadMensual > 0 && c.capacidadMensual <= c.ingresosTotales * 0.05, message: "Tu margen es menor al 5% del ingreso. Aumentar ingresos o bajar algunos gastos puede darte más respiro." },
    { check: (c) => c.capacidadMensual > c.ingresosTotales * 0.4, message: "Podés guardar parte del margen mensual para objetivos de mediano plazo o, si lo ves conveniente, para futuras inversiones." },
    { check: (c) => c.ahorroDeseado > c.ingresosTotales * 0.5 && c.ingresosTotales > 0, message: "El objetivo de ahorro supera la mitad de tu ingreso mensual. Revisá si es realista para tu situación actual." },
    { check: (c) => c.ahorroDeseado === 0 && c.ingresosTotales > 0, message: "Definí un objetivo de ahorro mensual para aprovechar mejor tus ingresos." },
    { check: (c) => c.capacidadMensual < 0 && c.ahorroDeseado > 0, message: "Si querés evitar terminar en rojo, podés ajustar el ahorro deseado o recortar algunos gastos por este mes." },
    { check: (c) => c.saldoInicial < 0 && c.resultado > 0, message: "Buen dato: generás superávit y podrías ir saliendo del saldo negativo inicial si mantenés la tendencia." },
    { check: (c) => c.saldoInicial > 0 && c.resultado < 0, message: "El saldo inicial ayuda a cubrir el rojo de este mes. Mirá si podés hacer ajustes para no depender siempre de ese colchón." },
    { check: (c) => c.ingresosTotales > 0 && c.egresosTotales <= c.ingresosTotales * 0.5, message: "Gastás menos de la mitad de lo que ganás. Podés destinar una parte a ahorro, objetivos o inversiones futuras." },
    { check: (c) => c.resultado === 0 && c.ingresosTotales > 0, message: "Est\u00dfs en punto de equilibrio exacto. Un ajuste pequeño puede definir si el mes termina en superávit o déficit." },
    { check: (c) => c.capacidadMensual > 0 && c.saldoProyectado > c.saldoInicial, message: "Tu saldo final crece este mes. Seguilo de cerca para mantener la tendencia." },
    { check: (c) => c.capacidadMensual > 0 && c.totalPrestamos === 0 && c.totalTarjetas === 0, message: "No tenés deudas registradas. Podrías aprovechar el margen para armar un fondo de emergencia." },
    { check: (c) => c.totalCompras > 0 && c.capacidadMensual > 0, message: "Reserv\u0137 parte del margen para cubrir las compras planificadas sin endeudarte." },
    { check: (c) => c.graficoIngresos.length >= 6, message: "Tenés varias fuentes de ingreso. Mantenelas actualizadas para medir su peso real." },
    { check: (c) => c.graficoIngresos.length === 1 && c.ingresosTotales > 0, message: "Dependés de una sola fuente de ingreso. A futuro podrías evaluar sumar otra para tener más estabilidad." },
    { check: (c) => c.graficoEgresos.length >= 8, message: "Tus egresos están muy atomizados. Etiquetar bien las categorías ayuda a detectar los gastos que podrias reducir." },
    { check: (c) => c.graficoEgresos.length <= 2 && c.egresosTotales > 0, message: "La mayoría de tus gastos están concentrados en pocos rubros. Un ajuste puntual puede lograr mucho." },
    { check: (c) => !c.includeGeneral && c.totalEstimables === 0, message: "Activaste la estimacióen específica pero no cargaste préstamos ni compras estimables." },
    { check: (c) => c.includeGeneral && c.tieneEspecifica, message: "Ya tenés datos específicos. Si querés usarlos en Home, activá ese modo desde las estimaciones." },
    { check: (c) => !c.includeGeneral && c.tieneGeneral, message: "Recordá revisar la estimación general aunque hoy estás usando la específica." },
    { check: (c) => c.ingresosGen > 0 && c.ingresosEsp > 0, message: "Tanto la estimación general como la específica tienen ingresos. Mantenelas consistentes para evitar confusiones." },
    { check: (c) => c.egresosGen > 0 && c.egresosEsp === 0 && !c.includeGeneral, message: "No hay egresos en la estimación específica. Migrá tus datos antes de usar este modo como referencia principal." },
    { check: (c) => c.egresosEsp > 0 && c.egresosGen === 0 && c.includeGeneral, message: "Solo cargaste egresos en la estimación específica. Activala para ver resultados más cercanos a tu realidad." },
    { check: (c) => c.ingresosTotales > 0 && c.totalCompras > 0 && c.egresosTotales === 0, message: "Anotá tus egresos recurrentes para estimar cómo impactan esas compras próximas." },
  ];

  const tips = [];
  tipCatalog.forEach((tip) => {
    try {
      if (tip.check(ctx)) tips.push(tip.message);
    } catch {}
  });

  if (tips.length === 0) {
    tips.push("Todo en orden. Segu\u0112 registrando tus movimientos para mantener el control. Estas sugerencias son solo orientativas.");
  }

  return tips.slice(0, 5);
}
