import { createSeoMetadata, createToolJsonLd } from "../../../lib/seo";

const title = "Calculadora de seguro de desempleo BPS";
const description =
  "Estimá gratis cuánto podrías cobrar por seguro de desempleo del BPS en Uruguay, mes a mes y según tu sueldo.";
const path = "/herramientas/seguro-desempleo";

export const metadata = createSeoMetadata({
  title,
  description,
  path,
  keywords: ["calculadora seguro de desempleo BPS", "subsidio por desempleo Uruguay"],
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
