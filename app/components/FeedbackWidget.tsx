"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { sendFeedback } from "../../lib/feedback";

const FEEDBACK_TYPES = ["Bug", "Idea", "No entendi", "Otro"] as const;
type FeedbackType = (typeof FEEDBACK_TYPES)[number];
type Status = "idle" | "loading" | "success" | "error";


export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
const [feedbackType, setFeedbackType] = useState<FeedbackType>("Otro");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const closeWidget = useCallback(() => {
    setOpen(false);
    setStatus("idle");
    setError(null);
  }, [] ) ;


useEffect(() => {
  if (!open) return;
  const handleKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeWidget();
      triggerRef.current?.focus();
    }
  };
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [open, closeWidget]);


  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => textareaRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);



  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError(null);

    const result = await sendFeedback({
      message,
      type: feedbackType,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      createdAt: new Date().toISOString(),
    });

   if (result.ok) {
  setStatus("success");
  setMessage("");
} else {
  setStatus("error");
  setError("error" in result ? result.error : "No pudimos enviar tu feedback.");
}
  };

  const openWidget = () => {
    setOpen(true);
    setStatus("idle");
    setError(null);
  };

  const isSending = status === "loading";
  const submitDisabled = isSending || message.trim().length < 5;

  return (
<div className="fixed bottom-20 left-5 md:left-auto md:right-6 md:bottom-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 text-lg font-semibold text-white">Feedback</div>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-1 block text-sm text-slate-200"
                htmlFor="feedback-message"
              >
                Dejanos tu comentario
              </label>
              <textarea
                id="feedback-message"
                ref={textareaRef}
                required
                minLength={5}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="h-28 w-full resize-none rounded-xl border border-white/10 bg-slate-800/80 p-3 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
                placeholder="Contanos rapido..."
              />
            </div>
            <div>
             <label className="mb-1 block text-sm text-slate-200" htmlFor="feedback-type">
  Tipo
</label>
<select
  id="feedback-type"
  required
  value={feedbackType}
  onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
  className="w-full rounded-xl border border-white/10 bg-slate-800/80 p-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
>
  {FEEDBACK_TYPES.map((item) => (
    <option key={item} value={item}>
      {item}
    </option>
  ))}
</select>

            </div>

            {status === "success" && (
              <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                Gracias por tu feedback!
              </div>
            )}
            {status === "error" && error && (
              <div className="rounded-lg border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {error || "No pudimos enviar tu feedback."}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={closeWidget}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/10"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={submitDisabled}
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        ref={triggerRef}
        onClick={openWidget}
className="flex h-18 w-18 items-center justify-center rounded-full bg-emerald-400 text-sm font-semibold text-slate-900 transition hover:translate-y-[-2px] focus:outline-none"
        aria-label="Enviar feedback"
      >
        Feedback
      </button>
    </div>
  );
}
