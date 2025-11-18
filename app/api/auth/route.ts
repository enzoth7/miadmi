import { NextResponse } from 'next/server'
import { getServerClient } from '../../../lib/supabaseServer'

export async function POST() {
  const supabase = await getServerClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}

