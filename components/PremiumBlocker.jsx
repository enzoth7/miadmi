"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COPY = {
  general: {
    title: "Función premium",
    description: "Para agragar, editar o eliminar categorias suscribite a Mi Admi Premium",
  },
  export: {
    title: "Función premium",
    description: "Las exportaciones están disponibles con Mi Admi Premium.",
  },
  adjustments: {
    title: "Función premium",
    description: "Los ajustes avanzados para cada mes están disponibles con Mi Admi Premium.",
  },
  estimables: {
  title: "Función premium",
  description: "En el plan Free podés guardar hasta 5 movimientos estimables. Pasate a Mi Admi Premium para agregar ilimitados.",
},
};

export default function PremiumBlocker() {
  const [state, setState] = useState({ open: false, reason: "general" });

  useEffect(() => {
    const handler = (event) => {
      const reason = event?.detail?.reason || "general";
      setState({ open: true, reason });
    };

    window.addEventListener("miadmi:premium-block", handler);
    return () => window.removeEventListener("miadmi:premium-block", handler);
  }, []);

  if (!state.open) return null;

  const copy = COPY[state.reason] || COPY.general;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white p-5 text-slate-900 shadow-2xl">
        <h3 className="text-lg font-bold">{copy.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{copy.description}</p>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setState({ open: false, reason: "general" })}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>

          <Link
            href="/paywall"
            className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Ir a Premium
          </Link>
        </div>
      </div>
    </div>
  );
}
