import { createSeoMetadata } from "../../../lib/seo";

export const metadata = createSeoMetadata({
  title: "Calculadora de egresos y cuotas",
  description: "Proyectá compras, cuotas y egresos futuros para anticipar cómo impactarán en tus próximos meses.",
  path: "/estimacion/egresos-estimables",
  keywords: ["calculadora de cuotas mensuales", "proyección de egresos"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
