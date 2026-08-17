export const metadata = {
  title: "Sobre nosotros | Mi Admi",
  description: "Mi Admi es una app uruguaya para organizar tus finanzas personales de forma clara y para todo público.",
};


export default function SobreNosotrosPage() {

  // No social links needed

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
