"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Calculator,
  Gift,
  BriefcaseBusiness,
  ShieldCheck,
  Sparkles,
  CheckCircle2
} from "lucide-react";

const FREE_TOOLS = [
  {
    id: "sueldo",
    title: "Calculadora de Sueldo Líquido",
    description: "Conocé tus descuentos exactos de BPS, FONASA, FRL e IRPF según tu situación familiar.",
    href: "/herramientas/calcular-descuentos-salarios",
    badge: "Más Utilizada",
    icon: Calculator,
  },
  {
    id: "aguinaldo",
    title: "Cálculo de Aguinaldo",
    description: "Calculá tu medio aguinaldo de junio o diciembre con los aportes de ley descontados.",
    href: "/herramientas/aguinaldo",
    badge: "Junio / Diciembre",
    icon: Gift,
  },
  {
    id: "despido",
    title: "Despido y Renuncia",
    description: "Estimá tu liquidación final por despido común, renuncia voluntaria o despido abusivo.",
    href: "/herramientas/despido-renuncia",
    badge: "Laboral",
    icon: BriefcaseBusiness,
  },
  {
    id: "desempleo",
    title: "Seguro de Desempleo",
    description: "Proyectá cuánto te corresponde cobrar mes a mes a través del BPS si te quedás sin trabajo.",
    href: "/herramientas/seguro-desempleo",
    badge: "Subsidio BPS",
    icon: ShieldCheck,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen font-sans selection:bg-[#FACC15] selection:text-[#0b1e3a] w-full">
      
      {/* =========================================================================
          FRANJA 1: HERO (Azul Oscuro #0b1e3a con Imagen 3D y 2 Botones Limpios)
          ========================================================================= */}
      <section className="w-full bg-[#0b1e3a] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            
            {/* Columna Izquierda */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="lg:col-span-7 flex flex-col items-start text-left"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
                Tus finanzas y sueldo, calculados al instante.
              </h1>

              <p className="text-lg sm:text-xl text-gray-300 font-normal leading-relaxed mb-8 max-w-2xl">
                Calculá tu sueldo líquido, aguinaldos y beneficios laborales en Uruguay. Sin complicaciones ni planillas confusas.
              </p>

              {/* LOS DOS BOTONES PRINCIPALES (SIN FLECHAS, SIN SPANS) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-8">
                <Link
                  href="/herramientas/calcular-descuentos-salarios"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FACC15] px-8 py-4 text-base font-bold text-[#0b1e3a] transition-all hover:bg-yellow-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-yellow-500/20"
                >
                  <Calculator className="w-5 h-5" />
                  Calcular mi sueldo
                </Link>

                <Link
                  href="/estimacion"
                  className="inline-flex items-center justify-center rounded-full bg-[#FFFFFF] px-8 py-4 text-base font-bold text-[#000000] shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1e3a]"
                >
                  Estimar mi mes
                </Link>
              </div>

              {/* Puntos de Confianza (Sin tags span) */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-gray-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                  Sin registro obligatorio
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                  Leyes BPS & IRPF al día
                </div>
              </div>
            </motion.div>

            {/* Columna Derecha: Nueva Imagen 3D Ilustrativa de Finanzas con Animación Flotante */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
              className="lg:col-span-5 w-full flex justify-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white"
              >
                <Image
                  src="/portada.png"
                  alt="Mi Admi Panel Financiero Uruguay"
                  width={600}
                  height={450}
                  className="w-full h-auto object-cover bg-white"
                  priority
                />
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          FRANJA 2: HERRAMIENTAS GRATUITAS (Blanco Puro #FFFFFF con Hover Dinámico)
          ========================================================================= */}
      <section className="w-full bg-[#FFFFFF] text-[#0b1e3a] py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-gray-200">
        <div className="mx-auto max-w-[1440px]">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0b1e3a] mb-4">
              Herramientas gratuitas para usar ya mismo.
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Elegí la calculadora que necesitás. Todos los cálculos son transparentes, directos y basados en la legislación uruguaya.
            </p>
          </div>

          {/* Cuatro paneles alineados en escritorio, como una única tira de herramientas */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-5 lg:grid-cols-4 lg:gap-3">
            {FREE_TOOLS.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  whileHover={{ y: -8, scale: 1.025 }}
                  className="group relative z-0 flex h-full flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:z-10 hover:border-yellow-400 hover:shadow-2xl xl:p-7"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1e3a]/5 text-[#0b1e3a] group-hover:bg-[#0b1e3a] group-hover:text-yellow-400 transition-colors duration-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 group-hover:bg-yellow-100 group-hover:text-yellow-900 transition-colors">
                        {tool.badge}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-[#0b1e3a] mb-2.5 group-hover:text-blue-950 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-6">
                      {tool.description}
                    </p>
                  </div>

                  <Link
                    href={tool.href}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-[#FFFFFF] px-4 py-2.5 text-sm font-bold text-[#000000] transition-colors duration-200 hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b1e3a] focus-visible:ring-offset-2"
                  >
                    Abrir calculadora
                  </Link>
                </motion.div>
              );
            })}
          </div>

        </div>
      </section>

      {/* =========================================================================
          FRANJA 3: HECHO PARA URUGUAY (Contenedores AMARILLOS con Letras NEGRAS y Hover)
          ========================================================================= */}
      <section className="w-full bg-[#0b1e3a] text-white py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="mx-auto max-w-[1440px]">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
              Hecho para la realidad uruguaya.
            </h2>
            <p className="text-base sm:text-lg text-gray-300">
              Sin configuraciones raras ni monedas extranjeras. Todo adaptado al sistema tributario local.
            </p>
          </div>

          {/* 3 CONTENEDORES AMARILLOS CON LETRAS NEGRAS Y ANIMACIONES HOVER */}
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="rounded-3xl bg-[#FACC15] text-[#0b1e3a] p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <h3 className="text-2xl font-black text-[#0b1e3a] mb-3">
                100% en Pesos y UI
              </h3>
              <p className="text-base font-medium text-gray-900 leading-relaxed">
                Olvidate de convertir dólares o adaptar fórmulas. Cada cálculo y proyección opera nativamente en moneda uruguaya y Unidades Indexadas.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="rounded-3xl bg-[#FACC15] text-[#0b1e3a] p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <h3 className="text-2xl font-black text-[#0b1e3a] mb-3">
                Leyes e IRPF al Día
              </h3>
              <p className="text-base font-medium text-gray-900 leading-relaxed">
                Franjas de IRPF, deducciones familiares, aportes a la seguridad social y normativas laborales permanentemente sincronizadas.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="rounded-3xl bg-[#FACC15] text-[#0b1e3a] p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <h3 className="text-2xl font-black text-[#0b1e3a] mb-3">
                Cero Fricción
              </h3>
              <p className="text-base font-medium text-gray-900 leading-relaxed">
                Sin planillas pesadas ni registros complicados. Ingresás tu monto, movés un control y tenés la respuesta limpia en segundos.
              </p>
            </motion.div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          FRANJA 4: LLAMADO A LA ACCIÓN FINAL (Blanco Puro con Botón Amarillo)
          ========================================================================= */}
      <section className="w-full bg-[#FFFFFF] text-[#0b1e3a] py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0b1e3a] mb-6">
              Empezá a ordenar tus finanzas hoy.
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-xl mx-auto">
              Usá todos los calculadores y guardá tus estimaciones en este dispositivo, sin crear una cuenta.
            </p>
            <div className="flex items-center justify-center">
              <Link
                href="/estimacion"
                className="w-full sm:w-auto rounded-full bg-[#FACC15] px-9 py-4 text-base font-bold text-[#0b1e3a] transition-all hover:bg-yellow-300 hover:scale-105 shadow-xl"
              >
                Estimar mi mes
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

    </main>
  );
}
