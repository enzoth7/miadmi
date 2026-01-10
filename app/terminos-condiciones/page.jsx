import Link from "next/link";

export const metadata = {
  title: "Terminos y condiciones - Mi Admi",
};

const linkClass =
  "font-semibold text-emerald-200 underline decoration-dotted underline-offset-4 hover:text-emerald-100";

export default function TerminosCondicionesPage() {
  return (
    <div className="space-y-6 text-white py-16">
      <section>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Términos y Condiciones de uso</h1>
        <div className="mt-4 space-y-1 text-sm text-white/80">
          <p>Vigente desde: 01/12/2025</p>
          <p>Responsable: MI ADMI</p>
          <p>
            Contacto: <Link href="mailto:soporte@miadmi.com" className={linkClass}>soporte@miadmi.com</Link>
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Aceptación</h2>
        <p className="mt-3 text-sm text-white/80">
          Al crear una cuenta o usar Mi Admi aceptas estos Terminos y Condiciones y nuestra Politica de Privacidad. Si no estas de acuerdo, no utilices la App.
        </p>
      </section>

<section>
  <h2 className="text-xl font-semibold">Servicio</h2>
  <p className="mt-3 text-sm text-white/80">
    Mi Admi es una aplicación de finanzas personales para registrar movimientos,
    visualizar tu historial, proyectar gastos y exportar información.
    Ofrecemos un plan Free y un plan Premium mediante suscripción mensual,
    que se puede cancelar en cualquier momento y brinda acceso a funciones
    avanzadas mientras la suscripción esté activa.
  </p>
</section>


      <section>
        <h2 className="text-xl font-semibold">Cuenta y acceso</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/80">
          <li>Debes ser mayor de 18 años.</li>
          <li>Resguarda tus credenciales; sos responsable de la actividad de tu cuenta.</li>
          <li>
            Podes solicitar cambio de email o cierre de cuenta escribiendo a{" "}
            <Link href="mailto:soporte@miadmi.com" className={linkClass}>
              soporte@miadmi.com
            </Link>
            .
          </li>
        </ul>
      </section>

  <section>
  <h2 className="text-xl font-semibold">Planes y pagos</h2>
  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/80">
    <li>Free: acceso a las funciones básicas con límites (ver comparativa en el sitio).</li>
    <li>
      Premium: suscripción mensual gestionada a través de Mercado Pago. El acceso se
      activa automáticamente al confirmarse el pago y podés cancelarla cuando quieras
      desde tu cuenta.
    </li>
    <li>
      Los precios se expresan en UYU salvo indicación en contrario y pueden actualizarse
      para futuros ciclos de facturación.
    </li>
    <li>
      Mercado Pago envía el comprobante de pago al email asociado a tu cuenta.
    </li>
  </ul>
</section>



      <section>
        <h2 className="text-xl font-semibold">Uso correcto y prohibiciones</h2>
        <p className="mt-3 text-sm text-white/80">Te comprometes a:</p>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-white/80">
          <li>Usar la App conforme a la ley y estos Terminos.</li>
          <li>No intentar acceder sin autorizacion a sistemas o datos de otros usuarios.</li>
          <li>No exceder ni eludir limites del plan (ej.: automatizaciones para exportar masivamente en Free).</li>
          <li>No introducir contenido ilegal, malicioso, difamatorio o que infrinja derechos de terceros.</li>
        </ul>
        <p className="mt-3 text-sm text-white/80">Podemos suspender o cancelar el acceso ante incumplimientos o riesgos de seguridad.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Contenido del usuario</h2>
        <p className="mt-3 text-sm text-white/80">
          Los datos que cargas son tuyos. Brindamos herramientas para exportarlos segun tu plan. Nos autorizas a procesarlos para prestar el servicio, conforme a la Politica de Privacidad.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Propiedad intelectual</h2>
        <p className="mt-3 text-sm text-white/80">
          Mi Admi, su marca, diseño, software y contenidos originales son de MI ADMI o sus licenciantes. Te otorgamos una licencia limitada, no exclusiva e intransferible para usar la App. No podes copiar, modificar, descompilar o revender la App ni sus componentes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Terceros y proveedores</h2>
        <p className="mt-3 text-sm text-white/80">
          Usamos servicios de terceros como Supabase, Vercel, Mercado Pago y herramientas de email/analytics. Su uso puede regirse por sus propios terminos. No somos responsables por interrupciones atribuibles a terceros, pero haremos esfuerzos razonables para mitigarlas.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Disponibilidad y cambios del servicio</h2>
        <p className="mt-3 text-sm text-white/80">
          La App se brinda "tal cual" y "segun disponibilidad". Podemos modificar o mejorar funcionalidades en cualquier momento, avisando cambios relevantes. Mantenemos copias de seguridad y practicas de continuidad razonables.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Seguridad</h2>
        <p className="mt-3 text-sm text-white/80">
          Aplicamos medidas tecnicas y organizativas acordes al riesgo (cifrado en transito, control de accesos, registros). Si detectas una vulnerabilidad, notificanos en{" "}
          <Link href="mailto:soporte@miadmi.com" className={linkClass}>
            soporte@miadmi.com
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Privacidad y datos personales</h2>
        <p className="mt-3 text-sm text-white/80">
          Tratamos datos conforme a la Ley 18.331 y normativa aplicable. Consulta la Politica de Privacidad para conocer finalidades, derechos y como ejercerlos. Podes solicitar acceso, rectificacion o supresion de tus datos.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Limitación de responsabilidad</h2>
        <p className="mt-3 text-sm text-white/80">
          En la maxima medida permitida por la ley, no seremos responsables por lucro cesante, perdida de datos, daños indirectos o consecuencias del uso o imposibilidad de uso de la App. La responsabilidad total frente a vos se limita al monto efectivamente pagado por Pro (si aplica) en los ultimos 12 meses.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">No asesoria financiera</h2>
        <p className="mt-3 text-sm text-white/80">
          Mi Admi no brinda asesoria financiera ni contable. Las decisiones que tomes basadas en la App son bajo tu propio criterio. Recomendamos consultar profesionales cuando corresponda.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Comunicaciones</h2>
        <p className="mt-3 text-sm text-white/80">
          Podemos enviarte emails transaccionales (confirmaciones, avisos de servicio) y, con tu consentimiento, comunicaciones de producto o marketing. Siempre podras darte de baja de estas ultimas.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Terminación</h2>
        <p className="mt-3 text-sm text-white/80">
          Podes solicitar la eliminacion de la cuenta en cualquier momento. Podemos suspender o cancelar el acceso si incumplis estos Terminos, por requerimiento legal o por riesgo para la seguridad/operacion del servicio.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Cambios a los Términos</h2>
        <p className="mt-3 text-sm text-white/80">
          Podemos actualizar estos Terminos; publicaremos la nueva version con fecha de vigencia. Si los cambios son sustanciales, te notificaremos por email o dentro de la App. Continuar usando la App implica aceptar los Terminos actualizados.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Ley aplicable y jurisdicción</h2>
        <p className="mt-3 text-sm text-white/80">
          Estos Terminos se rigen por las leyes de la Republica Oriental del Uruguay. Toda controversia se sometera a los tribunales competentes de Montevideo, salvo fuero imperativo distinto.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Contacto</h2>
        <p className="mt-3 text-sm text-white/80">
          Para dudas, reclamos o ejercicio de derechos: <Link href="mailto:soporte@miadmi.com" className={linkClass}>soporte@miadmi.com</Link>.
        </p>
      </section>
    </div>
  );
}
