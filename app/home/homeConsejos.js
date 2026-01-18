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
    { check: (c) => c.ingresosTotales === 0 && c.egresosTotales === 0, message: "Carg\u0137 tus ingresos y egresos para ver recomendaciones personalizadas." },
    { check: (c) => c.ingresosTotales > 0 && c.egresosTotales === 0, message: "Agreg\u0137 tus egresos recurrentes para medir el impacto real de tus ingresos." },
    { check: (c) => c.ingresosTotales === 0 && c.egresosTotales > 0, message: "Registr\u0137 tus ingresos para entender cu\u00dfnto pod\u0137s cubrir de los gastos actuales." },
    { check: (c) => c.resultado < 0, message: "Tus egresos superan a tus ingresos. Pod\u0137s revisar rubros variables y, si hace falta, renegociar algunos gastos fijos." },
    { check: (c) => c.saldoProyectado < 0, message: "Con la proyecci\u00ben actual podr\u0112as cerrar el mes en negativo. Revis\u0137 ingresos, gastos y ahorro deseado para corregirlo a tiempo." },
    { check: (c) => c.ingresosTotales > 0 && c.egresosTotales >= c.ingresosTotales * 0.9, message: "Tus gastos consumen m\u00dfs del 90% del ingreso. Bajar algunos rubros variables puede darte un poco m\u00dfs de margen." },
    { check: (c) => c.totalPrestamos > c.ingresosTotales * 0.3, message: "Las cuotas de pr\u0137stamos superan el 30% del ingreso. Si sent\u0112s presi\u00ben, pod\u0137s evaluar alternativas para reorganizar esas deudas." },
    { check: (c) => c.totalTarjetas > c.ingresosTotales * 0.3, message: "Las tarjetas y suscripciones consumen una parte importante del ingreso. Revis\u0137 qu\u0137 servicios us\u00dfs realmente y cu\u00dfles podr\u0112as pausar." },
    { check: (c) => c.totalCompras > c.ingresosTotales * 0.5, message: "Las compras planificadas pesan casi la mitad del ingreso. Pod\u0137s repartirlas en varios meses para que el impacto sea menor." },
    { check: (c) => c.ingresosTotales > 0 && c.totalTarjetas > 0 && c.capacidadMensual <= 0, message: "Las tarjetas est\u00dfn reduciendo tu margen mensual. Revis\u0137 cuotas, montos y fechas para recuperar algo de aire." },
    { check: (c) => c.capacidadMensual < 0 && c.totalPrestamos === 0 && c.totalTarjetas === 0, message: "El rojo proviene principalmente de gastos corrientes. Mir\u0137 tus consumos diarios para encontrar recortes posibles." },
    { check: (c) => c.capacidadMensual > 0 && c.capacidadMensual <= c.ingresosTotales * 0.05, message: "Tu margen es menor al 5% del ingreso. Aumentar ingresos o bajar algunos gastos puede darte m\u00dfs respiro." },
    { check: (c) => c.capacidadMensual > c.ingresosTotales * 0.4, message: "Pod\u0137s guardar parte del margen mensual para objetivos de mediano plazo o, si lo ves conveniente, para futuras inversiones." },
    { check: (c) => c.ahorroDeseado > c.ingresosTotales * 0.5 && c.ingresosTotales > 0, message: "El objetivo de ahorro supera la mitad de tu ingreso mensual. Revis\u0137 si es realista para tu situaci\u00ben actual." },
    { check: (c) => c.ahorroDeseado === 0 && c.ingresosTotales > 0, message: "Defin\u0112 un objetivo de ahorro mensual para aprovechar mejor tus ingresos." },
    { check: (c) => c.capacidadMensual < 0 && c.ahorroDeseado > 0, message: "Si quer\u0137s evitar terminar en rojo, pod\u0137s ajustar el ahorro deseado o recortar algunos gastos por este mes." },
    { check: (c) => c.saldoInicial < 0 && c.resultado > 0, message: "Buen dato: gener\u0137s super\u00dfvit y podr\u0112as ir saliendo del saldo negativo inicial si manten\u0137s la tendencia." },
    { check: (c) => c.saldoInicial > 0 && c.resultado < 0, message: "El saldo inicial ayuda a cubrir el rojo de este mes. Mir\u0137 si pod\u0137s hacer ajustes para no depender siempre de ese colch\u00ben." },
    { check: (c) => c.ingresosTotales > 0 && c.egresosTotales <= c.ingresosTotales * 0.5, message: "Gast\u0137s menos de la mitad de lo que gan\u0137s. Pod\u0137s destinar una parte a ahorro, objetivos o inversiones futuras." },
    { check: (c) => c.resultado === 0 && c.ingresosTotales > 0, message: "Est\u00dfs en punto de equilibrio exacto. Un ajuste peque\u00b1o puede definir si el mes termina en super\u00dfvit o d\u0137ficit." },
    { check: (c) => c.capacidadMensual > 0 && c.saldoProyectado > c.saldoInicial, message: "Tu saldo final crece este mes. Seguilo de cerca para mantener la tendencia." },
    { check: (c) => c.capacidadMensual > 0 && c.totalPrestamos === 0 && c.totalTarjetas === 0, message: "No ten\u0137s deudas registradas. Podr\u0112as aprovechar el margen para armar un fondo de emergencia." },
    { check: (c) => c.totalCompras > 0 && c.capacidadMensual > 0, message: "Reserv\u0137 parte del margen para cubrir las compras planificadas sin endeudarte." },
    { check: (c) => c.graficoIngresos.length >= 6, message: "Ten\u0137s varias fuentes de ingreso. Mantenelas actualizadas para medir su peso real." },
    { check: (c) => c.graficoIngresos.length === 1 && c.ingresosTotales > 0, message: "Depend\u0137s de una sola fuente de ingreso. A futuro podr\u0112as evaluar sumar otra para tener m\u00dfs estabilidad." },
    { check: (c) => c.graficoEgresos.length >= 8, message: "Tus egresos est\u00dfn muy atomizados. Etiquetar bien las categor\u0112as ayuda a detectar los gastos que pod\u0137s reducir." },
    { check: (c) => c.graficoEgresos.length <= 2 && c.egresosTotales > 0, message: "La mayor\u0112a de tus gastos est\u00df concentrada en pocos rubros. Un ajuste puntual puede lograr mucho." },
    { check: (c) => !c.includeGeneral && c.totalEstimables === 0, message: "Activaste la estimaci\u00ben espec\u0112fica pero no cargaste pr\u0137stamos ni compras estimables." },
    { check: (c) => c.includeGeneral && c.tieneEspecifica, message: "Ya ten\u0137s datos espec\u0112ficos. Si quer\u0137s usarlos en Home, activ\u0137 ese modo desde las estimaciones." },
    { check: (c) => !c.includeGeneral && c.tieneGeneral, message: "Record\u0137 revisar la estimaci\u00ben general aunque hoy est\u0137s usando la espec\u0112fica." },
    { check: (c) => c.ingresosGen > 0 && c.ingresosEsp > 0, message: "Tanto la estimaci\u00ben general como la espec\u0112fica tienen ingresos. Mantenelas consistentes para evitar confusiones." },
    { check: (c) => c.egresosGen > 0 && c.egresosEsp === 0 && !c.includeGeneral, message: "No hay egresos en la estimaci\u00ben espec\u0112fica. Migr\u0137 tus datos antes de usar este modo como referencia principal." },
    { check: (c) => c.egresosEsp > 0 && c.egresosGen === 0 && c.includeGeneral, message: "Solo cargaste egresos en la estimaci\u00ben espec\u0112fica. Activala para ver resultados m\u00dfs cercanos a tu realidad." },
    { check: (c) => c.ingresosTotales > 0 && c.totalCompras > 0 && c.egresosTotales === 0, message: "Anot\u0137 tus egresos recurrentes para estimar c\u00bemo impactan esas compras pr\u00beximas." },
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
