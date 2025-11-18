import { NextResponse } from "next/server";
import { getAdminSupabase } from "../../../../lib/supabaseAdmin";
import { processPreapprovalEvent, recordRawMpEvent } from "../../../../lib/mp-webhook-processor";

const LOG_PREFIX = "[mp-verify]";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const preapprovalId = resolvePreapprovalId(body);
  if (!preapprovalId) {
    return NextResponse.json({ error: "preapproval_id requerido" }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`${LOG_PREFIX} missing SUPABASE_SERVICE_ROLE_KEY env`);
  }

  let adminClient;
  try {
    adminClient = getAdminSupabase();
  } catch (err) {
    console.error(`${LOG_PREFIX} supabase init failed`, err);
    return NextResponse.json({ error: "Supabase admin no configurado" }, { status: 500 });
  }

  const requestId = typeof body?.request_id === "string" ? body.request_id : `manual-${Date.now()}`;
  const occurredAtIso = new Date().toISOString();

  let eventsAffected = 0;
  try {
    eventsAffected = await recordRawMpEvent(adminClient, {
      eventId: `manual-${preapprovalId}`,
      eventType: "manual_verify",
      requestId,
      rawPayload: body,
      occurredAtIso,
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} mp_events insert failed`, err);
  }

  try {
    const persistence = await processPreapprovalEvent(adminClient, {
      preapprovalId,
      eventType: "manual_verify",
      requestId,
      lastEventAtIso: occurredAtIso,
    });

    persistence.eventsAffected = eventsAffected;

    console.log(`${LOG_PREFIX} summary`, {
      preapproval_id: preapprovalId,
      request_id: requestId,
      payments_rows: persistence.paymentsAffected,
      profiles_rows: persistence.profilesAffected,
      events_rows: persistence.eventsAffected,
      final_status: persistence.finalStatus,
    });

    return NextResponse.json({
      status: persistence.finalStatus,
      payment_id: persistence.paymentId,
      profile_updated: persistence.profilesAffected > 0,
      payments_rows: persistence.paymentsAffected,
      events_rows: persistence.eventsAffected,
    });
  } catch (err: any) {
    console.error(`${LOG_PREFIX} handler failed`, err);
    return NextResponse.json({ error: err?.message ?? "No se pudo reconciliar" }, { status: 500 });
  }
}

function resolvePreapprovalId(body: any): string | null {
  if (!body || typeof body !== "object") return null;
  if (body.preapproval_id) return String(body.preapproval_id);
  if (body.id) return String(body.id);
  return null;
}
