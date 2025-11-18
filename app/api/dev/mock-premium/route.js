import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnon) {
      return NextResponse.json({ ok: false, error: "missing-supabase-env" }, { status: 500 });
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "no-auth" }, { status: 401 });

    const until = new Date();
    until.setDate(until.getDate() + 30);

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });
      const { error } = await admin
        .from("profiles")
        .update({ plan: "premium", premium_until: until.toISOString() })
        .eq("id", user.id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase
        .from("profiles")
        .update({ plan: "premium", premium_until: until.toISOString() })
        .eq("id", user.id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, plan: "premium", premium_until: until.toISOString() });
  } catch (err) {
    console.error("mock-premium error", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
