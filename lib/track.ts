export async function track(name: string, meta?: Record<string, any>): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      // Only track from server environments (SSR/Route Handlers/Server Actions)
      return
    }

    const { getServerClient } = await import('./supabaseServer')
    const supabase = await getServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from('events').insert({
      user_id: user.id,
      name,
      meta: meta ?? null,
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('track() failed:', err)
    }
  }
}

export default track

