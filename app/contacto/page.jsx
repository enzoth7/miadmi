"use client";

import Link from "next/link";
import { useState } from "react";

const linkClass =
  "font-semibold text-emerald-200 underline decoration-dotted underline-offset-4 hover:text-emerald-100";

export default function ContactoPage() {
  const [status, setStatus] = useState("idle"); // "idle" | "sending" | "success" | "error"
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      nombre: String(formData.get("nombre") || ""),
      email: String(formData.get("email") || ""),
      tema: String(formData.get("tema") || ""),
      mensaje: String(formData.get("mensaje") || ""),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo enviar el mensaje.");
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err?.message || "Error enviando el mensaje.");
    }
  }

  return (
    <div className="space-y-6 py-16 text-white">
      <section>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Contacto y Soporte</h1>
        <p className="mt-4 text-sm text-white/80">
          Horario de atención: Lunes a Viernes, 09:00–18:00 (UTC-03:00, Montevideo). Idioma: Español.
        </p>
        <p className="mt-2 text-sm text-white/70">
          Si tenés dudas sobre tu cuenta, pagos o el funcionamiento de Mi Admi, escribinos por el formulario o por email.
        </p>

        <p className="mt-4 text-sm text-white/80">
          Email directo:{" "}
          <Link href="mailto:soporte@miadmi.com" className={linkClass}>
            soporte@miadmi.com
          </Link>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Protección de datos y abuso</h2>
        <p className="mt-3 text-sm text-white/80">
          Tratamos tus datos según la Ley 18.331.Más detalles en{" "}
          <Link href="/politica-de-privacidad" className={linkClass}>
            Política de Privacidad
          </Link>
          .
        </p>
        <p className="mt-4 text-sm text-white/80">
          Nos reservamos el derecho de limitar o suspender el soporte frente a abuso, fraude o uso contrario a los términos.
        </p>
      </section>
    </div>
  );
}
