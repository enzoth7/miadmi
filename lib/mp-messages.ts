import { addMessage as upsertMessage, listMessages as listStoredMessages } from "./messages";
import { getMP } from "./mp";

function resolveAmount(): number {
  const raw =
    process.env.MP_MESSAGE_AMOUNT ??
    process.env.MP_ONE_TIME_AMOUNT ??
    process.env.MP_PLAN_AMOUNT ??
    "100";

  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 100;
}

function resolveTitle(): string {
  return (
    process.env.MP_MESSAGE_TITLE ??
    process.env.MP_ONE_TIME_DESCRIPTION ??
    process.env.MP_PLAN_DESCRIPTION ??
    "Mensaje de muro"
  );
}

function resolveBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    ""
  );
}

function normalizeReturnPath(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/")) return `/${trimmed}`;
  return trimmed;
}

export const api = {
  message: {
    async list() {
      return listStoredMessages();
    },
    async submit(
      text: string,
      options?: { userId?: string | null; returnPath?: string | null }
    ) {
      const trimmed = (text ?? "").toString().trim();
      if (!trimmed) throw new Error("message text is required");

      const baseUrl = resolveBaseUrl();
      if (!baseUrl) {
        throw new Error("APP_URL no está configurada");
      }

      const amount = resolveAmount();
      const title = resolveTitle();
      const returnPath = normalizeReturnPath(options?.returnPath) ?? "/pagos-mensaje";
      const { preference } = getMP();

      const payload = {
        body: {
          items: [
            {
              id: "message",
              unit_price: amount,
              quantity: 1,
              title,
            },
          ],
          back_urls: {
            success: `${baseUrl}${returnPath}?status=success`,
            failure: `${baseUrl}${returnPath}?status=failure`,
            pending: `${baseUrl}${returnPath}?status=pending`,
          },
          auto_return: "approved",
          notification_url: `${baseUrl}/api/mercadopago`,
          metadata: {
            text: trimmed,
            kind: "message",
            user_id: options?.userId ?? null,
          },
        },
      };

      const preferenceResponse = await preference.create(payload);
      const initPoint =
        (preferenceResponse as any)?.init_point ??
        (preferenceResponse as any)?.body?.init_point ??
        null;

      if (!initPoint) throw new Error("Mercado Pago no devolvió init_point");

      return initPoint as string;
    },
    async add(message: { id: string; text: string; userId?: string | null }) {
      const { id, text, userId = null } = message;
      await upsertMessage({ id, text, userId });
    },
  },
};

export default api;
