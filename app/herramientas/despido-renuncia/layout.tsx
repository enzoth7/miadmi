import { createSeoMetadata, createToolJsonLd } from "../../../lib/seo";

const title = "Calculadora de despido y renuncia en Uruguay";
const description =
  "Estimá gratis tu liquidación por despido o renuncia en Uruguay: sueldo, aguinaldo proporcional, licencia y salario vacacional.";
const path = "/herramientas/despido-renuncia";

export const metadata = createSeoMetadata({
  title,
  description,
  path,
  keywords: ["calculadora despido Uruguay", "liquidación por renuncia Uruguay"],
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
