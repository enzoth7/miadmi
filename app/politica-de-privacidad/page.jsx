import { createSeoMetadata } from "../../lib/seo";

export const metadata = createSeoMetadata({
  title: "Política de privacidad",
  description:
    "Cómo Mi Admi guarda y protege los datos que usás en sus herramientas gratuitas para Uruguay.",
  path: "/politica-de-privacidad",
});

const sections = [
  {
    title: "Uso sin cuenta",
    copy: "Podés usar Mi Admi sin registrarte. En ese caso, tus estimaciones se guardan únicamente en el almacenamiento local de este navegador y podés borrarlas desde su configuración.",
  },
  {
    title: "Acceso opcional con Google",
    copy: "Si elegís acceder, Google comparte tu nombre, email y foto de perfil. Usamos Supabase para mantener la sesión y respaldar tus estimaciones, de modo que puedas recuperarlas en otros dispositivos.",
  },
  {
    title: "Tu control",
    copy: "Al cerrar sesión, los datos privados dejan de mostrarse y vuelve el espacio local de visitante. Podés borrar los datos locales desde el navegador y solicitar la eliminación de tu cuenta y su respaldo escribiendo a enzothome1@gmail.com.",
  },
  {
    title: "Datos técnicos",
    copy: "El alojamiento y la analítica pueden procesar datos básicos del dispositivo, el navegador y las páginas visitadas para mantener y mejorar el servicio.",
  },
];

export default function PoliticaPrivacidadPage() {
  return (
    <div className="py-10 sm:py-14">
      <article className="mx-auto w-full max-w-[1440px] rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-sm sm:p-10">
        <div className="max-w-4xl">
        <header>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Política de privacidad
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
            Cómo se guardan tus estimaciones, con o sin una cuenta.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="border-t border-slate-200 pt-6"
            >
              <h2 className="text-lg font-bold text-slate-950">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {section.copy}
              </p>
            </section>
          ))}
        </div>
        </div>
      </article>
    </div>
  );
}
