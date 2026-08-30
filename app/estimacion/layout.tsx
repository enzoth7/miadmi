import { createSeoMetadata } from "../../lib/seo";

export const metadata = createSeoMetadata({
  title: "Planificador de finanzas mensuales",
  description: "Organizá ingresos, gastos y proyecciones mensuales gratis para entender mejor tus finanzas personales en Uruguay.",
  path: "/estimacion",
  keywords: ["planificador financiero mensual", "proyección de gastos Uruguay"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
