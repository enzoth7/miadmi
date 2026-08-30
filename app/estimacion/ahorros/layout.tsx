import { createSeoMetadata } from "../../../lib/seo";

export const metadata = createSeoMetadata({
  title: "Calculadora de ahorro mensual",
  description: "Calculá cuánto podés ahorrar por mes según tus ingresos, gastos y estimaciones personales en Uruguay.",
  path: "/estimacion/ahorros",
  keywords: ["calculadora de ahorro mensual", "cuánto puedo ahorrar Uruguay"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
