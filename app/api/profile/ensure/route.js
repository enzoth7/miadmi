import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";

export async function POST() {
  const supabase = supabaseServer();

  // 1) Obtener sesión/usuario actual
const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
  return NextResponse.json({ ok: false, error: "no-auth" }, { status: 401 });
}


  // 2) Upsert de la fila en profiles (gracias a las políticas RLS que agregamos)
  const payload = {
    id: user.id,
    email: user.email || null,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
