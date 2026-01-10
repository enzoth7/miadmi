"use client";

import Link from "next/link";

const VIDEOS = [
  {
    id: "aguinaldo",
    eyebrow: "Video 1",
    title: "Calcular el aguinaldo",
    description:
      "En 2 minutos: cargás tu sueldo, elegís el período y Mi Admi te calcula el aguinaldo y te lo deja listo para tu mes.",
    bullets: ["Paso a paso", "Ejemplo real en pantalla", "Errores comunes"],
  },
  {
    id: "estimaciones",
    eyebrow: "Video 2",
    title: "Cómo usar las estimaciones",
    description:
      "Proyectá el mes con tus gastos fijos, variables y compras planificadas para saber si llegás cómodo, justo o en rojo.",
    bullets: ["Estimación general", "Estimación específica", "Qué significa cada resultado"],
  },
  {
    id: "gastos",
    eyebrow: "Video 3",
    title: "Ver y entender tus gastos",
    description:
      "Aprendé a leer el resumen del mes, ver en qué se te va la plata y ajustar sin adivinar.",
    bullets: ["Resumen del mes", "Categorías", "Filtros rápidos"],
  },
  {
    id: "credito",
    eyebrow: "Video 4",
    title: "Cargar préstamos y tarjetas",
    description:
      "Registrá cuotas, tarjetas y suscripciones para que el descuento mensual quede claro y no te sorprenda.",
    bullets: ["Préstamos", "Tarjetas / cuotas", "Suscripciones"],
  },
];

function VideoSection({ id, eyebrow, title, description, bullets }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30 md:p-8"
    >
      <div className="mx-auto max-w-4xl space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
          {eyebrow}
        </p>

        <h2 className="text-2xl font-semibold md:text-3xl">{title}</h2>

        <p className="mx-auto max-w-3xl text-base text-white/80 md:text-lg">
          {description}
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm text-white/80">
          {bullets.map((b) => (
            <span
              key={b}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Video placeholder: pantalla arriba + vos abajo */}
      <div className="mx-auto mt-8 max-w-5xl">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
          {/* Pantalla (16:9) */}
          <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 pt-[56.25%]">
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
              Video (pantalla) — pegá acá tu embed / player
            </div>
          </div>

         <div className="mt-4">
  <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
    <p className="text-sm font-semibold text-white">Guión / puntos clave</p>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
      <li>Qué vas a hacer en el video</li>
      <li>Qué botón tocar / en qué pantalla estás</li
      >
      <li>Qué resultado tiene que ver la persona</li>
    </ul>
    <p className="mt-3 text-xs text-white/50">
      Tip: cuando tengas el video final, reemplazá estos placeholders por tu player
      (YouTube/Vimeo o self-host).
    </p>
  </div>
</div>
        </div>
      </div>
    </section>
  );
}

export default function ComoFuncionaPage() {
  return (
    <div className="px-4 py-12 text-white lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        {/* Header */}
        <section className="mx-auto max-w-4xl space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
            Cómo funciona
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Mirá los tutoriales y armá tu mes en minutos
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-white/80">
            Videos cortos, directos y con ejemplos en pantalla para que entiendas cómo usar Mi Admi
            sin vueltas.
          </p>

          {/* Índice rápido */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
            {VIDEOS.map((v) => (
              <a
                key={v.id}
                href={`#${v.id}`}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {v.title}
              </a>
            ))}
          </div>
        </section>

        {/* Secciones de video */}
        <div className="flex flex-col gap-8">
          {VIDEOS.map((v) => (
            <VideoSection key={v.id} {...v} />
          ))}
        </div>

        {/* CTA */}
        <section className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-8 text-center shadow-lg shadow-emerald-500/20">
          <h2 className="text-3xl font-semibold">¿Listo para probarlo?</h2>
          <p className="mt-3 text-white/80">
            Creá tu cuenta, cargá lo básico y mirá los videos cuando lo necesites.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className="rounded-full bg-white px-8 py-3 text-base font-semibold text-gray-900 shadow-lg shadow-white/40 transition hover:bg-white/90"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/login?mode=login"
              className="text-base font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              Iniciar sesión
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
