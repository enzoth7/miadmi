import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabaseServer'
import { getMP } from '../../../../lib/mp'

type Body = {
  amount?: number
  description?: string
}

function resolveAmount(bodyAmount?: number): number {
  const envRaw = Number(process.env.MP_ONE_TIME_AMOUNT ?? process.env.MP_PLAN_AMOUNT ?? '')
  const fallback = Number.isFinite(envRaw) && envRaw > 0 ? envRaw : 200
  const requested = Number(bodyAmount ?? 0)
  if (Number.isFinite(requested) && requested > 0) return requested
  return fallback
}

function resolveDescription(bodyDescription?: string | null): string {
  if (bodyDescription && typeof bodyDescription === 'string' && bodyDescription.trim()) {
    return bodyDescription.trim()
  }
  return (
    process.env.MP_ONE_TIME_DESCRIPTION ??
    process.env.MP_PLAN_DESCRIPTION ??
    'Mi Admi - Acceso premium'
  )
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

    const body = (await req.json().catch(() => ({}))) as Body
    const amount = resolveAmount(body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Monto invalido' }, { status: 400 })
    }

    const currencyId = process.env.MP_CURRENCY_ID || 'UYU'
    const description = resolveDescription(body?.description ?? null)

    const baseUrl = process.env.APP_BASE_URL || ''

    const { data: payRow, error: insErr } = await supabase
      .from('payments')
      .insert({ user_id: user.id, provider: 'mercado_pago', kind: 'one_time', status: 'pending' })
      .select('id')
      .single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    const { preference } = getMP()
    const payload: any = {
      body: {
        items: [
          {
            title: description,
            quantity: 1,
            unit_price: Number(amount),
            currency_id: currencyId,
          },
        ],
        back_urls: {
          success: `${baseUrl}/home?status=success`,
          failure: `${baseUrl}/paywall?status=failure`,
          pending: `${baseUrl}/paywall?status=pending`,
        },
        notification_url: `${baseUrl}/api/mp/webhook`,
        auto_return: 'approved',
        external_reference: payRow.id,
        metadata: { user_id: user.id, kind: 'one_time' },
      },
    }

    const pref = await preference.create(payload)
    const prefId = (pref as any)?.id ?? (pref as any)?.body?.id
    const initPoint = (pref as any)?.init_point ?? (pref as any)?.body?.init_point
    if (!prefId || !initPoint) return NextResponse.json({ error: 'Failed to create preference' }, { status: 500 })

    const updatePayload: Record<string, any> = {
      provider_ref: String(prefId),
      amount,
      currency_id: currencyId,
    }

    const { error: updateErr } = await supabase.from('payments').update(updatePayload).eq('id', payRow.id)
    if (updateErr) {
      if (updateErr.message?.includes('column')) {
        await supabase.from('payments').update({ provider_ref: String(prefId) }).eq('id', payRow.id)
      } else {
        console.warn('[mp-checkout] payments update failed', { error: updateErr.message })
      }
    }

    return NextResponse.json({ init_point: initPoint, id: String(prefId), amount, currency_id: currencyId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
