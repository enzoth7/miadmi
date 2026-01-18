import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";

export async function POST(request) {
const supabase = await supabaseServer();

  // OJO: getUser() solo funciona si supabaseServer() está armado con cookies/headers del request.
  // Le pasamos request para que pueda leer cookies (si tu helper lo soporta).
  // Si tu supabaseServer no acepta params, dejalo como supabaseServer() y listo.
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "no-auth" }, { status: 401 });
    }

    const payload = { id: user.id, email: user.email || null };

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "server-error" },
      { status: 500 }
    );
  }
}
