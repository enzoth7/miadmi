import Link from "next/link";

export const metadata = {
  title: "Aviso legal - Mi Admi",
};

export default function AvisoLegalPage() {
  return (
    <div className="space-y-6 text-white py-16">
    <section>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Aviso legal
        </h1>
      <div className="mt-4 space-y-3 text-sm text-white/80">
        <p>
          Mi Admi es una herramienta de organización y visualización de finanzas personales. La información, gráficos y estimaciones que
          muestra la app tienen fines educativos e informativos y no constituyen asesoría financiera, contable, tributaria ni legal.
        </p>
        <p>
          Las decisiones que tomes sobre ahorro, inversión, endeudamiento, impuestos u otros temas financieros son tu exclusiva
          responsabilidad. Recomendamos consultar a profesionales habilitados cuando corresponda y considerar tu situación particular,
          tolerancia al riesgo y normativa aplicable.
        </p>
        <p>
          Aunque buscamos que el servicio funcione correctamente, no garantizamos resultados ni rendimientos, y no nos hacemos
          responsables por pérdidas derivadas del uso de la información presentada en la app. Para más detalles, consultá nuestros{" "}
          <Link href="/terminos-condiciones" className="font-semibold text-emerald-200 underline decoration-dotted underline-offset-4 hover:text-emerald-100">
            Términos y Condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/politica-de-privacidad" className="font-semibold text-emerald-200 underline decoration-dotted underline-offset-4 hover:text-emerald-100">
            Política de Privacidad
          </Link>
          .
        </p>
      </div>
    </section>
    </div>
  );
}
