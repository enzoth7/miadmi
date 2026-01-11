export const metadata = {
  title: "Sobre nosotros | Mi Admi",
  description: "Mi Admi es una app uruguaya para organizar tus finanzas personales de forma clara y para todo público.",
};


export default function SobreNosotrosPage() {

  const IG_URL = "https://instagram.com/miadmiuy";
const LINKEDIN_URL = "https://www.linkedin.com/company/miadmi"; // o tu perfil



function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4Zm-4.5 3.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm6.1-2.35a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z" />
    </svg>
  );
}

function LinkedInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5ZM.5 23.5h4V7.98h-4V23.5ZM8.5 7.98h3.83v2.12h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.78 2.65 4.78 6.09v9.37h-4v-8.3c0-1.98-.04-4.52-2.75-4.52-2.75 0-3.17 2.15-3.17 4.37v8.45h-4V7.98Z" />
    </svg>
  );
}





  const BENEFICIOS = [
    {
      title: "Hecho para Uruguay 🇺🇾",
      description:
        "Pensado para sueldos, aguinaldo, aportes y feriados con la lógica local.",
    },
    {
      title: "Sin letra chica 🧾",
      description:
        "En caso de que desees usar las funciones premium, se te comunica claramente el beneficio de la suscripción.",
    },
    {
      title: "Tu información, protegida 🔒",
      description:
        "Los datos se manejan con prácticas modernas de seguridad.",
    },
  ];

  return (
    <div className="px-4 py-16 text-white lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <section className="rounded-3xl border border-emerald-400/25 bg-slate-900/60 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="space-y-5 text-left">
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                  Sobre nosotros
                </h1>
              </div>
              <div className="space-y-4 text-base leading-relaxed text-white/90 md:max-w-2xl">
                <p>
                  Mi Admi comenzó como una idea para facilitarle los números y finanzas a las personas, sobretodo al uruguayo que 
                  día a día dibuja números para llegar a fin de mes.
                  El objetivo es simple, un lugar donde podes controlar tus gastos, estimar ingresos y hacer planes para el futuro
                  con una base sencilla y sin pasar horas de papeles o usando Excel. 

                </p>
                <p>
                  El equipo decidió convertir su propio sistema de finanzas en una app simple y
                  accesible para que cualquier persona pueda manejar su dinero
                  con más tranquilidad y menor estrés.
                </p>

<div className="mt-6 flex w-full items-center justify-end gap-3 md:-mr-2 lg:-mr-4">
  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
    Seguinos
  </p>

  <div className="flex items-center gap-2">
    <a
      href={IG_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Instagram de Mi Admi"
      className="inline-flex items-center justify-center rounded-md border p-2 text-white/70 transition hover:text-white hover:bg-white/10"
    >
      <InstagramIcon className="h-5 w-5" />
    </a>

    <a
      href={LINKEDIN_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="LinkedIn de Mi Admi"
      className="inline-flex items-center justify-center rounded-md border p-2 text-white/70 transition hover:text-white hover:bg-white/10"
    >
      <LinkedInIcon className="h-5 w-5" />
    </a>
  </div>
</div>


              </div>
            </div>
       <div className="flex justify-center md:self-start">
  <div className="h-45 w-45">
    <img
      src="/photos/Founder.png"
      alt="Logo de Mi Admi"
      className="h-full w-full object-contain"
    />
  </div>
</div>
          </div>
        </section>

<section className="mt-4 mb-8">
  <div className="relative mx-auto flex flex-col items-center">
    {/* Texto principal */}
    <p
      className="
        text-center 
        text-3xl sm:text-5xl 
        font-semibold 
        text-white 
        drop-shadow-[0_0_22px_rgba(0,0,0,0.9)]
        tracking-tight
      "
    >
      "Vos elegís tus sueños, Mi Admi te los calcula."
    </p>

    {/* Reflejo */}
    <p
      className="
        -mt-1
        text-center
        text-3xl sm:text-5xl 
        font-semibold 
        text-white/20 
        blur-sm 
        scale-y-[-1]
        tracking-tight
      "
      aria-hidden="true"
    >
      "Vos elegís tus sueños, Mi Admi te los calcula."
    </p>
  </div>
</section>


        <section>
          <div className="grid gap-8 md:grid-cols-3">
            {BENEFICIOS.map((item) => (
              <div key={item.title} className="space-y-2">
                <p className="text-base font-semibold uppercase tracking-wide text-white">
                  {item.title}
                </p>
                <p className="text-base text-white/80 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
