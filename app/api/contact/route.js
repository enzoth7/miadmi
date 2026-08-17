import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export async function POST(req) {
  try {
    const body = await req.json();

    const nombre = String(body?.nombre || "").trim();
    const email = String(body?.email || "").trim();
    const tema = String(body?.tema || "Soporte").trim();
    const mensaje = String(body?.mensaje || "").trim();

    if (!email || !mensaje) {
      return Response.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }

    // IMPORTANTE:
    // - from tiene que ser un dominio verificado en Resend (ej: noreply@miadmi.com)
    // - to: tu soporte real
const from = "Mi Admi <noreply@mail.miadmi.com>";
const to = ["soporte@miadmi.com"];
const replyTo = email;



    const subject = `[Mi Admi] ${tema} — ${email}`;

    const text = [
      `Nuevo mensaje de contacto`,
      ``,
      `Nombre: ${nombre || "-"}`,
      `Email: ${email}`,
      `Tema: ${tema}`,
      ``,
      `Mensaje:`,
      mensaje,
    ].join("\n");

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      text,
      // opcional: para que puedas "Responder" directo al usuario desde tu mail:
      replyTo: email,
    });

    if (error) {
      console.error("RESEND_ERROR", error);
      return Response.json({ error: "No se pudo enviar el email." }, { status: 500 });
    }

    return Response.json({ ok: true, id: data?.id }, { status: 200 });
  } catch (e) {
    console.error("CONTACT_ERROR", e);
    return Response.json({ error: "Error procesando el mensaje." }, { status: 500 });
  }
}
