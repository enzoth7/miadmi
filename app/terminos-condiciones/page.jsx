import { createSeoMetadata } from "../../lib/seo";

export const metadata = createSeoMetadata({
  title: "Términos y condiciones",
  description:
    "Condiciones simples de uso de las calculadoras y herramientas gratuitas de Mi Admi para Uruguay.",
  path: "/terminos-condiciones",
});

const sections = [
  {
    title: "Qué ofrece Mi Admi",
    copy: "Mi Admi ofrece herramientas gratuitas para organizar información y hacer cálculos orientativos sobre temas cotidianos en Uruguay. No necesitás una cuenta para usarlas.",
  },
  {
    title: "Resultados orientativos",
    copy: "Los resultados son estimaciones y pueden contener errores o quedar desactualizados si cambian las reglas oficiales. No reemplazan el asesoramiento de un profesional ni la información de los organismos correspondientes.",
  },
  {
    title: "Guardado opcional",
    copy: "Podés acceder con Google para respaldar y sincronizar tus estimaciones mediante Supabase. Si no accedés, los datos quedan en tu navegador. La sincronización depende de la disponibilidad de internet y de esos servicios.",
  },
  {
    title: "Uso y disponibilidad",
    copy: "Sos responsable de los datos que ingresás y de las decisiones que tomás. Mi Admi puede corregir cálculos, modificar funciones o interrumpir temporalmente el servicio cuando sea necesario.",
  },
];

export default function TerminosCondicionesPage() {
  return (
    <div className="py-10 sm:py-14">
      <article className="mx-auto w-full max-w-[1440px] rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-sm sm:p-10">
        <div className="max-w-4xl">
        <header>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Términos y condiciones
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
            Las reglas básicas para usar Mi Admi.
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
