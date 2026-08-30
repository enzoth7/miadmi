import { createSeoMetadata } from "../../../../lib/seo";

export const metadata = createSeoMetadata({
  title: "Configurar una estimación mensual",
  description: "Personalizá categorías de ingresos y gastos para obtener una estimación mensual adaptada a tu realidad.",
  path: "/estimacion/especifica/ajustes",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
