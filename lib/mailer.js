import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export async function sendEmail({ to, subject, text, replyTo }) {
  const from = "Mi Admi <noreply@miadmi.com>";

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    replyTo,
  });

  if (error) {
    console.error("RESEND_ERROR", error);
    throw new Error("No se pudo enviar el email.");
  }

  return data;
}
