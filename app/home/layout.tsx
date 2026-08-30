import { createSeoMetadata } from "../../lib/seo";

export const metadata = createSeoMetadata({
  title: "Dashboard financiero gratuito",
  description: "Visualizá gratis un resumen de tus ingresos, gastos, saldo y estimaciones financieras personales.",
  path: "/home",
  keywords: ["dashboard financiero gratis", "resumen de finanzas personales"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
