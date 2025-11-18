import { getMP } from "./mp";
import { processPreapprovalEvent } from "./mp-webhook-processor";
import { getAdminSupabase } from "./supabaseAdmin";

type VerifyArgs = {
  userId?: string | null;
  userEmail?: string | null;
  preapprovalId?: string | null;
  paymentId?: string | null;
};

type VerifyResult = {
  status: string | null;
  paymentId: string | null;
  profileUpdated: boolean;
  inserted: boolean;
  preapprovalId: string | null;
};

export async function verifySubscriptionForUser(args: VerifyArgs): Promise<VerifyResult> {
  const { userId = null, userEmail = null, preapprovalId: maybePreapprovalId = null, paymentId: providedPaymentId = null } = args;

  const admin = getAdminSupabase();

  const resolvedPreapproval = await resolvePreapprovalId({
    userId,
    userEmail,
    preapprovalId: maybePreapprovalId,
    paymentId: providedPaymentId,
    admin,
  });

  if (!resolvedPreapproval) {
    console.log("[subscription] no preapproval id available", {
      user_id: userId,
      user_email: userEmail,
    });
    return {
      status: null,
      paymentId: providedPaymentId,
      profileUpdated: false,
      inserted: false,
      preapprovalId: null,
    };
  }

  const requestId = `manual-verify-${Date.now()}`;
  const occurredAtIso = new Date().toISOString();

  const persistence = await processPreapprovalEvent(admin, {
    preapprovalId: resolvedPreapproval,
    eventType: "manual_verify",
    requestId,
    lastEventAtIso: occurredAtIso,
  });

  console.log("[subscription] verification result", {
    user_id: userId,
    query_preapproval_id: maybePreapprovalId,
    query_payment_id: providedPaymentId,
    preapproval_id: resolvedPreapproval,
    status_final: persistence.finalStatus,
    payment_row_id: persistence.paymentId,
    payments_rows: persistence.paymentsAffected,
    profiles_rows: persistence.profilesAffected,
  });

  return {
    status: persistence.finalStatus,
    paymentId: persistence.paymentId,
    profileUpdated: persistence.profilesAffected > 0,
    inserted: persistence.paymentsAffected > 0,
    preapprovalId: resolvedPreapproval,
  };
}

export async function reconcileSubscription(preapprovalId: string) {
  try {
    await verifySubscriptionForUser({ preapprovalId });
  } catch (err) {
    console.error("[subscription] reconciliation failed", err);
  }
}

async function resolvePreapprovalId(args: {
  userId?: string | null;
  userEmail?: string | null;
  preapprovalId?: string | null;
  paymentId?: string | null;
  admin: any;
}): Promise<string | null> {
  const { userId, userEmail, preapprovalId, paymentId, admin } = args;
  if (preapprovalId) return preapprovalId;

  if (paymentId) {
    const { data } = await admin
      .from("payments")
      .select("provider_ref")
      .eq("id", paymentId)
      .eq("provider", "mercado_pago")
      .eq("kind", "subscription")
      .maybeSingle();
    if (data?.provider_ref) return data.provider_ref;
  }

  const fromSearchByExternal = await searchPreapproval({ filters: userId ? { external_reference: userId } : null });
  if (fromSearchByExternal) return fromSearchByExternal;

  const fromSearchByEmail = await searchPreapproval({ filters: userEmail ? { payer_email: userEmail } : null });
  if (fromSearchByEmail) return fromSearchByEmail;

  if (userId) {
    const { data } = await admin
      .from("payments")
      .select("provider_ref, id")
      .eq("user_id", userId)
      .eq("provider", "mercado_pago")
      .eq("kind", "subscription")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.provider_ref) return data.provider_ref;
  }

  return null;
}

async function searchPreapproval(args: {
  filters: Record<string, string | null | undefined> | null;
}): Promise<string | null> {
  const { filters } = args;
  if (!filters) return null;

  const cleanedFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== "")
  );
  if (Object.keys(cleanedFilters).length === 0) return null;

  try {
    const { preapproval } = getMP();
    const searchResult = await preapproval.search({
      options: {
        filters: cleanedFilters,
        limit: 1,
        sort: "date_created",
        order: "desc",
      },
    } as any);

    const results =
      (searchResult as any)?.results ??
      (searchResult as any)?.body?.results ??
      (Array.isArray(searchResult) ? searchResult : []);

    const first = Array.isArray(results) && results.length > 0 ? results[0] : null;
    const preapprovalId =
      first?.id ?? first?.preapproval_id ?? first?.body?.id ?? first?.body?.preapproval_id ?? null;
    return preapprovalId ? String(preapprovalId) : null;
  } catch (err) {
    console.warn("[subscription] preapproval search failed", { filters: cleanedFilters, err });
    return null;
  }
}
