import Link from "next/link";

export const metadata = {
  title: "Aviso de cookies - Mi Admi",
};

const linkClass =
  "font-semibold text-emerald-200 underline decoration-dotted underline-offset-4 hover:text-emerald-100";

export default function CookiesPage() {
  return (
    <div className="space-y-6 py-16 text-white">
      <section>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Aviso de Cookies
        </h1>
        <div className="mt-4 space-y-1 text-sm text-white/80">
          <p>Vigente desde: 01/12/2025</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Uso de cookies</h2>
        <p className="mt-3 text-sm text-white/80">
          Mi Admi utiliza cookies y tecnologías similares para que el sitio y la
          aplicación funcionen correctamente, mantener la sesión iniciada,
          mejorar el rendimiento y entender de forma agregada cómo se usa el
          producto.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Qué tipos de cookies usamos</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/80">
          <li>
            <span className="font-semibold text-white">Cookies necesarias:</span>{" "}
            permiten la autenticación, la seguridad y el funcionamiento básico
            de la app.
          </li>
          <li>
            <span className="font-semibold text-white">Cookies de analítica:</span>{" "}
            nos ayudan a medir el uso y rendimiento de Mi Admi de forma general
            y agregada.
          </li>
        </ul>
        <p className="mt-4 text-sm text-white/80">
          Los datos de tus finanzas no se utilizan para publicidad ni se
          comparten con terceros con fines comerciales.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Servicios de terceros</h2>
        <p className="mt-3 text-sm text-white/80">
          Algunos servicios de terceros pueden utilizar sus propias cookies
          según sus políticas, por ejemplo:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/80">
          <li>Servicios de hosting y medición técnica.</li>
          <li>Herramientas de analítica.</li>
          <li>
            Mercado Pago, durante el proceso de pago o gestión de suscripciones.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Gestión de cookies</h2>
        <p className="mt-3 text-sm text-white/80">
          Podés gestionar, bloquear o eliminar cookies desde la configuración de
          tu navegador. Tené en cuenta que desactivar algunas cookies puede
          afectar el correcto funcionamiento de la app.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Privacidad</h2>
        <p className="mt-3 text-sm text-white/80">
          Para más información sobre cómo tratamos los datos personales, podés
          consultar nuestra{" "}
          <Link href="/politica-de-privacidad" className={linkClass}>
            Política de Privacidad
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Cambios a este aviso</h2>
        <p className="mt-3 text-sm text-white/80">
          Podemos actualizar este aviso ocasionalmente. La versión vigente
          estará siempre disponible en esta página.
        </p>
      </section>
    </div>
  );
}
