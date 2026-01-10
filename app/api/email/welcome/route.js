import { sendEmail } from "@/lib/mailer";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Faltan envs de Supabase (URL o SERVICE_ROLE).");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function POST(req) {
  try {
    // 1) Validar usuario por JWT del cliente
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return Response.json({ error: "No auth token." }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return Response.json({ error: "Unauthorized." }, { status: 401 });

    const user = userData.user;
    const to = user.email;

    if (!to) return Response.json({ error: "Usuario sin email." }, { status: 400 });

    await sendEmail({
      to,
      subject: "Bienvenido a Mi Admi",
      text: [
        "¡Bienvenido a Mi Admi!",
        "",
        "Tu cuenta fue creada correctamente.",
        "Ingresá acá: https://miadmi.com",
        "",
        "Si necesitás ayuda, respondé este email o escribinos a soporte@miadmi.com.",
      ].join("\n"),
      replyTo: "soporte@miadmi.com",
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("WELCOME_EMAIL_ERROR", e);
    return Response.json({ error: e?.message || "Error enviando welcome." }, { status: 500 });
  }
}
