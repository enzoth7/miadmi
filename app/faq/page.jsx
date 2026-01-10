import Link from "next/link";

export const metadata = {
  title: "Preguntas frecuentes - Mi Admi",
};

const linkClass =
  "font-semibold text-emerald-200 underline decoration-dotted underline-offset-4 hover:text-emerald-100";

const faqs = [
  {
question: "¿Cuál es la diferencia entre Free y Premium?",
answer: [
  "El plan Free te permite usar Mi Admi con funciones básicas: hasta 6 meses de historial y proyección, hasta 5 egresos estimables (préstamos, tarjetas o compras), sin exportaciones y sin categorías personalizadas ni ajustes avanzados.",
  "El plan Premium desbloquea el control completo: proyecciones e historial de hasta 24 meses, egresos estimables ilimitados, exportaciones sin límites (CSV), categorías personalizadas, ajustes en la Estimación Específica y soporte prioritario con respuesta en hasta 48 horas.",
],
  },
  {
question: "¿El plan Premium es una suscripción?",
answer: [
  "Sí. Mi Admi Premium funciona con una suscripción mensual. Podés cancelarla en cualquier momento y seguir usando las funciones Premium hasta el final del período ya abonado.",
],
  },
  {
question: "¿Cuánto cuesta Mi Admi Premium?",
answer: [
  "Mi Admi Premium tiene un costo de UYU 250 por mes.",
  <>
    Podés ver el precio actualizado en la{" "}
    <Link href="/paywall" className={linkClass}>
      página de precios
    </Link>
    .
  </>,
],
  },
  {
    question: "¿Cómo pago?",
    answer: [
      "A través de Mercado Pago. Al finalizar, Premium se activa automaticamente en el momento.",
    ],
  },
  {
    question: "Cancelaciones y reembolsos",
    answer: [
      "Mi Admi funciona bajo modalidad de suscripción mensual. Podés cancelar en cualquier momento desde MercadoPago y mantener el acceso hasta el final del período ya abonado. No realizamos reembolsos por períodos ya facturados, salvo error de cobro o transacción no autorizada.",  
    ],
  },
  {
question: "¿Recibo comprobante de pago?",
answer: [
  "Sí. Mercado Pago emite el comprobante de cada pago y lo envía al email asociado a tu cuenta.",
],
  },
  {
    question: "¿Los precios incluyen impuestos?",
answer: [
  "El precio mostrado es el final para Uruguay. Cualquier impuesto aplicable será detallado en el comprobante emitido por Mercado Pago.",
],
  },
  {
 question: "¿Puedo probar Premium antes de pagar?",
answer: [
  "No ofrecemos un período de prueba separado. Podés usar Mi Admi gratis con el plan Free y, cuando lo necesites, activar Premium para desbloquear todas las funciones.",
],
  },
  {
    question: "¿Puedo pasar de Free a Premium después?",
    answer: ["Si. Cuando quieras. Conservas tus datos y configuracion."],
  },
  {
question: "¿Puedo volver al plan Free después de usar Premium?",
answer: [
  "Sí. Podés cancelar la suscripción Premium en cualquier momento y tu cuenta volverá automáticamente al plan Free al finalizar el período ya abonado. Te recomendamos que guardes copia de los datos de las funciones que se van a limitar al volver a Free",
],
  },
  {
    question: "¿Las categorias personalizadas son Premium?",
    answer: ["Si. En Free no podras crear categorias personalizadas."],
  },
  {
    question: "¿Mis datos se guardan en la nube?",
    answer: [
      <>
        Si. Tu información se almacena en la nube de forma segura y podes exportarla segun tu plan. Mas detalles en la{" "}
        <Link href="/politica-de-privacidad" className={linkClass}>
          Politica de Privacidad
        </Link>
        .
      </>,
    ],
  },
  {
    question: "¿Qué pasa si cambio de dispositivo o pierdo el telefono?",
    answer: [
      <>
        Nada se pierde: iniciando sesion recuperas todo. Si necesitas ayuda, escribinos a{" "}
        <Link href="mailto:soporte@tudominio" className={linkClass}>
          soporte@tudominio
        </Link>
        .
      </>,
    ],
  },
  {
    question: "¿Puedo usar mi cuenta en varios dispositivos?",
    answer: ["Si, mientras utilices el mismo email."],
  },
  {
    question: "¿Puedo cambiar el email de mi cuenta?",
    answer: [
      <>
        Si. Pedilo a{" "}
        <Link href="mailto:soporte@tudominio" className={linkClass}>
          soporte@tudominio
        </Link>
        . Por seguridad, pediremos verificacion.
      </>,
    ],
  },
  {
    question: "¿Cómo contacto soporte y en cuanto responden?",
    answer: [
      <>
        Escribinos a{" "}
        <Link href="mailto:soporte@tudominio" className={linkClass}>
          soporte@tudominio
        </Link>
        . Respondemos dentro de 48 h habiles (usuarios Premium tienen prioridad).
      </>,
    ],
  },
  {
    question: "¿Qué pasa si Mercado Pago rechaza mi pago o queda pendiente?",
    answer: [
      "Si se rechaza, no se cobra y podes reintentar.",
      "Si queda pendiente, se activa automaticamente al confirmarse (te avisamos por email).",
    ],
  },
  {
    question: "¿Qué pasa si detecto un cobro duplicado?",
    answer: [
      <>
        Te devolvemos el duplicado. Envia el ID de operacion a{" "}
        <Link href="mailto:soporte@tudominio" className={linkClass}>
          soporte@tudominio
        </Link>
        .
      </>,
    ],
  },
  {
question: "¿Puede cambiar el precio de Premium?",
answer: [
  "Sí. El precio puede actualizarse en el futuro. Si tenés una suscripción activa, cualquier cambio se aplicará a partir del próximo ciclo de facturación y se te avisará antes.",
],

  },
  {
question: "¿Dónde veo cambios y novedades?",
answer: [
  "Publicamos las novedades y mejoras directamente dentro de la app a medida que se van lanzando.",
],
  },
];

export default function FaqPage() {
  return (
    <div className="space-y-6 text-white py-16">
      <section>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Preguntas frecuentes</h1>
        <p className="mt-3 text-sm text-white/80">
          Guia rapida con las dudas mas comunes sobre planes, facturacion y soporte de Mi Admi.
        </p>
      </section>

      <section>
        <div className="mt-5 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/30"
            >
              <summary className="flex cursor-pointer items-center justify-between text-left text-lg font-semibold text-white">
                <span>{faq.question}</span>
                <span className="text-sm text-white/60">+</span>
              </summary>
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-sm text-white/80">
                {faq.answer.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
