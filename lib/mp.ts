import { MercadoPagoConfig, Preference, PreApproval, Payment, MerchantOrder } from 'mercadopago'

let client: MercadoPagoConfig | null = null
let preference: Preference | null = null
let preapproval: PreApproval | null = null
let payment: Payment | null = null
let merchantOrder: MerchantOrder | null = null

export function getMP() {
  if (!client) {
    const token = process.env.MP_ACCESS_TOKEN
    if (!token) throw new Error('Missing MP_ACCESS_TOKEN')
    client = new MercadoPagoConfig({ accessToken: token })
  }
  if (!preference) preference = new Preference(client)
  if (!preapproval) preapproval = new PreApproval(client)
  if (!payment) payment = new Payment(client)
  if (!merchantOrder) merchantOrder = new MerchantOrder(client)
  return { client, preference: preference!, preapproval: preapproval!, payment: payment!, merchantOrder: merchantOrder! }
}
