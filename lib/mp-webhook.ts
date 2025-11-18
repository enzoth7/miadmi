const MP_API_BASE_URL = "https://api.mercadopago.com";

export type PreapprovalResource = {
  id: string;
  status?: string;
  external_reference?: string | null;
  payer_email?: string | null;
  date_created?: string | null;
  date_approved?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    transaction_amount?: number | null;
    currency_id?: string | null;
    free_trial?: {
      frequency?: number | null;
      frequency_type?: string | null;
    } | null;
  } | null;
  last_authorized_payment?: {
    id?: string | null;
    status?: string | null;
    date_created?: string | null;
  } | null;
};

export type AuthorizedPaymentResource = {
  id: string;
  status?: string;
  preapproval_id?: string | null;
  external_reference?: string | null;
  payer_email?: string | null;
  date_created?: string | null;
  date_approved?: string | null;
  money_release_date?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
};

export type PaymentResource = {
  id: string;
  status?: string;
  external_reference?: string | null;
  metadata?: Record<string, unknown> | string | null;
  payer?: {
    email?: string | null;
  } | null;
  date_created?: string | null;
  date_approved?: string | null;
  money_release_date?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
};

async function mpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Missing MP_ACCESS_TOKEN");

  const target = `${MP_API_BASE_URL}${path}`;
  const res = await fetch(target, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mercado Pago request failed (${res.status} ${res.statusText}) ${text}`);
  }

  return (await res.json()) as T;
}

export async function fetchPreapprovalResource(id: string): Promise<PreapprovalResource> {
  if (!id) throw new Error("Missing preapproval id");
  return mpFetch<PreapprovalResource>(`/preapproval/${encodeURIComponent(id)}`);
}

export async function fetchAuthorizedPaymentResource(id: string): Promise<AuthorizedPaymentResource> {
  if (!id) throw new Error("Missing authorized payment id");
  return mpFetch<AuthorizedPaymentResource>(`/authorized_payments/${encodeURIComponent(id)}`);
}

export async function fetchPaymentResource(id: string): Promise<PaymentResource> {
  if (!id) throw new Error("Missing payment id");
  return mpFetch<PaymentResource>(`/v1/payments/${encodeURIComponent(id)}`);
}
