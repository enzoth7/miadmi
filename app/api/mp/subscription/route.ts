import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabaseServer'
import { getMP } from '../../../../lib/mp'

type Body = {
  reason?: string
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    const accessToken = bearerMatch?.[1]
    const supabase = await getServerClient(accessToken)
    const {
      data: { user },
      error: getUserError,
    } = accessToken ? await supabase.auth.getUser(accessToken) : await supabase.auth.getUser()
    if (getUserError) return NextResponse.json({ error: getUserError.message }, { status: 401 })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { reason: requestedReason } = (await req.json().catch(() => ({}))) as Body

const amount = Number(process.env.MP_PLAN_AMOUNT ?? process.env.MP_MESSAGE_AMOUNT ?? '250')
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid plan amount' }, { status: 400 })
    }

    const currencyId = process.env.MP_CURRENCY_ID || 'UYU'

    const reason = requestedReason || 'Premium mensual'

    const baseUrl = process.env.APP_URL || ''
    if (!baseUrl) {
      return NextResponse.json({ error: 'Missing APP_URL' }, { status: 500 })
    }

    const { data: payRow, error: insErr } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        provider: 'mercado_pago',
        kind: 'subscription',
        status: 'pending',
        trial: false,
      })
      .select('id')
      .single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })


// 🔎 DEBUG: confirmar país/site del access token en producción
try {
  const token = process.env.MP_ACCESS_TOKEN!;
  const r = await fetch("https://api.mercadopago.com/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const me = await r.json();

  console.log("[mp-subscription][users/me]", {
    ok: r.ok,
    status: r.status,
    id: me?.id,
    nickname: me?.nickname,
    site_id: me?.site_id,       // <- CLAVE (MLU/MLA/etc)
    country_id: me?.country_id, // <- CLAVE
    currency_id_env: currencyId,
    base_url_env: baseUrl,
  });
} catch (e: any) {
  console.log("[mp-subscription][users/me] failed", e?.message ?? e);
}













    const { preapproval } = getMP()
    const notificationUrl = `${baseUrl}/api/mp/webhook`
    const initialBackUrl = `${baseUrl}/paywall?subscription=1`

    console.log('[mp-subscription] creating preapproval', { amount, typeofAmount: typeof amount })

    const payload: any = {
      body: {
        reason,
        back_url: initialBackUrl,
        external_reference: String(payRow.id),
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: amount,
          currency_id: currencyId,
          start_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
        payer_email: String(user.email ?? ''),
        notification_url: notificationUrl,
      },
    }

    const pre = await preapproval.create(payload)
    const preId = (pre as any)?.id ?? (pre as any)?.body?.id
    const initPoint =
      (pre as any)?.init_point || (pre as any)?.sandbox_init_point || (pre as any)?.body?.init_point || (pre as any)?.body?.sandbox_init_point
    if (!preId || !initPoint) return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })

    const finalBackUrl = `${baseUrl}/paywall?subscription=1&preapproval_id=${encodeURIComponent(String(preId))}`
    if (finalBackUrl !== initialBackUrl) {
      try {
        await preapproval.update({
          id: String(preId),
          body: {
            back_url: finalBackUrl,
          },
        })
      } catch (err) {
        console.warn('[mp-subscription] failed to update back_url', {
          preapproval_id: preId,
          error: (err as any)?.message ?? err,
        })
      }
    }

    const updatePayload: Record<string, any> = {
      provider_ref: String(preId),
      preapproval_id: String(preId),
      external_reference: String(payRow.id),
      amount,
      currency_id: currencyId,
      trial: false,
    }

    const { error: updateErr } = await supabase.from('payments').update(updatePayload).eq('id', payRow.id)
    if (updateErr && updateErr.message?.includes('column')) {
      const fallbackUpdate = {
        provider_ref: String(preId),
        status: 'pending',
      }
      await supabase.from('payments').update(fallbackUpdate).eq('id', payRow.id)
    }

    console.log('[mp-subscription] payments pending row', {
      payment_id: payRow.id,
      user_id: user.id,
      status: 'pending',
    })

    console.log('[mp-subscription] preapproval created', {
      preapproval_id: String(preId),
      payment_id: payRow.id,
      user_id: user.id,
      payer_email: payload.body.payer_email,
      back_url: payload.body.back_url,
      notification_url: payload.body.notification_url,
    })

    return NextResponse.json({
      init_point: initPoint,
      preapproval_id: String(preId),
      payment_id: String(payRow.id),
      amount,
    })
} catch (e: any) {
  console.error("[mp-subscription] error", {
    message: e?.message,
    cause: e?.cause,
    status: e?.status,
    response: e?.response?.data ?? e?.response ?? null,
  });
  return NextResponse.json(
    { error: e?.response?.data?.message ?? e?.message ?? "Unexpected error" },
    { status: 500 }
  );
}

}

export const runtime = 'nodejs'
