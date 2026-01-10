import { sendEmail } from "@/lib/mailer";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const to = (url.searchParams.get("to") || "").trim();

    if (!to) {
      return Response.json({ error: "Pasá ?to=TU_EMAIL" }, { status: 400 });
    }

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
    console.error("TEST_EMAIL_ERROR", e);
    return Response.json({ error: e?.message || "Error enviando email." }, { status: 500 });
  }
}
