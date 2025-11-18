import { revalidatePath } from "next/cache";

import api from "@/lib/mp-messages";
import { getAdminSupabase } from "@/lib/supabaseAdmin";
import { processPaymentEvent } from "@/lib/mp-webhook-processor";
import { getMP } from "@/lib/mp";

export async function GET(): Promise<Response> {
  return new Response(null, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const body = await request.json().catch(() => null);
  const paymentId = resolvePaymentId(body, url);
  const requestId = request.headers.get("x-request-id");
  const eventType = String(body?.action ?? body?.type ?? "payment");
  const eventCreatedAtIso = normalizeTimestamp(body?.date_created) ?? new Date().toISOString();

  if (!paymentId) {
    console.warn("[mercadopago-webhook] missing payment id", body);
    return new Response(null, { status: 400 });
  }

  try {
    const mpPayment = await fetchPayment(paymentId);
    const status = (mpPayment?.status ?? "").toLowerCase();

    console.log("[mercadopago-webhook] payment fetched", {
      payment_id: paymentId,
      status,
      live_mode: mpPayment?.live_mode ?? null,
    });

    if (status === "approved") {
      const metadata = extractMetadata(mpPayment?.metadata);
      const text = metadata?.text ?? metadata?.message_text ?? metadata?.messageText ?? null;
      const userIdRaw = metadata?.user_id ?? metadata?.userId ?? null;
      const userId = typeof userIdRaw === "string" && userIdRaw ? userIdRaw : null;

      if (!text) {
        console.warn("[mercadopago-webhook] approved payment without text metadata", {
          payment_id: paymentId,
        });
      } else {
        await persistApprovedPayment({
          paymentId: String(mpPayment.id ?? paymentId),
          text,
          userId,
          requestId,
          eventType,
          eventCreatedAtIso,
        });
      }
    }
  } catch (error) {
    const normalizedError = normalizeMercadoPagoError(error);

    if (normalizedError?.status === 404) {
      console.warn("[mercadopago-webhook] payment not found yet", {
        payment_id: paymentId,
        error: normalizedError,
      });
    } else {
      console.error("[mercadopago-webhook] failed to process payment", {
        payment_id: paymentId,
        error: normalizedError ?? error,
      });
    }
  }

  return new Response(null, { status: 200 });
}

function resolvePaymentId(body: any, url: URL): string | null {
  if (body && typeof body === "object") {
    if (body.id) return String(body.id);
    if (body?.data?.id) return String(body.data.id);
    if (body?.resource?.id) return String(body.resource.id);
    if (typeof body.resource === "string") {
      const extracted = extractIdFromResource(body.resource);
      if (extracted) return extracted;
    }
  }

  const queryId =
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    url.searchParams.get("data.id[]") ??
    url.searchParams.get("data.id[0]");

  if (queryId) {
    return extractIdFromResource(queryId);
  }

  return null;
}

async function fetchPayment(id: string) {
  const { payment } = getMP();
  return payment.get({ id });
}

function extractMetadata(metadata: unknown): Record<string, any> | null {
  if (!metadata) return null;
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  }
  if (typeof metadata === "object") return metadata as Record<string, any>;
  return null;
}

function extractIdFromResource(value: string): string | null {
  if (!value) return null;
  const match = value.match(/(\d+)/g);
  if (match && match.length > 0) {
    return match[match.length - 1];
  }
  return value;
}

function normalizeMercadoPagoError(error: unknown): { message?: string; status?: number; cause?: unknown } | null {
  if (!error || typeof error !== "object") return null;
  const err = error as any;

  if (err.message && err.error && err.status) {
    return { message: err.message, status: err.status, cause: err.cause ?? null };
  }

  if (err.response && typeof err.response === "object") {
    const response = err.response as any;
    return {
      message: response?.data?.message ?? response?.message,
      status: response?.status,
      cause: response?.data?.cause ?? null,
    };
  }

  return null;
}

async function persistApprovedPayment(params: {
  paymentId: string;
  text: string;
  userId: string | null;
  requestId: string | null;
  eventType: string;
  eventCreatedAtIso: string;
}) {
  const { paymentId, text, userId, requestId, eventType, eventCreatedAtIso } = params;

  try {
    await api.message.add({ id: paymentId, text, userId });
    revalidatePath("/pagos-mensaje");
  } catch (error: any) {
    if (String(error?.message ?? "").toLowerCase().includes("already added")) {
      console.log("[mercadopago-webhook] payment already processed", {
        payment_id: paymentId,
      });
    } else {
      throw error;
    }
  }

  try {
    const admin = getAdminSupabase();
    const persistence = await processPaymentEvent(admin, {
      paymentId,
      eventType,
      requestId,
      lastEventAtIso: eventCreatedAtIso,
    });
    console.log("[mercadopago-webhook] payments persistence", {
      payment_id: paymentId,
      persistence,
    });
  } catch (error: any) {
    console.error("[mercadopago-webhook] persist payment failed", {
      payment_id: paymentId,
      error: normalizeMercadoPagoError(error) ?? error,
    });
  }
}

function normalizeTimestamp(value: any): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}
