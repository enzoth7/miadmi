import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabaseServer'

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 404 })
  }

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

  const premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { error: upErr } = await supabase
    .from('profiles')
    .update({ plan: 'premium', premium_until: premiumUntil })
    .eq('id', user.id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  await supabase.from('payments').insert({
    user_id: user.id,
    provider: 'mock',
    kind: 'one_time',
    status: 'approved',
    provider_ref: 'mock-success',
    paid_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, premium_until: premiumUntil })
}
