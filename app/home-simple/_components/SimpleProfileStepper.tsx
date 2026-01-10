"use client";

import { useEffect, useMemo, useState } from "react";
import type { SimpleProfileAnswers } from "./simple-utils";

type SaveResult = {
  ok: boolean;
  message?: string;
};

type SimpleProfileStepperProps = {
  answers: SimpleProfileAnswers;
  completed: boolean;
  isEditing?: boolean;
  onEditingDone?: () => void;
  onSave: (payload: {
    answers: SimpleProfileAnswers;
    completed: boolean;
  }) => Promise<SaveResult>;
};

const QUESTIONS: Array<{
  id: keyof SimpleProfileAnswers;
  text: string;
  options?: string[];
  type?: "choice" | "income";
  hint?: string;
}> = [
  {
    id: "q1",
    text: "¿Cómo te va llegando a fin de mes?",
    options: ["No llego", "Llego justo", "Me alcanza", "Puedo ahorrar"],
    type: "choice",
  },
  {
    id: "q2",
    text: "¿Vivís...?",
    options: ["De alquiler", "Comparto alquiler", "Casa propia", "Con familia"],
    type: "choice",
  },
  {
    id: "q3",
    text: "¿Tenés deudas activas?",
    options: ["Sí", "No", "Prefiero no decir"],
    type: "choice",
  },
  {
    id: "q4",
    text: "¿Tu ingreso cambia mes a mes?",
    options: ["Sí, mucho", "A veces", "No, es estable"],
    type: "choice",
  },
  {
    id: "q5",
    text: "¿Cobrás...?",
    options: ["Sueldo", "Independiente", "Mixto", "Otro"],
    type: "choice",
  },
  {
    id: "q6",
    text: "¿Querés que esto sea lo más simple posible?",
    options: ["Sí, muy simple", "Más o menos"],
    type: "choice",
  },
  {
    id: "q7",
    text: "¿Qué te cuesta más?",
    options: ["Anotar", "Ordenar", "No gastar", "Entender números"],
    type: "choice",
  },
  {
    id: "q8",
    text: "¿Usás efectivo seguido?",
    options: ["Sí", "No", "A veces"],
    type: "choice",
  },
  {
    id: "q9",
    text: "En general, tus gastos grandes son...",
    options: ["Alquiler", "Comida", "Transporte", "Deudas", "Otro"],
    type: "choice",
  },
  {
    id: "q10",
    text: "Aproximadamente, ¿cuánto entra por mes?",
    hint: "Tranquilo: con un aproximado alcanza.",
    type: "income",
  },
];

const isAnswered = (answers: SimpleProfileAnswers, id: keyof SimpleProfileAnswers) => {
  if (id === "q10") return Object.prototype.hasOwnProperty.call(answers, id);
  return Boolean(answers[id]);
};

const isComplete = (answers: SimpleProfileAnswers) =>
  QUESTIONS.every((question) => isAnswered(answers, question.id));

const findNextIndex = (answers: SimpleProfileAnswers) => {
  const idx = QUESTIONS.findIndex((question) => !isAnswered(answers, question.id));
  return idx === -1 ? QUESTIONS.length - 1 : idx;
};

export default function SimpleProfileStepper({
  answers,
  completed,
  isEditing = false,
  onEditingDone,
  onSave,
}: SimpleProfileStepperProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [incomeInput, setIncomeInput] = useState("");

  useEffect(() => {
    if (!isEditing) return;
    setStepIndex(0);
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || completed) return;
    setStepIndex(findNextIndex(answers));
  }, [answers, completed, isEditing]);

  useEffect(() => {
    const stored = answers.q10;
    setIncomeInput(stored !== null && stored !== undefined ? String(stored) : "");
  }, [answers.q10]);

  const answeredCount = useMemo(
    () => QUESTIONS.reduce((acc, q) => acc + (isAnswered(answers, q.id) ? 1 : 0), 0),
    [answers]
  );

  const progress = isEditing
    ? Math.round(((stepIndex + 1) / QUESTIONS.length) * 100)
    : Math.round((answeredCount / QUESTIONS.length) * 100);
  const current = QUESTIONS[stepIndex] ?? QUESTIONS[0];

  const handleChoice = async (value: string) => {
    if (saving) return;
    setSaving(true);
    setError("");
    const nextAnswers = { ...answers, [current.id]: value };
    const nextCompleted = isComplete(nextAnswers);
    const result = await onSave({ answers: nextAnswers, completed: nextCompleted });
    setSaving(false);

    if (!result.ok) {
      setError(result.message ?? "No pude guardar, probá de nuevo.");
      return;
    }

    if (isEditing) {
      const isLastStep = stepIndex >= QUESTIONS.length - 1;
      if (isLastStep) {
        onEditingDone?.();
        return;
      }
      setStepIndex((prev) => Math.min(prev + 1, QUESTIONS.length - 1));
      return;
    }

    setStepIndex(findNextIndex(nextAnswers));
  };

  const handleIncomeSave = async (value: number | null) => {
    if (saving) return;
    setSaving(true);
    setError("");
    const nextAnswers = { ...answers, q10: value };
    const nextCompleted = isComplete(nextAnswers);
    const result = await onSave({ answers: nextAnswers, completed: nextCompleted });
    setSaving(false);

    if (!result.ok) {
      setError(result.message ?? "No pude guardar, probá de nuevo.");
      return;
    }

    if (isEditing) {
      const isLastStep = stepIndex >= QUESTIONS.length - 1;
      if (isLastStep) {
        onEditingDone?.();
        return;
      }
      setStepIndex((prev) => Math.min(prev + 1, QUESTIONS.length - 1));
      return;
    }

    setStepIndex(findNextIndex(nextAnswers));
  };

  if (completed && !isEditing) return null;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/95 p-6 text-slate-900 shadow-sm">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
        <span>Perfil simple</span>
        <span>
          Paso {Math.min(stepIndex + 1, QUESTIONS.length)} de {QUESTIONS.length}
        </span>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-amber-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 space-y-4">
        <h3 className="text-lg font-semibold">{current.text}</h3>
        {current.type !== "income" ? (
          <div className="grid gap-2">
            {(current.options ?? []).map((option) => (
              <button
                key={option}
                type="button"
                disabled={saving}
                onClick={() => handleChoice(option)}
                className={[
                  "rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-sm transition disabled:cursor-not-allowed",
                  answers[current.id] === option
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-slate-500">$</span>
              <input
                value={incomeInput}
                onChange={(event) =>
                  setIncomeInput(event.target.value.replace(/[^\d]/g, ""))
                }
                inputMode="numeric"
                placeholder="0"
                className="w-full text-lg text-slate-900 outline-none"
              />
            </div>
            {current.hint ? (
              <p className="text-xs text-slate-500">{current.hint}</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={saving || incomeInput.trim().length === 0}
                onClick={() => handleIncomeSave(Number(incomeInput))}
                className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Continuar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleIncomeSave(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed"
              >
                No sé / después
              </button>
            </div>
          </div>
        )}
      </div>

      {error ? <p className="mt-4 text-xs text-amber-600">{error}</p> : null}
    </section>
  );
}
