import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSupabase } from "../../../../lib/supabaseAdmin";
import {
  processAuthorizedPaymentEvent,
  processPaymentEvent,
  processPreapprovalEvent,
  recordRawMpEvent,
  type PersistenceResult,
} from "../../../../lib/mp-webhook-processor";

// README MP Webhook:
// - Variables: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// - Prueba local: `npm run test:mp-webhook:local` genera un curl con x-request-id/x-signature dummy.
//   Ejemplo de firma manual:
//     const manifest = 'id:123456789;request-id:test-req-1;ts:1700000000;';
//     crypto.createHmac('sha256', process.env.MP_WEBHOOK_SECRET!).update(manifest).digest('hex');
//   Headers esperados: x-request-id:test-req-1  |  x-signature: ts=1700000000,v1=<HEX>.
// - Logs: revisar la consola del servidor (prefijo [mp-webhook]) o el panel de logs en supabase/vercel.





const LOG_PREFIX = "[mp-webhook]";
const SUPPORTED_TYPES = new Set([
  "preapproval",
  "subscription",
  "subscription_preapproval",
  "subscription_authorized_payment",
  "payment",
]);

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true, message: "mercado pago webhook listo" });
}

export async function POST(request: Request): Promise<Response> {

console.log("[mp-webhook] env check", {
  has_secret: !!process.env.MP_WEBHOOK_SECRET,
  secret_tail: process.env.MP_WEBHOOK_SECRET?.slice(-6) ?? null,
  vercel_env: process.env.VERCEL_ENV ?? null,
});



  const url = new URL(request.url);
  const isDryRun = request.headers.get("x-mp-dryrun") === "1" || url.searchParams.get("dry") === "1";

  const requestId = request.headers.get("x-request-id");
  const signatureHeader = request.headers.get("x-signature");
  const signatureParts = parseSignatureHeader(signatureHeader);
  const ts = signatureParts.ts ?? null;
  const headerV1 = signatureParts.v1 ?? null;

  const getBody = createBodyReader(request);

  let eventId = getEventIdFromQuery(url);
  if (!eventId) {
    const bodyForId = await getBody();
    eventId = resolveEventIdFromBody(bodyForId);
  }

  const manifest = buildManifest(eventId, requestId, ts);
  const secret = process.env.MP_WEBHOOK_SECRET;

  let signatureValid = false;
  let validationError: string | null = null;

  if (!secret) {
    validationError = "missing MP_WEBHOOK_SECRET";
  } else if (!eventId) {
    validationError = "missing event id";
  } else if (!requestId) {
    validationError = "missing x-request-id";
  } else if (!ts || !headerV1) {
    validationError = "missing ts or v1 in x-signature";
  } else {
    const hmacHex = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
    if (process.env.NODE_ENV !== "production") {
      console.log("[mp-webhook] debug", {
        event_id: eventId,
        request_id: requestId,
        ts,
        manifest,
        header_v1: headerV1,
        computed_v1: hmacHex,
        secret_tail: process.env.MP_WEBHOOK_SECRET?.slice(-6),
      });
    }
    signatureValid = hmacHex === headerV1;
    if (!signatureValid) {
      validationError = "invalid signature";
    }
  }

if (!signatureValid) {
  console.warn(`${LOG_PREFIX} signature failed (accepted)`, {
    event_id: eventId,
    request_id: requestId,
    ts,
    validation_error: validationError,
  });

  // ✅ Respondemos 200 para que MP no marque fallo.
  // Igual guardamos el evento y procesamos consultando MP por API.
  const payload = await getBody();
  try {
    const admin = getAdminSupabase();
    const normalizedType = resolveEventType(payload, url);
    const mpEventId = resolveMpEventId(payload) ?? eventId;
    await recordRawMpEvent(admin, {
      eventId: mpEventId ?? eventId ?? crypto.randomUUID(),
      eventType: normalizedType,
      requestId,
      rawPayload: payload,
      occurredAtIso: manifestTimestampToIso(ts),
    });
  } catch (e) {
    console.warn(`${LOG_PREFIX} could not record raw event on invalid signature`, e);
  }

  return NextResponse.json({ ok: true });
}

  const payload = await getBody();
  const normalizedType = resolveEventType(payload, url);
  const mpEventId = resolveMpEventId(payload) ?? eventId;
  const eventTimestampIso = manifestTimestampToIso(ts);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`${LOG_PREFIX} missing SUPABASE_SERVICE_ROLE_KEY env`);
  }

  let adminClient;
  try {
    adminClient = getAdminSupabase();
  } catch (err) {
    console.error(`${LOG_PREFIX} supabase init failed`, err);
    logSummary({
      eventType: normalizedType,
      eventId,
      mpEventId,
      requestId,
      ts,
      signatureValid: true,
      persistence: createEmptyPersistence(0),
      error: "supabase init failed",
    });
    return NextResponse.json({ ok: true });
  }

  const eventsAffected = await recordRawMpEvent(adminClient, {
    eventId: mpEventId,
    eventType: normalizedType,
    requestId,
    rawPayload: payload,
    occurredAtIso: eventTimestampIso,
  });

  if (isDryRun) {
    console.log(`${LOG_PREFIX} dry-run: skipped MP API call`, {
      event_type: normalizedType,
      event_id: eventId,
      request_id: requestId,
    });
    logSummary({
      eventType: normalizedType,
      eventId,
      mpEventId,
      requestId,
      ts,
      signatureValid: true,
      persistence: createEmptyPersistence(eventsAffected),
      error: null,
    });
    return NextResponse.json({ ok: true });
  }

  let persistence: PersistenceResult | null = null;
  let handlerError: string | null = null;

  if (normalizedType && SUPPORTED_TYPES.has(normalizedType)) {
    try {
      if (!eventId) {
        handlerError = "missing event id";
      } else if (normalizedType === "payment") {
        persistence = await processPaymentEvent(adminClient, {
          paymentId: eventId,
          eventType: normalizedType,
          requestId,
          lastEventAtIso: eventTimestampIso,
        });
      } else if (normalizedType === "subscription_authorized_payment") {
        persistence = await processAuthorizedPaymentEvent(adminClient, {
          authorizedPaymentId: eventId,
          eventType: normalizedType,
          requestId,
          lastEventAtIso: eventTimestampIso,
        });
      } else {
        persistence = await processPreapprovalEvent(adminClient, {
          preapprovalId: eventId,
          eventType: normalizedType === "subscription" ? "preapproval" : normalizedType,
          requestId,
          lastEventAtIso: eventTimestampIso,
        });
      }
    } catch (err: any) {
      handlerError = err?.message ?? "handler error";
      console.error(`${LOG_PREFIX} handler failed`, err);
    }
  } else {
    console.log(`${LOG_PREFIX} unsupported event`, {
      event_type: normalizedType,
      event_id: eventId,
      request_id: requestId,
    });
  }

  if (persistence) {
    persistence.eventsAffected = eventsAffected;
  }

  logSummary({
    eventType: normalizedType,
    eventId,
    mpEventId,
    requestId,
    ts,
    signatureValid: true,
    persistence: persistence ?? createEmptyPersistence(eventsAffected),
    error: handlerError,
  });

  return NextResponse.json({ ok: true });
}

function createBodyReader(request: Request) {
  let parsed = false;
  let cachedBody: any = null;

  return async () => {
    if (parsed) return cachedBody;
    parsed = true;
    try {
      cachedBody = await request.json();
    } catch {
      cachedBody = null;
    }
    return cachedBody;
  };
}

function parseSignatureHeader(header: string | null): { ts?: string; v1?: string } {
  const result: { ts?: string; v1?: string } = {};
  if (!header) return result;
  for (const part of header.split(",")) {
    const [keyRaw, valueRaw] = part.split("=").map((v) => v?.trim());
    if (!keyRaw || !valueRaw) continue;
    if (keyRaw === "ts") result.ts = valueRaw;
    if (keyRaw === "v1") result.v1 = valueRaw.toLowerCase();
  }
  return result;
}

function buildManifest(id: string | null, requestId: string | null, ts: string | null): string {
  return `id:${id ?? ""};request-id:${requestId ?? ""};ts:${ts ?? ""};`;
}

function manifestTimestampToIso(ts: string | null): string {
  if (!ts) return new Date().toISOString();
  const numeric = Number(ts);
  if (Number.isFinite(numeric) && numeric > 0) {
    if (ts.length === 13) return new Date(numeric).toISOString();
    return new Date(numeric * 1000).toISOString();
  }
  const parsed = new Date(ts);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

function getEventIdFromQuery(url: URL): string | null {
  return url.searchParams.get("id") ?? url.searchParams.get("data.id") ?? null;
}

function resolveEventIdFromBody(body: any): string | null {
  if (!body || typeof body !== "object") return null;
  if (body?.data?.id) return String(body.data.id);
  if (body?.id) return String(body.id);
  return null;
}

function resolveMpEventId(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  if (payload.id) return String(payload.id);
  if (payload?.data?.id) return String(payload.data.id);
  if (payload?.resource?.id) return String(payload.resource.id);
  return null;
}

function resolveEventType(payload: any, url: URL): string | null {
  const fromQuery =
    url.searchParams.get("type") ?? url.searchParams.get("topic") ?? url.searchParams.get("action") ?? null;

  const fromBody =
    typeof payload === "object" && payload
      ? payload.type ??
        payload.topic ??
        payload.action ??
        payload.event ??
        payload.event_type ??
        payload.notification_type ??
        null
      : null;

  const value = (fromBody ?? fromQuery ?? "").toString().toLowerCase();
  return value || null;
}

function logSummary(params: {
  eventType: string | null;
  eventId: string | null;
  mpEventId: string | null;
  requestId: string | null;
  ts: string | null;
  signatureValid: boolean;
  persistence: PersistenceResult;
  error: string | null;
}) {
  const { eventType, eventId, mpEventId, requestId, ts, signatureValid, persistence, error } = params;

  const summary = {
    event_type: eventType,
    id: eventId,
    mp_event_id: mpEventId,
    request_id: requestId,
    ts,
    signature_valid: signatureValid,
    payments_rows: persistence.paymentsAffected ?? 0,
    profiles_rows: persistence.profilesAffected ?? 0,
    events_rows: persistence.eventsAffected ?? 0,
    final_status: persistence.finalStatus ?? null,
    error,
  };

  console.log(`${LOG_PREFIX} summary`, summary);
}

function createEmptyPersistence(eventsAffected: number): PersistenceResult {
  return {
    paymentsAffected: 0,
    profilesAffected: 0,
    eventsAffected,
    paymentId: null,
    userId: null,
    finalStatus: null,
  };
}
