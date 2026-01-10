import Link from "next/link";

export const metadata = {
  title: "Politica de privacidad",
};

const linkClass =
  "font-semibold text-emerald-200 underline decoration-dotted underline-offset-4 hover:text-emerald-100";

export default function PoliticaPrivacidadPage() {
  return (
    <div className="space-y-6 text-white py-16">
      <section>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Politica de Privacidad</h1>
        <div className="mt-4 space-y-1 text-sm text-white/80">
          <p>Vigente desde: 01/12/2025</p>
          <p>Responsable del banco de datos: MI ADMI</p>
          <p>Contacto: <Link href="mailto:soporte@miadmi.com" className={linkClass}>soporte@miadmi.com</Link></p>
        </div>
        <p className="mt-4 text-sm text-white/70">
          Mi-Admi trata datos personales conforme a la Ley 18.331 y su reglamentacion (Decretos 414/009 y 64/020). Es un derecho
          fundamental reconocido por la normativa uruguaya (fuente: IMPO / Gobierno del Uruguay).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Datos que tratamos</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/80">
          <li>Cuenta: nombre, email, contrasena (hash), pais e idioma.</li>
          <li>Uso de la app: categorias creadas, movimientos/egresos/ingresos, historial y preferencias.</li>
          <li>Transaccionales: estado de compra Premium (ID de operacion, fecha e importe).</li>
          <li>Soporte: mensajes y adjuntos que nos envies.</li>
          <li>Tecnicos: IP, dispositivo, navegador, cookies y analytics ver {" "}
              <Link href="/cookies" className={linkClass}>
            Politica de Cookies
          </Link>
          .
        </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Finalidades</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/80">
          <li>Prestar el servicio (crear tu cuenta, guardar y mostrar tus datos financieros).</li>
          <li>Mejorar la app y soporte (metricas de uso, solucion de incidencias).</li>
          <li>Gestionar pagos Premium (conciliar cobros y atender reembolsos).</li>
          <li>Comunicaciones: emails transaccionales, avisos relevantes del servicio.</li>
          <li>Cumplimientos legales y de seguridad (prevencion de fraudes o incidentes).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Base legal</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/80">
          <li>Ejecucion de la relacion contractual (tu cuenta y uso de la app).</li>
          <li>Consentimiento (cookies o analytics no esenciales y comunicaciones opcionales).</li>
          <li>Interes legitimo (mejoras, metricas agregadas, seguridad) ponderado con tus derechos.</li>
        </ul>
        <p className="mt-3 text-sm text-white/80">La Ley 18.331 habilita tratar datos con consentimiento o cuando sea necesario para finalidades legitimas y compatibles.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Destinatarios y encargados</h2>
        <p className="mt-3 text-sm text-white/80">
          Utilizamos proveedores como Supabase (base de datos y autenticacion), Vercel (hosting), Mercado Pago (cobros) y
          herramientas de email transaccional o analytics. Actuan como encargados de tratamiento siguiendo nuestras instrucciones y
          medidas de seguridad acordes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Transferencias internacionales</h2>
        <p className="mt-3 text-sm text-white/80">
          Nuestros proveedores pueden alojar o procesar datos fuera de Uruguay. Uruguay cuenta con decision de adecuacion de la Union Europea (2012), lo que facilita transferencias desde la UE al considerarse un nivel de proteccion adecuado. Cuando transferimos a otros paises aplicamos garantias contractuales apropiadas.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Plazos de conservacion</h2>
        <p className="mt-3 text-sm text-white/80">Conservamos tus datos mientras tengas cuenta o sean necesarios para el servicio y luego por plazos razonables para:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/80">
          <li>Atender reclamos o garantias.</li>
          <li>Cumplir obligaciones legales y contables.</li>
          <li>Fines de seguridad y copias de respaldo.</li>
        </ul>
        <p className="mt-3 text-sm text-white/80">Despues anonimizamos o eliminamos la informacion de forma segura.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Seguridad</h2>
        <p className="mt-3 text-sm text-white/80">
          Aplicamos medidas tecnicas y organizativas proporcionales al riesgo: cifrado en transito, controles de acceso, registro de
          eventos, copias de seguridad y principios de privacidad desde el diseno, en linea con la normativa uruguaya (referencia: IMPO).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Derechos de las personas</h2>
        <p className="mt-3 text-sm text-white/80">
          Podes ejercer tus derechos de acceso, rectificacion, actualizacion, inclusion y supresion previstos por la Ley 18.331, asi
          como la accion de Habeas Data. Escribi a <Link href="mailto:soporte@miadmi.com" className={linkClass}>soporte@miadmi.com</Link> indicando nombre completo, email de cuenta y el derecho que queres ejercer.
        </p>
        <p className="mt-3 text-sm text-white/80">Si no quedas conforme, podes reclamar ante la URCDP (Unidad Reguladora y de Control de Datos Personales), autoridad de control en Uruguay.</p>
        <p className="mt-3 text-sm text-white/70">Contacto URCDP: consultar sitio y canales oficiales del Gobierno del Uruguay.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Menores</h2>
        <p className="mt-3 text-sm text-white/80">Mi Admi esta destinada a personas mayores de 18 años. Si detectamos cuentas de menores sin consentimiento valido, las eliminaremos.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Cookies y analitica</h2>
        <p className="mt-3 text-sm text-white/80">
          Usamos cookies tecnicas necesarias y, con tu consentimiento, cookies o servicios de analitica para entender el uso de la app y mejorarla. Podes configurar o revocar tu consentimiento en cualquier momento desde el banner o ajustes de privacidad. Mas detalles en la{" "}
          <Link href="/cookies" className={linkClass}>
            Politica de Cookies
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Suscripciones y reembolsos</h2>
        <p className="mt-3 text-sm text-white/80">
          Cuando te suscribes a Premium procesamos los datos de la operacion para activar el acceso, emitir comprobantes y gestionar reembolsos. Si hay devoluciones tu plan puede volver a Free y tus datos siguen disponibles.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Cambios en esta politica</h2>
        <p className="mt-3 text-sm text-white/80">
          Publicaremos cualquier cambio en esta pagina y actualizaremos la fecha de vigencia. Si los cambios son relevantes, lo
          notificaremos por email o dentro de la app.
        </p>
      </section>
    </div>
  );
}
