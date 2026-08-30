import { SITE_URL } from "../../lib/seo";

export function GET() {
  const content = `# Mi Admi

Mi Admi es una colección gratuita y sin registro de calculadoras y herramientas orientativas para personas en Uruguay.

## Herramientas principales
- Calculadora de sueldo líquido: ${SITE_URL}/herramientas/calcular-descuentos-salarios
- Calculadora de aguinaldo: ${SITE_URL}/herramientas/aguinaldo
- Calculadora de despido y renuncia: ${SITE_URL}/herramientas/despido-renuncia
- Calculadora de seguro de desempleo BPS: ${SITE_URL}/herramientas/seguro-desempleo
- Estimador mensual de gastos: ${SITE_URL}/estima-tu-mes
- Herramientas gratuitas: ${SITE_URL}/herramientas

## Alcance
Los resultados son estimaciones orientativas para Uruguay y no sustituyen asesoramiento laboral, legal, contable o financiero profesional.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
