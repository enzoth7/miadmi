import { createSeoMetadata, createToolJsonLd } from "../../../lib/seo";

const title = "Calculadora de sueldo líquido en Uruguay";
const description =
  "Calculá gratis tu sueldo líquido y estimá descuentos de BPS, FONASA, FRL e IRPF según tu situación en Uruguay.";
const path = "/herramientas/calcular-descuentos-salarios";

export const metadata = createSeoMetadata({
  title,
  description,
  path,
  keywords: ["calculadora sueldo líquido Uruguay", "descuentos de sueldo BPS FONASA IRPF"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(createToolJsonLd({ name: title, description, path })).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
