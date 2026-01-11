import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  const cookieStore = await cookies();
  const redirectToCookie = cookieStore.get('post_auth_redirect')?.value;
  const redirectTo = redirectToCookie ? decodeURIComponent(redirectToCookie) : '/home';

  if (!code) {
    return NextResponse.redirect(new URL('/login?reason=missing_code', url.origin));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?reason=oauth_error', url.origin));
  }

  // Obtener user ya con sesión
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let finalRedirect = redirectTo;

  if (user) {
    // Chequear si ya completó onboarding usando completedAt
    const { data: settingsRow } = await supabase
      .from('app_settings')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();

    const completedAt = (settingsRow as any)?.data?.onboarding?.completedAt;

    if (!completedAt) {
      finalRedirect = '/onboarding';
    }
  }

  cookieStore.set('post_auth_redirect', '', { path: '/', maxAge: 0 });
  return NextResponse.redirect(new URL(finalRedirect, url.origin));
}
