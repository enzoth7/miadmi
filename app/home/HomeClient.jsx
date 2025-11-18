"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import PremiumBadge from "../../components/PremiumBadge";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

const LS_GEN = "miadmi:estimacion_general";
const LS_ESP = "miadmi:estimacion_especifica";
const LS_METAS = "miadmi:metas";
const LS_ESTIMABLES = "miadmi:egresos_estimables";

const EXCHANGE_USD = null;

const palette = ["#0ea5e9", "#1e293b", "#fb7185", "#22c55e", "#f97316", "#a855f7", "#14b8a6", "#8b5cf6"];

const n = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

const fmtUYU = (v, maxFrac = 0) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: maxFrac,
  }).format(v || 0);

const toUSD = (v) => {
  if (!EXCHANGE_USD || EXCHANGE_USD <= 0) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format((v || 0) / EXCHANGE_USD);
};

function sumArrayMonto(arr) {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((a, it) => a + n(it?.monto), 0);
}

function mapArrayToPairs(arr, kindLabel) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((it) => n(it?.monto) > 0)
    .map((it) => ({
      name: String(it?.nombre || "Sin nombre"),
      value: n(it?.monto),
      kind: kindLabel,
    }));
}

function flattenNumericObject(obj, kindLabel) {
  if (!obj || typeof obj !== "object") return [];
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const val = n(v);
    if (val > 0) out.push({ name: titleCase(k), value: val, kind: kindLabel });
  }
  return out;
}

function mergePairs(pairs) {
  const grouped = new Map();
  for (const { name, value } of pairs) {
    if (!name || !Number.isFinite(value)) continue;
    const key = stripAccents(name);
    grouped.set(key, (grouped.get(key) ?? 0) + value);
  }
  return Array.from(grouped.entries()).map(([key, value]) => ({
    name: titleCase(key),
    value,
  }));
}

function titleCase(s) {
  try {
    return String(s)
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase());
  } catch {
    return String(s || "");
  }
}

function stripAccents(s) {
  try {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  } catch {
    return String(s || "").toLowerCase();
  }
}

export default function HomeClient() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const verifyRef = useRef(false);

  const [general, setGeneral] = useState(null);
  const [especifica, setEspecifica] = useState(null);
  const [metas, setMetas] = useState([]);
  const [draft, setDraft] = useState({ nombre: "", monto: "", ahorrado: "" });
  const [estimables, setEstimables] = useState({ prestamos: [], tarjetas: [], compras: [] });

  useEffect(() => {
    if (verifyRef.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const subscriptionFlag = params.get("subscription");
    const preapprovalId = params.get("preapproval_id");

    if (subscriptionFlag !== "1" || !preapprovalId) return;
    verifyRef.current = true;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        await fetch("/api/mp/verify-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ preapproval_id: preapprovalId }),
        });
      } catch (err) {
        console.error("Failed to verify subscription", err);
      } finally {
        params.delete("subscription");
        params.delete("preapproval_id");
        const nextParams = params.toString();
        const nextUrl = nextParams ? `/home?${nextParams}` : "/home";
        router.replace(nextUrl);
      }
    })();
  }, [router, supabase]);

  useEffect(() => {
    try {
      const rawG = localStorage.getItem(LS_GEN);
      if (rawG) setGeneral(JSON.parse(rawG));
    } catch {}
    try {
      const rawE = localStorage.getItem(LS_ESP);
      if (rawE) setEspecifica(JSON.parse(rawE));
    } catch {}
    try {
      const rawM = localStorage.getItem(LS_METAS);
      if (rawM) {
        const arr = JSON.parse(rawM);
        if (Array.isArray(arr)) setMetas(arr);
      }
    } catch {}
    try {
      const rawEE = localStorage.getItem(LS_ESTIMABLES);
      if (rawEE) {
        const s = JSON.parse(rawEE);
        setEstimables({
          prestamos: Array.isArray(s?.prestamos) ? s.prestamos : [],
          tarjetas: Array.isArray(s?.tarjetas) ? s.tarjetas : [],
          compras: Array.isArray(s?.compras) ? s.compras : [],
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    const readAll = () => {
      try {
        const rawG = localStorage.getItem(LS_GEN);
        if (rawG) setGeneral(JSON.parse(rawG));
      } catch {}
      try {
        const rawE = localStorage.getItem(LS_ESP);
        if (rawE) setEspecifica(JSON.parse(rawE));
      } catch {}
      try {
        const rawM = localStorage.getItem(LS_METAS);
        if (rawM) {
          const arr = JSON.parse(rawM);
          if (Array.isArray(arr)) setMetas(arr);
        }
      } catch {}
      try {
        const rawEE = localStorage.getItem(LS_ESTIMABLES);
        if (rawEE) {
          const s = JSON.parse(rawEE);
          setEstimables({
            prestamos: Array.isArray(s?.prestamos) ? s.prestamos : [],
            tarjetas: Array.isArray(s?.tarjetas) ? s.tarjetas : [],
            compras: Array.isArray(s?.compras) ? s.compras : [],
          });
        }
      } catch {}
    };

    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        readAll();
      }
    };

    window.addEventListener("focus", readAll);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", readAll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_METAS, JSON.stringify(metas));
    } catch {}
  }, [metas]);

  const ingresosGen = n(general?.sueldos) + n(general?.otrosIngresos);

  const egresosGen = useMemo(() => {
    const arr = Array.isArray(general?.egresos) ? general.egresos : [];
    return arr.reduce((acc, e) => acc + n(e?.monto), 0);
  }, [general]);

  const ingresosEsp = useMemo(() => {
    if (!especifica) return 0;
    if (Array.isArray(especifica.ingresos)) return sumArrayMonto(especifica.ingresos);
    if (especifica.ingresos && typeof especifica.ingresos === "object") {
      return flattenNumericObject(especifica.ingresos).reduce((a, it) => a + it.value, 0);
    }
    return 0;
  }, [especifica]);

  const egresosEsp = useMemo(() => {
    if (!especifica) return 0;
    if (Array.isArray(especifica.egresos)) return sumArrayMonto(especifica.egresos);
    if (especifica.egresos && typeof especifica.egresos === "object") {
      return flattenNumericObject(especifica.egresos).reduce((a, it) => a + it.value, 0);
    }
    return 0;
  }, [especifica]);

  const ingresosTotales = ingresosGen + ingresosEsp;
  const egresosTotales = egresosGen + egresosEsp;
  const resultado = ingresosTotales - egresosTotales;

  const ahorroDeseado = n(general?.ahorroDeseado);
  const saldoInicial = n(general?.saldoInicial);
  const capacidadMensual = resultado - ahorroDeseado;
  const saldoProyectado = saldoInicial + resultado;

  const graficoEgresos = useMemo(() => {
    const base = Array.isArray(general?.egresos) ? general.egresos : [];
    const espec =
      Array.isArray(especifica?.egresos) || especifica?.egresos
        ? mapArrayToPairs(especifica?.egresos, "especifica")
        : [];

    const basePairs = base
      .filter((it) => n(it?.monto) > 0)
      .map((it) => ({
        name: String(it?.nombre || "Sin nombre"),
        value: n(it?.monto),
        kind: "general",
      }));

    const merged = [...basePairs, ...espec];
    if (merged.length === 0) return [];

    const group = new Map();
    for (const item of merged) {
      const key = stripAccents(item.name);
      group.set(key, (group.get(key) ?? 0) + item.value);
    }

    return Array.from(group.entries()).map(([key, value]) => ({
      name: titleCase(key),
      value,
    }));
  }, [general, especifica]);

  const graficoIngresos = useMemo(() => {
    const base = [];
    if (n(general?.sueldos) > 0) base.push({ name: "Sueldos / Honorarios", value: n(general?.sueldos) });
    if (n(general?.otrosIngresos) > 0) base.push({ name: "Otros ingresos", value: n(general?.otrosIngresos) });

    const espec =
      Array.isArray(especifica?.ingresos) || especifica?.ingresos
        ? mapArrayToPairs(especifica?.ingresos, "especifica")
        : [];

    if (espec.length > 0) {
      const group = new Map();
      for (const item of espec) {
        const key = stripAccents(item.name);
        group.set(key, (group.get(key) ?? 0) + item.value);
      }
      for (const [key, value] of group.entries()) {
        base.push({ name: titleCase(key), value });
      }
    }

    return base;
  }, [general, especifica]);

  const metasCalculadas = metas.map((meta) => {
    const monto = n(meta?.monto);
    const ahorrado = n(meta?.ahorrado);
    const faltante = Math.max(monto - ahorrado, 0);
    const pct = monto > 0 ? Math.min((ahorrado / monto) * 100, 100) : 0;
    const meses = capacidadMensual > 0 ? Math.ceil(faltante / capacidadMensual) : Infinity;
    return {
      ...meta,
      monto,
      ahorrado,
      faltante,
      pct,
      meses: Number.isFinite(meses) ? meses : Infinity,
      id: meta.id || cryptoRandom(),
    };
  });

  metasCalculadas.sort((a, b) => a.pct - b.pct);

  const metasConTiempo = metasCalculadas
    .filter((meta) => Number.isFinite(meta.meses))
    .map((meta) => ({
      name: meta.nombre || "Meta sin nombre",
      meses: meta.meses,
      faltante: meta.faltante,
    }));

  const consejos = useMemo(() => {
    const tips = [];

    if (ingresosTotales === 0 && egresosTotales === 0) {
      tips.push("ComenzA cargando tus ingresos y egresos para ver anAlisis personalizado.");
    }

    if (ingresosTotales > 0 && resultado <= 0) {
      tips.push(
        "Tus egresos igualan o superan tus ingresos. RevisA egresos variables para reducirlos o planteate aumentar tus ingresos."
      );
    }

    if (ahorroDeseado > 0 && capacidadMensual < 0) {
      tips.push(
        "Con el ahorro deseado actual te quedAs sin margen mensual. ConsiderA bajar el objetivo de ahorro o ajustar egresos."
      );
    }

    if (metasConTiempo.length > 0) {
      const metaLenta = metasConTiempo.reduce((max, actual) => (actual.meses > max.meses ? actual : max));
      tips.push(
        `La meta "${metaLenta.name}" requiere aproximadamente ${metaLenta.meses} meses. PodAs aumentar el aporte mensual para alcanzarla antes.`
      );
    }

    if (egresosTotales > ingresosTotales * 0.7) {
      tips.push("Tus egresos representan mAs del 70% de tus ingresos. RevisA gastos fijos para liberar presupuesto.");
    }

    if (EXCHANGE_USD && ingresosTotales > 0) {
      tips.push(
        `Tus ingresos equivalen a ${toUSD(ingresosTotales)} al tipo de cambio configurado. AjustA EXCHANGE_USD para ver otra referencia.`
      );
    }

    return tips.slice(0, 5);
  }, [ingresosTotales, resultado, ahorroDeseado, capacidadMensual, metasConTiempo, egresosTotales]);

  function addMeta() {
    if (!draft.nombre || !draft.monto) return;
    setMetas((prev) => [
      ...prev,
      {
        id: cryptoRandom(),
        nombre: draft.nombre,
        monto: draft.monto,
        ahorrado: draft.ahorrado || "0",
      },
    ]);
    setDraft({ nombre: "", monto: "", ahorrado: "" });
  }

  function removeMeta(id) {
    setMetas((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMeta(id, patch) {
    setMetas((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }

  function updateEstimable(kind, list) {
    setEstimables((prev) => ({ ...prev, [kind]: list }));
    try {
      localStorage.setItem(LS_ESTIMABLES, JSON.stringify({ ...estimables, [kind]: list }));
    } catch {}
  }

  const resumenCards = [
    {
      label: "Resultado del mes",
      value: fmtUYU(resultado),
      icon: resultado >= 0 ? TrendingUp : TrendingDown,
      tone: resultado >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
      description: resultado >= 0 ? "SuperAvit" : "DAficit",
    },
    {
      label: "Ingresos totales",
      value: fmtUYU(ingresosTotales),
      icon: TrendingUp,
      tone: "text-sky-600 bg-sky-50",
      description: toUSD(ingresosTotales) ? `a ${toUSD(ingresosTotales)}` : "Ingresos declarados",
    },
    {
      label: "Egresos totales",
      value: fmtUYU(egresosTotales),
      icon: TrendingDown,
      tone: "text-slate-600 bg-slate-100",
      description: `${fmtUYU(egresosTotales - egresosGen)} variables / ${fmtUYU(egresosGen)} fijos`,
    },
    {
      label: "Capacidad mensual",
      value: fmtUYU(capacidadMensual),
      icon: CheckCircle2,
      tone: "text-emerald-600 bg-emerald-50",
      description: capacidadMensual >= 0 ? "Margen despuAs del ahorro" : "Revisar objetivos",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            {format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-white">Hola de nuevo</h2>
          <p className="text-sm text-white/80">
            ConsolidA tus ingresos, egresos y metas para ver cAmo evoluciona tu economAa personal.
          </p>
        </div>
        <PremiumBadge />
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {resumenCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{card.label}</span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${card.tone}`}>
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            <div className="text-2xl font-semibold text-slate-900">{card.value}</div>
            <p className="text-xs text-slate-500">{card.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">DistribuciAn de ingresos</h3>
            <span className="text-xs text-slate-500">
              {graficoIngresos.length ? `${graficoIngresos.length} categorAas` : "Sin datos"}
            </span>
          </div>
          <div className="h-72">
            {graficoIngresos.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={graficoIngresos} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={4}>
                    {graficoIngresos.map((entry, index) => (
                      <Cell key={entry.name} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                RegistrA al menos un ingreso para ver la distribuciAn.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">DistribuciAn de egresos</h3>
            <span className="text-xs text-slate-500">
              {graficoEgresos.length ? `${graficoEgresos.length} categorAas` : "Sin datos"}
            </span>
          </div>
          <div className="h-72">
            {graficoEgresos.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={graficoEgresos} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={4}>
                    {graficoEgresos.map((entry, index) => (
                      <Cell key={entry.name} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                RegistrA egresos para identificar los rubros mAs pesados.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Metas de ahorro</h3>
            <p className="text-sm text-slate-500">
              ControlA cuAnto falta para cada objetivo y en cuAntos meses lo alcanzAs con la capacidad actual.
            </p>
          </div>
          <button
            type="button"
            onClick={addMeta}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" />
            Agregar meta
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Meta</th>
                <th className="px-3 py-2 text-right">Objetivo</th>
                <th className="px-3 py-2 text-right">Ahorrado</th>
                <th className="px-3 py-2 text-right">% Avance</th>
                <th className="px-3 py-2 text-right">Meses</th>
                <th className="px-3 py-2 text-right">AcciAn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {metasCalculadas.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2">
                    <input
                      className="w-full bg-transparent outline-none"
                      value={m.nombre ?? ""}
                      onChange={(e) => updateMeta(m.id, { nombre: e.target.value })}
                      placeholder="Nombre de la meta"
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <input
                      className="w-full text-right bg-transparent outline-none"
                      value={String(m.monto ?? "")}
                      onChange={(e) => updateMeta(m.id, { monto: e.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <input
                      className="w-full text-right bg-transparent outline-none"
                      value={String(m.ahorrado ?? "")}
                      onChange={(e) => updateMeta(m.id, { ahorrado: e.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {Math.round(m.pct * 10) / 10}%
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {m.meses > 0 && Number.isFinite(m.meses) ? m.meses : "a"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeMeta(m.id)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50/70">
                <td className="px-3 py-2">
                  <input
                    className="w-full bg-transparent outline-none"
                    placeholder="Nueva meta"
                    value={draft.nombre}
                    onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    className="w-full text-right bg-transparent outline-none"
                    placeholder="0"
                    value={draft.monto}
                    onChange={(e) => setDraft((d) => ({ ...d, monto: e.target.value }))}
                    inputMode="decimal"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    className="w-full text-right bg-transparent outline-none"
                    placeholder="0"
                    value={draft.ahorrado}
                    onChange={(e) => setDraft((d) => ({ ...d, ahorrado: e.target.value }))}
                    inputMode="decimal"
                  />
                </td>
                <td className="px-3 py-2 text-right text-slate-400">a</td>
                <td className="px-3 py-2 text-right text-slate-400">a</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={addMeta}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-white"
                  >
                    <Plus className="h-3 w-3" />
                    Guardar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-900">Consejos personalizados</h3>
        </div>
        {consejos.length === 0 ? (
          <p className="text-sm text-slate-600">
            CargA tus datos bAsicos y metas para recibir sugerencias puntuales.
          </p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-700">
            {consejos.map((tip, idx) => (
              <li key={idx} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                {tip}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function cryptoRandom() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2, 10);
}

