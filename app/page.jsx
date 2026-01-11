"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import HeroCarousel from "@/components/HeroCarousel";
import Image from "next/image";


const STEPS = [
  {
    title: "Cargas tus primeros datos",
    description:
      "Respondé las primeras preguntas.",
  },
  {
    title: "Mirá la distribución de tu plata",
    description:
      "Mi Admi te muestra si llegás con holgura, justo o en rojo, y qué ajustes podrias hacer.",
  },
  {
    title: "Tomá las decisiones mas facilmente",
    description:
      "Con un panorama completo, fácil y sencillo, decidí que caminos tomar.",
  },
];

const QUICK_TOOLS = [
  {
    title: "Calculá tu sueldo, aguinaldo y más",
    description:
      "Herramientas puntuales para sacarte dudas en segundos. Actualizado a las últimas leyes y deducciones.",
    href: "/herramientas",
    cta: "Ver herramientas",
  },
  {
    title: "Mirá tu fin de mes en 30 segundos",
    description:
      "Respondé cinco preguntas y obtené una estimación orientativa de cómo terminás el mes.",
    href: "/estima-tu-mes",
    cta: "Estimar mi mes",
  },
] 

const FEATURE_CARDS = [
  {
    title: "Estimación mes a mes",
    description:
      "Proyectá el saldo del próximo mes sin fórmulas raras ni planillas eternas.",
  },
  {
    title: "Control mensual simple",
    description:
      "Seguimiento diario pensado para personas que prefieren tocar botones y no celdas.",
  },
  {
    title: "Herramientas",
    description:
      "Calculá tu aguinaldo, tu salario y una posible liquidación o seguro de desempleo del BPS. Todo en 20 segundos.",
  },
  {
    title: "Sin marearte con Excel",
    description:
      "Todo está guiado paso a paso. Si sabés usar WhatsApp, podés usar Mi Admi.",
  },
];

const AUDIENCE_ITEMS = [
  "Personas que no saben cómo llegar a fin de mes.",
  "Quienes no saben en qué se les va la plata.",
  "Los que quieran tener todo en un solo lugar y completo.",
  "Quienes nunca pudieron mantener un Excel más de una semana.",
];

const PAYMENT_POINTS = [
  "Controlá ingresos, gastos y estimaciones desde el primer día con las funciones simples.",
  "Empezá gratis con lo esencial para tu mes.",
  "Sumá las herramientas premium cuando requieras funciones más avanzadas.",
];

const TESTIMONIALS = [
  {
    quote:
      "Por primera vez siento que tengo claro cuánto voy a tener y en qué puedo gastar sin culpa.",
    name: "Giuliano",
    role: "Freelancer independiente",
  },
  {
    quote:
      "Mi Admi me ordenó pasado, presente y futuro en un solo lugar. Es mucho más simple que Excel.",
    name: "Cristian",
    role: "Co-fundador de JMF",
  },
  {
    quote:
      "Puedo calcular rápido mi sueldo y finanzas en segundos, me ahorra mucho tiempo.",
    name: "Joaquín",
    role: "Analista en finanzas",
  },
];

export default function LandingPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);



  return (





<div className="px-4 py-10 text-white lg:px-8">
  <section className="mx-auto mb-10 max-w-3xl space-y-6 text-center">
  <div className="flex flex-col items-center space-y-2">
    <h2 className="text-3xl font-semibold sm:text-4xl">
      App de finanzas personales 
    </h2>

    <p className="text-base text-white/80 sm:text-lg">
      Mi Admi te organiza la plata y te da control sobre tu futuro.
    </p>
  </div>
</section>


  <div className="-mx-4 mb-16 lg:-mx-8">
        <HeroCarousel />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <section className="mt-6 mb-16">
          <div className="relative mx-auto flex flex-col items-center -mb-4">
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
              "Hecho en Uruguay, pensado para uruguayos."
            </p>

            {/* Reflejo */}
            <p
              className="
        mt-1
        text-3xl sm:text-5xl 
        font-semibold 
        text-white/20 
        blur-sm 
        scale-y-[-1]
      "
              aria-hidden="true"
            >
              "Hecho en Uruguay, pensado para uruguayos."
            </p>
          </div>
        </section>

     




        <section className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
              Cómo funciona
            </p>
            <h2 className="text-3xl font-semibold">3 pasos y listo</h2>
            <p className="text-base text-white/80">
              Sin planillas complicadas: llenás los datos básicos y Mi Admi hace
              el resto.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-semibold text-emerald-200">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-base text-white/70">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
          Sin registrarte
        </p>
        <h2 className="text-3xl font-semibold">Probá ahora</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {QUICK_TOOLS.map((item) => (
          <article
            key={item.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/10"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
              {item.label}
            </p>

            <h3 className="mt-2 text-2xl font-semibold">{item.title}</h3>
            <p className="mt-2 text-base text-white/70">{item.description}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={item.href}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                {item.cta}
              </a>
            </div>
          </article>
        ))}
      </div>

      <p className="text-sm text-white/60">
        * Estas herramientas son estimaciones orientativas.
      </p>
    </section>


        <section className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
              Beneficios
            </p>
            <h2 className="text-3xl font-semibold">Pensado para la vida real</h2>
            <p className="text-base text-white/80">
              Herramientas para quienes quieren claridad rápida sobre su plata.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURE_CARDS.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10"
              >
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-base text-white/70">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

<section className="grid gap-6 rounded-3xl border border-emerald-400/25 bg-slate-900/60 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.6)] md:grid-cols-2">
  {/* Texto a la izquierda */}
  <div className="space-y-4">
    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
      Hecho para Uruguay
    </p>
    <h2 className="text-3xl font-semibold">
      Todo en pesos uruguayos, con lógica local
    </h2>
    <p className="text-white/80">
      Sueldos con aguinaldo, tarjetas en cuotas, aportes y feriados:
      Mi Admi habla tu idioma y entiende tu calendario.
    </p>
    <ul className="space-y-2 text-base text-white/80">
      <li>• Moneda por defecto en UYU.</li>
      <li>• Recordatorios cuando se acerca el aguinaldo.</li>
      <li>• Categorías ya pensadas para la realidad local.</li>
      
    </ul>
  </div>

  {/* Imagen a la derecha, usando 1536x1024 sin deformar */}
  <div className="flex items-center justify-center">
    <Image
      src="/Image1.png"
      alt="Gastos del mes en Uruguay - Mi Admi"
      width={1536}
      height={1024}
      className="w-full max-w-[480px] h-auto rounded-3xl object-cover"
    />
  </div>
</section>



        <section className="space-y-4 rounded-3xl border border-emerald-400/25 bg-slate-900/60 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
              ¿Para quién es?
            </p>
            <h2 className="text-3xl font-semibold">
  Para quienes quieren dejar de adivinar
</h2>
          </div>
          <ul className="space-y-3 text-white/90">
  {AUDIENCE_ITEMS.map((item) => (
    <li key={item} className="flex gap-3 text-base leading-snug">
      <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-400" />
      <span>{item}</span>
    </li>
  ))}
</ul>
        </section>

        <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent p-8">
          <div className="w-full space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
              ¿CUÁNTO CUESTA?
            </p>
            <h2 className="text-3xl font-semibold">
              Empezá gratis y sin compromiso
            </h2>
            <p className="text-base text-white/85">
              Probá Mi Admi y usá las herramientas básicas sin pagar nada.
Si te sirve y querés ir más a fondo, vas a poder acceder a funciones avanzadas
de forma clara, transparente y sin sorpresas.
            </p>
            <ul className="space-y-2 text-base text-white/80">
              {PAYMENT_POINTS.map((point) => (
                <li key={point}>• {point}</li>
              ))}
            </ul>
          </div>
          <div className="text-center max-w-md mx-auto">
  <div className="mt-3 flex items-center justify-center">
    <span className="text-2xl text-amber-300" aria-hidden="true">
      &#9733;&#9733;&#9733;&#9733;&#9733;
    </span>
  </div>
  <p className="mt-4 text-sm text-white/90">
    {TESTIMONIALS[activeTestimonial].quote}
  </p>
  <p className="mt-3 text-xs font-medium text-white/80">
    {TESTIMONIALS[activeTestimonial].name}
  </p>
  <p className="text-[11px] text-white/60">
    {TESTIMONIALS[activeTestimonial].role}
  </p>
  <div className="mt-4 flex justify-center gap-2">
    {TESTIMONIALS.map((_, index) => (
      <button
        key={index}
        type="button"
        onClick={() => setActiveTestimonial(index)}
        className={`h-2.5 w-2.5 rounded-full transition ${
          index === activeTestimonial
            ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            : "bg-white/25 hover:bg-white/60"
        }`}
        aria-label={`Ver testimonio ${index + 1}`}
      />
    ))}
  </div>
</div>
        </section>

        <section className="text-center max-w-md mx-auto">
          <h2 className="text-3xl font-semibold">Empezá hoy a ordenar tu plata</h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className="rounded-full bg-white px-8 py-3 text-base font-semibold text-gray-900 shadow-lg shadow-white/40 transition hover:bg-white/90"
            >
              Probar gratis
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

