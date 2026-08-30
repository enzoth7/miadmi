import { createSeoMetadata, createToolJsonLd } from "../../../lib/seo";

const title = "Calculadora de aguinaldo en Uruguay";
const description =
  "Calculá gratis tu aguinaldo fijo o variable en Uruguay y obtené una estimación clara según los meses trabajados.";
const path = "/herramientas/aguinaldo";

export const metadata = createSeoMetadata({
  title,
  description,
  path,
  keywords: ["calcular aguinaldo Uruguay", "medio aguinaldo Uruguay"],
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
