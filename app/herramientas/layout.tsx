import type { Metadata } from "next";
import { createSeoMetadata } from "../../lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Calculadoras gratuitas en Uruguay",
  description: "Usá gratis calculadoras de sueldo líquido, aguinaldo, despido, renuncia y seguro de desempleo BPS para Uruguay.",
  path: "/herramientas",
  keywords: ["calculadoras laborales Uruguay", "calculadoras BPS gratis"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
