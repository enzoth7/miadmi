import { MercadoPagoConfig, Preference, PreApproval, Payment, MerchantOrder } from "mercadopago";

export function getMP() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("Missing MP_ACCESS_TOKEN");

  // 🚫 No cachear entre requests (evita mezclar tokens en runtimes warm)
  const client = new MercadoPagoConfig({ accessToken: token });

  return {
    client,
    preference: new Preference(client),
    preapproval: new PreApproval(client),
    payment: new Payment(client),
    merchantOrder: new MerchantOrder(client),
  };
}
