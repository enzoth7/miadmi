import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchAuthorizedPaymentResource,
  fetchPreapprovalResource,
  fetchPaymentResource,
  type AuthorizedPaymentResource,
  type PreapprovalResource,
  type PaymentResource,
} from "./mp-webhook";

type AdminClient = SupabaseClient<any, any, any>;

export type PersistenceResult = {
  paymentsAffected: number;
  profilesAffected: number;
  eventsAffected: number;
  paymentId: string | null;
  userId: string | null;
  finalStatus: string | null;
};

type RawEventPayload = Record<string, unknown> | null | undefined;

type ProcessCommonOptions = {
  eventType: string;
  requestId?: string | null;
  lastEventAtIso: string;
};

export async function processPreapprovalEvent(
  admin: AdminClient,
  options: ProcessCommonOptions & {
    preapprovalId: string;
  }
): Promise<PersistenceResult> {
  const { preapprovalId, eventType, requestId = null, lastEventAtIso } = options;
  const resource = await fetchPreapprovalResource(preapprovalId);
  const snapshot = toSnapshotFromPreapproval(resource, {
    eventType,
    requestId,
    lastEventAtIso,
  });
  return persistSubscriptionSnapshot(admin, snapshot);
}

export async function processAuthorizedPaymentEvent(
  admin: AdminClient,
  options: ProcessCommonOptions & {
    authorizedPaymentId: string;
  }
): Promise<PersistenceResult> {
  const { authorizedPaymentId, eventType, requestId = null, lastEventAtIso } = options;
  const resource = await fetchAuthorizedPaymentResource(authorizedPaymentId);
  const snapshot = toSnapshotFromAuthorizedPayment(resource, {
    eventType,
    requestId,
    lastEventAtIso,
  });
  return persistSubscriptionSnapshot(admin, snapshot);
}

export async function processPaymentEvent(
  admin: AdminClient,
  options: ProcessCommonOptions & {
    paymentId: string;
  }
): Promise<PersistenceResult> {
  const { paymentId, eventType, requestId = null, lastEventAtIso } = options;
  const resource = await fetchPaymentResource(paymentId);
  const snapshot = toSnapshotFromPayment(resource, {
    eventType,
    requestId,
    lastEventAtIso,
  });
  return persistOneTimePayment(admin, snapshot);
}

export async function recordRawMpEvent(
  admin: AdminClient,
  params: {
    eventId: string | null | undefined;
    eventType: string | null | undefined;
    requestId?: string | null;
    rawPayload: RawEventPayload;
    occurredAtIso: string;
  }
): Promise<number> {
  const { eventId, eventType, requestId = null, rawPayload } = params;
  if (!eventId) return 0;

  const payload = {
    event_id: eventId,
    event_type: eventType ?? null,
    request_id: requestId,
    payload: rawPayload ?? null,
  };

  try {
    const { data, error } = await admin
      .from("mp_events")
      .upsert(payload, { onConflict: "event_id" })
      .select("event_id");

    if (error) {
      throw error;
    }
    const affected = data?.length ?? 0;
    if (affected === 0) {
      console.log("[mp-webhook] mp_events upsert affected 0 rows", {
        event_id: eventId,
        event_type: eventType ?? null,
      });
    }
    return affected;
  } catch (err: any) {
    console.error("[mp-webhook] mp_events upsert failed", {
      event_id: eventId,
      error: err?.message ?? err,
    });
    return 0;
  }
}

type SubscriptionSnapshot = {
  preapprovalId: string;
  authorizedPaymentId: string | null;
  externalReference: string | null;
  payerEmail: string | null;
  requestId: string | null;
  status: string;
  rawStatus: string | null;
  amount: number | null;
  currencyId: string | null;
  paidAtIso: string | null;
  lastEventAtIso: string;
  eventType: string;
  trialActive: boolean;
  trialEnded: boolean;
  trialDays: number | null;
  trialStartsAtIso: string | null;
  trialEndsAtIso: string | null;
};

type OneTimePaymentSnapshot = {
  paymentId: string;
  externalReference: string | null;
  metadataUserId: string | null;
  metadataKind: string | null;
  payerEmail: string | null;
  requestId: string | null;
  status: string;
  rawStatus: string | null;
  amount: number | null;
  currencyId: string | null;
  paidAtIso: string | null;
  lastEventAtIso: string;
  eventType: string;
};

type PaymentRow = {
  id: string;
  user_id: string | null;
  status: string | null;
  paid_at: string | null;
  preapproval_id?: string | null;
  authorized_payment_id?: string | null;
  external_reference?: string | null;
  amount?: number | null;
  currency_id?: string | null;
  trial?: boolean | null;
};

async function persistSubscriptionSnapshot(
  admin: AdminClient,
  snapshot: SubscriptionSnapshot
): Promise<PersistenceResult> {
  const existing = await findExistingPayment(admin, {
    preapprovalId: snapshot.preapprovalId,
    authorizedPaymentId: snapshot.authorizedPaymentId,
    externalReference: snapshot.externalReference,
  });

  const resolvedUserId = await resolveUserId(admin, snapshot, existing);

  const existingStatus = (existing?.status ?? "").toLowerCase();
  const normalizedStatus = snapshot.status.toLowerCase();
  const finalStatus =
    existingStatus === "approved" && normalizedStatus !== "approved"
      ? existingStatus
      : snapshot.status;
  const finalStatusLower = finalStatus.toLowerCase();

  const trialActive = finalStatusLower === "approved" && snapshot.trialActive;
  const trialEnded =
    finalStatusLower === "approved" &&
    (snapshot.trialEnded || (!trialActive && existing?.trial === true));

  let paidAtIso = existing?.paid_at ?? null;
  if (finalStatusLower === "approved") {
    if (trialActive) {
      const trialStartIso = snapshot.trialStartsAtIso ?? snapshot.lastEventAtIso;
      paidAtIso = paidAtIso ?? trialStartIso;
    } else if (snapshot.paidAtIso) {
      paidAtIso = snapshot.paidAtIso;
    } else {
      paidAtIso = paidAtIso ?? snapshot.lastEventAtIso;
    }
  } else if (existingStatus === "approved") {
    paidAtIso = existing?.paid_at ?? paidAtIso;
  } else {
    paidAtIso = null;
  }

  let trialFlag: boolean | null = null;
  if (trialActive) {
    trialFlag = true;
  } else if (trialEnded) {
    trialFlag = false;
  } else if (typeof existing?.trial === "boolean") {
    trialFlag = existing.trial;
  }

  const paymentPayload: Record<string, unknown> = {
    provider: "mercado_pago",
    kind: "subscription",
    preapproval_id: snapshot.preapprovalId,
    authorized_payment_id: snapshot.authorizedPaymentId ?? existing?.authorized_payment_id ?? null,
    external_reference: snapshot.externalReference ?? existing?.external_reference ?? null,
    status: finalStatus,
    amount: snapshot.amount ?? existing?.amount ?? null,
    currency_id: snapshot.currencyId ?? existing?.currency_id ?? null,
    paid_at: paidAtIso,
    last_event_at: snapshot.lastEventAtIso,
    last_event_type: snapshot.eventType,
  };
  if (typeof trialFlag === "boolean") {
    paymentPayload.trial = trialFlag;
  }

  if (resolvedUserId) paymentPayload.user_id = resolvedUserId;

  let paymentsAffected = 0;
  let paymentId: string | null = existing?.id ?? null;
  let userId: string | null = resolvedUserId ?? existing?.user_id ?? null;

  if (existing) {
    const { data, error } = await admin
      .from("payments")
      .update(paymentPayload)
      .eq("id", existing.id)
      .select("id,user_id");

    if (error) throw error;
    paymentsAffected = data?.length ?? 0;
    if (paymentsAffected === 0) {
      console.log("[mp-webhook] payments update returned 0 rows", {
        preapproval_id: snapshot.preapprovalId,
        authorized_payment_id: snapshot.authorizedPaymentId,
        request_id: snapshot.requestId,
      });
    } else {
      paymentId = data?.[0]?.id ?? paymentId;
      userId = data?.[0]?.user_id ?? userId;
      console.log("[mp-webhook] payments update", {
        payment_id: paymentId,
        rows_affected: paymentsAffected,
        final_status: finalStatus,
      });
    }
  } else {
    if (!resolvedUserId) {
      console.warn("[mp-webhook] missing user_id for new payment row", {
        preapproval_id: snapshot.preapprovalId,
        authorized_payment_id: snapshot.authorizedPaymentId,
        external_reference: snapshot.externalReference,
        payer_email: snapshot.payerEmail,
      });
      return {
        paymentsAffected: 0,
        profilesAffected: 0,
        eventsAffected: 0,
        paymentId: null,
        userId: null,
        finalStatus,
      };
    }

    const insertPayload = {
      ...paymentPayload,
      user_id: resolvedUserId,
    };

    console.log("[mp-webhook] payments row not found, inserting", {
      preapproval_id: snapshot.preapprovalId,
      authorized_payment_id: snapshot.authorizedPaymentId,
    });

    const { data, error } = await admin
      .from("payments")
      .insert(insertPayload)
      .select("id,user_id");

    if (error) throw error;
    paymentsAffected = data?.length ?? 0;
    if (paymentsAffected === 0) {
      console.log("[mp-webhook] payments insert returned 0 rows", {
        preapproval_id: snapshot.preapprovalId,
        authorized_payment_id: snapshot.authorizedPaymentId,
      });
    } else {
      paymentId = data?.[0]?.id ?? paymentId;
      userId = data?.[0]?.user_id ?? userId;
      console.log("[mp-webhook] payments insert", {
        payment_id: paymentId,
        rows_affected: paymentsAffected,
        final_status: finalStatus,
      });
    }
  }

  let profilesAffected = 0;

  if (userId && finalStatusLower === "approved") {
    const profilePayload: Record<string, unknown> = { plan: "premium" };
    if (trialActive && snapshot.trialEndsAtIso) {
      profilePayload.trial_ends_at = snapshot.trialEndsAtIso;
    } else if (trialEnded) {
      profilePayload.trial_ends_at = null;
    }

    const { data, error } = await admin.from("profiles").update(profilePayload).eq("id", userId).select("id");

    if (error) {
      throw error;
    }
    profilesAffected = data?.length ?? 0;
    console.log("[mp-webhook] profiles update", {
      user_id: userId,
      rows_affected: profilesAffected,
      plan: "premium",
      trial_active: trialActive,
      trial_ends_at: profilePayload.trial_ends_at ?? null,
    });
  }

  return {
    paymentsAffected,
    profilesAffected,
    eventsAffected: 0,
    paymentId,
    userId,
    finalStatus,
  };
}

async function persistOneTimePayment(
  admin: AdminClient,
  snapshot: OneTimePaymentSnapshot
): Promise<PersistenceResult> {
  let existing = await findExistingPayment(admin, {
    preapprovalId: null,
    authorizedPaymentId: null,
    externalReference: snapshot.externalReference,
  });

  if (!existing && snapshot.paymentId) {
    existing = await findExistingPayment(admin, {
      preapprovalId: null,
      authorizedPaymentId: null,
      externalReference: snapshot.paymentId,
    });
  }

  if (snapshot.metadataKind && snapshot.metadataKind !== "one_time") {
    console.log("[mp-webhook] payment metadata kind mismatch", {
      payment_id: snapshot.paymentId,
      metadata_kind: snapshot.metadataKind,
      request_id: snapshot.requestId,
    });
  }

  const resolvedUserId = await resolveUserId(admin, snapshot, existing, snapshot.metadataUserId);

  const existingStatus = (existing?.status ?? "").toLowerCase();
  const normalizedStatus = snapshot.status.toLowerCase();
  const finalStatus =
    existingStatus === "approved" && normalizedStatus !== "approved" ? existingStatus : snapshot.status;
  const finalStatusLower = finalStatus.toLowerCase();

  let paidAtIso = existing?.paid_at ?? null;
  if (finalStatusLower === "approved") {
    paidAtIso = snapshot.paidAtIso ?? snapshot.lastEventAtIso ?? paidAtIso;
  } else if (existingStatus === "approved") {
    paidAtIso = existing?.paid_at ?? paidAtIso;
  } else {
    paidAtIso = null;
  }

  const paymentPayload: Record<string, unknown> = {
    provider: "mercado_pago",
    kind: "one_time",
    provider_ref: snapshot.paymentId,
    status: finalStatus,
    amount: snapshot.amount ?? existing?.amount ?? null,
    currency_id: snapshot.currencyId ?? existing?.currency_id ?? null,
    paid_at: paidAtIso,
    last_event_at: snapshot.lastEventAtIso,
    last_event_type: snapshot.eventType,
  };

  if (snapshot.externalReference) {
    paymentPayload.external_reference = snapshot.externalReference;
  }

  if (resolvedUserId) {
    paymentPayload.user_id = resolvedUserId;
  }

  let paymentsAffected = 0;
  let paymentId: string | null = existing?.id ?? null;
  let userId: string | null = resolvedUserId ?? existing?.user_id ?? null;

  if (existing) {
    try {
      const { data, error } = await admin
        .from("payments")
        .update(paymentPayload)
        .eq("id", existing.id)
        .select("id,user_id");

      if (error) throw error;
      paymentsAffected = data?.length ?? 0;
      if (paymentsAffected === 0) {
        console.log("[mp-webhook] one-time payment update affected 0 rows", {
          payment_id: existing.id,
          request_id: snapshot.requestId,
        });
      } else {
        paymentId = data?.[0]?.id ?? paymentId;
        userId = data?.[0]?.user_id ?? userId;
      }
    } catch (err: any) {
      if (String(err?.message ?? "").includes("column")) {
        const fallbackPayload: Record<string, unknown> = {
          provider_ref: snapshot.paymentId,
          status: finalStatus,
          paid_at: paidAtIso,
        };
        if (resolvedUserId) fallbackPayload.user_id = resolvedUserId;

        const { data: fallbackData, error: fallbackErr } = await admin
          .from("payments")
          .update(fallbackPayload)
          .eq("id", existing.id)
          .select("id,user_id");

        if (fallbackErr) throw fallbackErr;
        paymentsAffected = fallbackData?.length ?? 0;
        paymentId = fallbackData?.[0]?.id ?? paymentId;
        userId = fallbackData?.[0]?.user_id ?? userId;
      } else {
        throw err;
      }
    }
  } else {
    if (!resolvedUserId) {
      console.warn("[mp-webhook] missing user_id for one-time payment", {
        payment_id: snapshot.paymentId,
        external_reference: snapshot.externalReference,
      });
      return {
        paymentsAffected: 0,
        profilesAffected: 0,
        eventsAffected: 0,
        paymentId: null,
        userId: null,
        finalStatus,
      };
    }

    const insertPayload: Record<string, unknown> = {
      ...paymentPayload,
      user_id: resolvedUserId,
    };

    try {
      const { data, error } = await admin
        .from("payments")
        .insert(insertPayload)
        .select("id,user_id");

      if (error) throw error;
      paymentsAffected = data?.length ?? 0;
      paymentId = data?.[0]?.id ?? paymentId;
      userId = data?.[0]?.user_id ?? userId;
    } catch (err: any) {
      if (String(err?.message ?? "").includes("column")) {
        const fallbackPayload: Record<string, unknown> = {
          provider: "mercado_pago",
          kind: "one_time",
          provider_ref: snapshot.paymentId,
          status: finalStatus,
          paid_at: paidAtIso,
          user_id: resolvedUserId,
        };
        const { data: fallbackData, error: fallbackErr } = await admin
          .from("payments")
          .insert(fallbackPayload)
          .select("id,user_id");
        if (fallbackErr) throw fallbackErr;
        paymentsAffected = fallbackData?.length ?? 0;
        paymentId = fallbackData?.[0]?.id ?? paymentId;
        userId = fallbackData?.[0]?.user_id ?? userId;
      } else {
        throw err;
      }
    }
  }

  let profilesAffected = 0;

  if (userId && finalStatusLower === "approved") {
    const profilePayload: Record<string, unknown> = { plan: "premium" };
    profilePayload.premium_until = resolvePremiumUntilForOneTime(paidAtIso ?? snapshot.lastEventAtIso);

    try {
      const { data, error } = await admin
        .from("profiles")
        .update(profilePayload)
        .eq("id", userId)
        .select("id");

      if (error) throw error;
      profilesAffected = data?.length ?? 0;
    } catch (err: any) {
      if (String(err?.message ?? "").includes("column")) {
        const fallbackPayload: Record<string, unknown> = { plan: "premium" };
        const { data: fallbackData, error: fallbackErr } = await admin
          .from("profiles")
          .update(fallbackPayload)
          .eq("id", userId)
          .select("id");
        if (fallbackErr) throw fallbackErr;
        profilesAffected = fallbackData?.length ?? 0;
      } else {
        throw err;
      }
    }
  }

  return {
    paymentsAffected,
    profilesAffected,
    eventsAffected: 0,
    paymentId: paymentId ?? snapshot.externalReference ?? snapshot.paymentId,
    userId,
    finalStatus,
  };
}

function toSnapshotFromPreapproval(
  resource: PreapprovalResource,
  ctx: {
    eventType: string;
    requestId: string | null;
    lastEventAtIso: string;
  }
): SubscriptionSnapshot {
  const status = normalizePreapprovalStatus(resource?.status);
  const paidAtIso =
    status === "approved"
      ? firstValidDateIso([
          resource?.last_authorized_payment?.date_created,
          resource?.date_approved,
          resource?.next_payment_date,
        ])
      : null;

  const amount = resource?.auto_recurring?.transaction_amount ?? null;
  const currencyId = resource?.auto_recurring?.currency_id ?? null;
  const trialInfo = resolveTrialInfoFromPreapproval(resource, status, ctx.lastEventAtIso);

  return {
    preapprovalId: resource?.id ?? "",
    authorizedPaymentId: resource?.last_authorized_payment?.id ?? null,
    externalReference: resource?.external_reference ?? null,
    payerEmail: resource?.payer_email ?? null,
    requestId: ctx.requestId,
    status,
    rawStatus: resource?.status ?? null,
    amount: typeof amount === "number" ? amount : null,
    currencyId: currencyId ?? null,
    paidAtIso,
    lastEventAtIso: ctx.lastEventAtIso,
    eventType: ctx.eventType,
    trialActive: trialInfo.trialActive,
    trialEnded: trialInfo.trialEnded,
    trialDays: trialInfo.trialDays,
    trialStartsAtIso: trialInfo.trialStartsAtIso,
    trialEndsAtIso: trialInfo.trialEndsAtIso,
  };
}

function toSnapshotFromAuthorizedPayment(
  resource: AuthorizedPaymentResource,
  ctx: {
    eventType: string;
    requestId: string | null;
    lastEventAtIso: string;
  }
): SubscriptionSnapshot {
  const status = normalizeAuthorizedPaymentStatus(resource?.status);
  const paidAtIso = status === "approved" ? firstValidDateIso([resource?.date_approved, resource?.date_created]) : null;

  return {
    preapprovalId: resource?.preapproval_id ?? "",
    authorizedPaymentId: resource?.id ?? null,
    externalReference: resource?.external_reference ?? null,
    payerEmail: resource?.payer_email ?? null,
    requestId: ctx.requestId,
    status,
    rawStatus: resource?.status ?? null,
    amount: typeof resource?.transaction_amount === "number" ? resource.transaction_amount : null,
    currencyId: resource?.currency_id ?? null,
    paidAtIso,
    lastEventAtIso: ctx.lastEventAtIso,
    eventType: ctx.eventType,
    trialActive: false,
    trialEnded: status === "approved",
    trialDays: null,
    trialStartsAtIso: null,
    trialEndsAtIso: null,
  };
}

function toSnapshotFromPayment(
  resource: PaymentResource,
  ctx: {
    eventType: string;
    requestId: string | null;
    lastEventAtIso: string;
  }
): OneTimePaymentSnapshot {
  const status = normalizePaymentStatus(resource?.status);
  const paidAtIso =
    status === "approved"
      ? firstValidDateIso([resource?.date_approved, resource?.money_release_date, resource?.date_created])
      : null;
  const metadataUserId = resolveMetadataUserIdFromPayment(resource);
  const metadataKind = resolveMetadataKindFromPayment(resource);

  return {
    paymentId: resource?.id ? String(resource.id) : "",
    externalReference: resource?.external_reference ? String(resource.external_reference) : null,
    metadataUserId,
    metadataKind,
    payerEmail: resolvePayerEmailFromPayment(resource),
    requestId: ctx.requestId,
    status,
    rawStatus: resource?.status ?? null,
    amount: typeof resource?.transaction_amount === "number" ? resource.transaction_amount : null,
    currencyId: resource?.currency_id ?? null,
    paidAtIso,
    lastEventAtIso: ctx.lastEventAtIso,
    eventType: ctx.eventType,
  };
}

function resolveTrialInfoFromPreapproval(
  resource: PreapprovalResource,
  normalizedStatus: string,
  fallbackEventIso: string
) {
  const freeTrial = resource?.auto_recurring?.free_trial ?? null;
  const envTrialDays = resolveEnvTrialDays();
  const trialDaysFromResource = normalizeTrialFrequencyToDays(
    freeTrial?.frequency,
    freeTrial?.frequency_type
  );
  const trialDays = trialDaysFromResource ?? envTrialDays;

  const trialStartsAtIso =
    firstValidDateIso([resource?.date_approved, resource?.date_created, fallbackEventIso]) ??
    fallbackEventIso;
  const trialEndsAtIso =
    trialDays && trialStartsAtIso ? addDaysToIso(trialStartsAtIso, trialDays) : null;

  const hasAuthorizedPayment = Boolean(resource?.last_authorized_payment?.id);
  const statusApproved = normalizedStatus === "approved";

  let trialActive = false;
  let trialEnded = hasAuthorizedPayment;

  if (statusApproved && trialDays && trialEndsAtIso) {
    const endMs = Date.parse(trialEndsAtIso);
    const nowMs = Date.now();
    if (!Number.isNaN(endMs)) {
      if (nowMs < endMs && !hasAuthorizedPayment) {
        trialActive = true;
        trialEnded = false;
      } else {
        trialEnded = true;
      }
    }
  }

  if (!statusApproved) {
    trialActive = false;
  }

  return {
    trialActive,
    trialEnded,
    trialDays: trialDays ?? null,
    trialStartsAtIso,
    trialEndsAtIso,
  };
}

function normalizePreapprovalStatus(status: string | null | undefined): string {
  const value = (status ?? "").toLowerCase();
  if (!value) return "unknown";
  if (value === "authorized" || value === "active" || value === "approved") return "approved";
  if (value === "paused" || value === "paused_by_user") return "paused";
  if (value === "cancelled" || value === "cancelled_by_user") return "cancelled";
  return value;
}

function normalizeAuthorizedPaymentStatus(status: string | null | undefined): string {
  const value = (status ?? "").toLowerCase();
  if (!value) return "unknown";
  if (value === "approved") return "approved";
  if (value === "authorized" || value === "in_process" || value === "pending") return "pending";
  return value;
}

function normalizePaymentStatus(status: string | null | undefined): string {
  const value = (status ?? "").toLowerCase();
  if (!value) return "unknown";
  if (value === "approved") return "approved";
  if (value === "authorized" || value === "in_process" || value === "in_process_planned" || value === "pending")
    return "pending";
  if (value === "cancelled" || value === "refunded" || value === "charged_back") return "cancelled";
  return value;
}

function resolvePayerEmailFromPayment(resource: PaymentResource): string | null {
  const direct = resource?.payer && typeof resource.payer === "object" ? resource.payer?.email : null;
  if (direct && typeof direct === "string") return direct;
  const meta = extractMetadataObject(resource?.metadata);
  const fromMeta = meta?.payer_email ?? meta?.email ?? null;
  return typeof fromMeta === "string" && fromMeta ? fromMeta : null;
}

function extractMetadataObject(
  metadata: PaymentResource["metadata"]
): Record<string, unknown> | null {
  if (!metadata) return null;
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof metadata === "object") {
    return metadata;
  }
  return null;
}

function resolveMetadataUserIdFromPayment(resource: PaymentResource): string | null {
  const meta = extractMetadataObject(resource?.metadata);
  if (!meta) return null;
  const raw =
    meta.user_id ??
    meta.userId ??
    meta.profile_id ??
    meta.profileId ??
    (meta.user && typeof meta.user === "object" ? (meta.user as any).id : null);
  return typeof raw === "string" && raw ? raw : null;
}

function resolveMetadataKindFromPayment(resource: PaymentResource): string | null {
  const meta = extractMetadataObject(resource?.metadata);
  if (!meta) return null;
  const raw = meta.kind ?? meta.type ?? null;
  return typeof raw === "string" && raw ? raw.toLowerCase() : null;
}

function resolvePremiumUntilForOneTime(baseIso: string | null): string | null {
  const durationDays = resolveOneTimeAccessDays();
  if (!durationDays) return null;
  if (!baseIso) return null;
  return addDaysToIso(baseIso, durationDays);
}

function resolveOneTimeAccessDays(): number | null {
  const raw =
    process.env.MP_ONE_TIME_DAYS ??
    process.env.MP_ONE_TIME_DURATION_DAYS ??
    process.env.NEXT_PUBLIC_MP_ONE_TIME_DAYS ??
    process.env.NEXT_PUBLIC_MP_ONE_TIME_DURATION_DAYS ??
    "";
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

function firstValidDateIso(candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const iso = toIsoString(candidate);
    if (iso) return iso;
  }
  return null;
}

function toIsoString(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizeTrialFrequencyToDays(
  frequency: number | null | undefined,
  frequencyType: string | null | undefined
): number | null {
  const numeric = typeof frequency === "number" ? frequency : Number(frequency ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const type = (frequencyType ?? "").toLowerCase();
  if (type === "days" || type === "") return Math.floor(numeric);
  if (type === "weeks") return Math.floor(numeric * 7);
  if (type === "months") return Math.floor(numeric * 30);
  return null;
}

function resolveEnvTrialDays(): number | null {
  const raw = process.env.MP_TRIAL_DAYS ?? process.env.NEXT_PUBLIC_MP_TRIAL_DAYS;
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

function addDaysToIso(iso: string, days: number): string | null {
  const base = new Date(iso);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

async function findExistingPayment(
  admin: AdminClient,
  identifiers: {
    preapprovalId: string | null;
    authorizedPaymentId: string | null;
    externalReference: string | null;
  }
): Promise<PaymentRow | null> {
  const columns =
    "id,user_id,status,paid_at,preapproval_id,authorized_payment_id,external_reference,provider_ref,amount,currency_id,trial";

  if (identifiers.authorizedPaymentId) {
    const { data } = await admin
      .from("payments")
      .select(columns)
      .eq("authorized_payment_id", identifiers.authorizedPaymentId)
      .maybeSingle();
    if (data) return data as PaymentRow;
  }

  if (identifiers.preapprovalId) {
    const { data } = await admin
      .from("payments")
      .select(columns)
      .eq("preapproval_id", identifiers.preapprovalId)
      .maybeSingle();
    if (data) return data as PaymentRow;
  }

  if (identifiers.externalReference) {
    const { data } = await admin
      .from("payments")
      .select(columns)
      .eq("id", identifiers.externalReference)
      .maybeSingle();
    if (data) return data as PaymentRow;

    const { data: providerRef } = await admin
      .from("payments")
      .select(columns)
      .eq("provider_ref", identifiers.externalReference)
      .maybeSingle();
    if (providerRef) return providerRef as PaymentRow;
  }

  return null;
}

async function resolveUserId(
  admin: AdminClient,
  snapshot: { externalReference: string | null; payerEmail: string | null },
  existing: PaymentRow | null,
  explicitUserId: string | null = null
) {
  if (existing?.user_id) return existing.user_id;
  if (explicitUserId) return explicitUserId;

  if (snapshot.externalReference) {
    const { data } = await admin
      .from("payments")
      .select("user_id")
      .eq("id", snapshot.externalReference)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  if (snapshot.payerEmail) {
    const { data } = await admin.from("profiles").select("id").eq("email", snapshot.payerEmail).maybeSingle();
    if (data?.id) return data.id as string;
  }

  return null;
}
