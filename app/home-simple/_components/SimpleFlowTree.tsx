"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SimpleSummarySnapshot } from "./simple-utils";
import { formatCurrencyValue } from "./simple-utils";
import { SIMPLE_FLOW_KEY, readLocalStorage, writeLocalStorage } from "./simple-storage";

type SimpleFlowTreeProps = {
  summary: SimpleSummarySnapshot;
  supabase?: SupabaseClient;     // ✅ opcional
  userId?: string | null;        // ✅ opcional
  onFinished?: (finished: boolean) => void;
  onClose?: () => void;
};

type FlowAnswers = {
  A?: string;
  B?: string;
  C?: string;
  E?: string;
};

type FlowState = {
  answers: FlowAnswers;
  showProjection: boolean;
  introChoice: "estimate" | "skip" | null;
  updatedAt: string | null;
};

const DEFAULT_FLOW: FlowState = {
  answers: {},
  showProjection: false,
  introChoice: null,
  updatedAt: null,
};

const normalizeFlowState = (raw: any): FlowState => ({
  answers: raw && typeof raw.answers === "object" ? raw.answers : {},
  showProjection: Boolean(raw?.showProjection),
  introChoice:
    raw?.introChoice === "estimate" || raw?.introChoice === "skip"
      ? raw.introChoice
      : null,
  updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null,
});

const resolveActiveStep = (answers: FlowAnswers) => {
  if (!answers.A) return "A";
  if (answers.A === "No") {
    if (!answers.B) return "B";
    if (answers.B === "Gasto en más cosas") {
      if (!answers.C) return "C";
      return "DONE";
    }
    if (answers.B === "Nunca me sobra") {
      if (!answers.E) return "E";
      if (answers.E === "Sí") {
        if (!answers.C) return "C";
      }
      return "DONE";
    }
  }
  if (answers.A === "Sí") {
    if (!answers.E) return "E";
    if (answers.E === "Sí") {
      if (!answers.C) return "C";
      return "DONE";
    }
    return "DONE";
  }
  return "DONE";
};

const Bubble = ({
  children,
  tone = "assistant",
}: {
  children: ReactNode;
  tone?: "assistant" | "user";
}) => (
  <div
    className={[
      "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
      tone === "assistant"
        ? "bg-slate-100 text-slate-700"
        : "ml-auto bg-slate-900 text-white",
    ].join(" ")}
  >
    {children}
  </div>
);

export default function SimpleFlowTree({
  summary,
  supabase,
  userId,
  onFinished,
  onClose,
}: SimpleFlowTreeProps) {
  const [flow, setFlow] = useState<FlowState>(DEFAULT_FLOW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ✅ 1) siempre hydrata local primero (modo demo)
  useEffect(() => {
    const local = readLocalStorage<FlowState | null>(SIMPLE_FLOW_KEY, null);
    if (local) setFlow(normalizeFlowState(local));
  }, []);

  // ✅ 2) si hay supabase+userId, intenta traer remote y hacer merge por updatedAt
  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;

    (async () => {
      const { data, error: fetchError } = await supabase
        .from("simple_flow_state")
        .select("state, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active || fetchError || !data) return;

      const remote = normalizeFlowState({
        ...(data.state ?? {}),
        updatedAt: data.updated_at ?? null,
      });

      setFlow((prev) => {
        const prevTime = prev.updatedAt ? Date.parse(prev.updatedAt) : 0;
        const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;

        if (remoteTime > prevTime) {
          writeLocalStorage(SIMPLE_FLOW_KEY, remote);
          return remote;
        }
        return prev;
      });
    })();

    return () => {
      active = false;
    };
  }, [supabase, userId]);

  const activeStep = useMemo(() => resolveActiveStep(flow.answers), [flow.answers]);

  const hasSurplus = summary.surplus !== null;
  const allowTree = hasSurplus || flow.introChoice === "estimate";
  const showIntroText = !hasSurplus;
  const showIntroActions = !hasSurplus && flow.introChoice === null;

  const showB = allowTree && flow.answers.A === "No";
  const showE = allowTree && (flow.answers.A === "Sí" || flow.answers.B === "Nunca me sobra");
  const showC = allowTree && (flow.answers.B === "Gasto en más cosas" || flow.answers.E === "Sí");
  const showProjection = allowTree && (flow.showProjection || flow.answers.E === "No");

  const flowFinished = useMemo(() => {
    if (!allowTree) return flow.introChoice === "skip";
    if (showProjection) return false;
    return activeStep === "DONE";
  }, [activeStep, allowTree, flow.introChoice, showProjection]);

  useEffect(() => {
    onFinished?.(flowFinished);
  }, [flowFinished, onFinished]);

  // ✅ Guarda local siempre. Si hay supabase+userId, también remoto.
  const saveFlow = async (next: FlowState) => {
    setFlow(next);
    writeLocalStorage(SIMPLE_FLOW_KEY, next);

    if (!supabase || !userId) return { ok: true };

    const { error: upsertError } = await supabase
      .from("simple_flow_state")
      .upsert(
        {
          user_id: userId,
          state: {
            answers: next.answers,
            showProjection: next.showProjection,
            introChoice: next.introChoice,
          },
          updated_at: next.updatedAt,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      return { ok: false, message: "No pude guardar, probá de nuevo." };
    }
    return { ok: true };
  };

  const handleSelect = async (key: keyof FlowAnswers, value: string) => {
    if (saving) return;
    setSaving(true);
    setError("");

    const nextAnswers = { ...flow.answers, [key]: value };
    const nextState: FlowState = {
      answers: nextAnswers,
      showProjection: flow.showProjection || (key === "E" && value === "No"),
      introChoice: flow.introChoice,
      updatedAt: new Date().toISOString(),
    };

    const result = await saveFlow(nextState);
    setSaving(false);

    if (!result.ok) setError(result.message ?? "No pude guardar, probá de nuevo.");
  };

  const handleIntroChoice = async (choice: "estimate" | "skip") => {
    if (saving) return;
    setSaving(true);
    setError("");

    const nextAnswers = { ...flow.answers };
    if (choice === "estimate" && !nextAnswers.A) {
      nextAnswers.A = "No";
    }

    const nextState: FlowState = {
      answers: nextAnswers,
      showProjection: flow.showProjection,
      introChoice: choice,
      updatedAt: new Date().toISOString(),
    };

    const result = await saveFlow(nextState);
    setSaving(false);

    if (!result.ok) setError(result.message ?? "No pude guardar, probá de nuevo.");
  };

  const tableRows = useMemo(() => {
    const income = summary.income;
    const expenses = summary.expenses;
    const surplus = summary.surplus;

    const formatOrDash = (value: number | null) => (value === null ? "-" : formatCurrencyValue(value));
    const monthValues = (value: number | null) => [0, 1, 2].map(() => formatOrDash(value));

    return [
      { label: "Ingresos", values: monthValues(income) },
      { label: "Egresos", values: monthValues(expenses) },
      { label: "Te sobra", values: monthValues(surplus) },
      {
        label: "Saldo al final",
        values:
          surplus === null
            ? ["-", "-", "-"]
            : [1, 2, 3].map((idx) => formatCurrencyValue(Math.round(surplus * idx))),
      },
    ];
  }, [summary]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/95 p-6 text-slate-900 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lo vemos juntos</h3>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-slate-700"
          >
            Cerrar
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {showIntroText ? <Bubble>Todavía no lo sabemos.</Bubble> : null}

        {showIntroActions ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleIntroChoice("estimate")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              Quiero estimarlo
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleIntroChoice("skip")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              Ahora no
            </button>
          </div>
        ) : null}

        {allowTree ? (
          <>
            {hasSurplus ? (
              <>
                <Bubble>
                  <p>Te sobra aprox: {summary.surplusLabel}.</p>
                  <p>¿Es así?</p>
                </Bubble>

                {flow.answers.A ? (
                  <Bubble tone="user">{flow.answers.A}</Bubble>
                ) : activeStep === "A" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {["Sí", "No"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={saving}
                        onClick={() => handleSelect("A", option)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            {showB ? (
              <>
                <Bubble>¿Qué pasa más seguido?</Bubble>
                {flow.answers.B ? (
                  <Bubble tone="user">{flow.answers.B}</Bubble>
                ) : activeStep === "B" ? (
                  <div className="grid gap-2">
                    {["Gasto en más cosas", "Nunca me sobra"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={saving}
                        onClick={() => handleSelect("B", option)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            {showE ? (
              <>
                <Bubble>¿Alguna vez proyectaste tus finanzas?</Bubble>
                {flow.answers.E ? (
                  <Bubble tone="user">{flow.answers.E}</Bubble>
                ) : activeStep === "E" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {["Sí", "No"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={saving}
                        onClick={() => handleSelect("E", option)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            {showC ? (
              <>
                <Bubble>¿Querés algo más personalizado?</Bubble>
                {flow.answers.C ? (
                  <Bubble tone="user">{flow.answers.C}</Bubble>
                ) : activeStep === "C" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {["Sí", "No"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={saving}
                        onClick={() => handleSelect("C", option)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            {flow.answers.C === "Sí" ? (
              <Bubble>Podemos seguir con este modo simple cuando quieras.</Bubble>
            ) : null}

            {showProjection ? (
              <div className="space-y-3">
                <Bubble>
                  Una proyección es una forma simple de imaginar cómo puede venir tu mes, usando lo que ya pasó.
                </Bubble>
                <Bubble>
                  Si tu mes suele repetirse, podemos estimar los próximos 3 meses.
                </Bubble>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <div className="min-w-[360px]">
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                      <span></span>
                      <span>Mes 1</span>
                      <span>Mes 2</span>
                      <span>Mes 3</span>
                    </div>
                    {tableRows.map((row) => (
                      <div
                        key={row.label}
                        className="grid grid-cols-4 gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-700"
                      >
                        <span className="font-medium text-slate-600">{row.label}</span>
                        {row.values.map((value, idx) => (
                          <span key={`${row.label}-${idx}`}>{value}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <Bubble>Listo. Esto es solo una guía.</Bubble>
              </div>
            ) : null}
          </>
        ) : null}

        {error ? <p className="text-xs text-amber-600">{error}</p> : null}
      </div>
    </section>
  );
}
