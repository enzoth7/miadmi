import { getSupabaseSession } from "./app-data";

export type FeedbackPayload = {
  message: string;
  type?: string | null;
  path?: string | null;
  createdAt: string;
  userId?: string | null;
  userAgent?: string | null;
};

type FeedbackResult =
  | { ok: true }
  | { ok: false; error: string };

const FALLBACK_KEY = "miadmi:feedback_fallback";
const LAST_SENT_KEY = "miadmi:feedback_last_sent";
const MIN_INTERVAL_MS = 10_000;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLastSentAt(): number | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(LAST_SENT_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function storeLastSentAt(value: number) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(LAST_SENT_KEY, String(value));
  } catch {
    // ignore storage errors
  }
}

function appendFallback(payload: FeedbackPayload) {
  if (!canUseStorage()) return false;
  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(list) ? list : [];
    next.push(payload);
    const trimmed = next.slice(-20);
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(trimmed));
    return true;
  } catch {
    // ignore storage errors
    return false;
  }
}

export async function sendFeedback(payload: FeedbackPayload): Promise<FeedbackResult> {
  if (!payload?.message || payload.message.trim().length < 5) {
    return { ok: false, error: "El mensaje debe tener al menos 5 caracteres." };
  }

  const now = Date.now();
  const lastSentAt = readLastSentAt();
  if (lastSentAt && now - lastSentAt < MIN_INTERVAL_MS) {
    return {
      ok: false,
      error: "Podes enviar un nuevo feedback en unos segundos.",
    };
  }

  const safePayload: FeedbackPayload = {
    message: payload.message.trim().slice(0, 1000),
    type: payload.type ? String(payload.type) : null,
    path: payload.path || (typeof window !== "undefined" ? window.location.pathname : null),
    createdAt: payload.createdAt || new Date().toISOString(),
    userId: payload.userId ?? null,
    userAgent:
      payload.userAgent ||
      (typeof navigator !== "undefined" ? navigator.userAgent : null),
  };

  let inserted = false;
  let persisted = false;
  try {
    const ctx = await getSupabaseSession();
    if (ctx?.supabase && ctx.userId) {
      const { error } = await ctx.supabase
        .from("feedback")
        .insert({
          message: safePayload.message,
          type: safePayload.type,
          path: safePayload.path,
          created_at: safePayload.createdAt,
          user_id: safePayload.userId || ctx.userId,
          user_agent: safePayload.userAgent,
        });
      if (!error) {
        inserted = true;
        persisted = true;
      }
    }
  } catch {
    inserted = false;
  }

  if (!inserted) {
    persisted = appendFallback(safePayload) || persisted;
  }

  if (!persisted) {
    return { ok: false, error: "No pudimos enviar el feedback. Intentalo luego." };
  }

  storeLastSentAt(now);
  return { ok: true };
}

// SQL esperado (NO ejecutar automaticamente):
// create table public.feedback (
//   id uuid primary key default gen_random_uuid(),
//   created_at timestamptz default now(),
//   user_id uuid,
//   path text,
//   type text,
//   message text,
//   user_agent text
// );
// -- Policy minima RLS (solo INSERT para authenticated)
// -- enable row level security on table feedback;
// -- create policy "insert_feedback" on public.feedback for insert to authenticated using (true);
