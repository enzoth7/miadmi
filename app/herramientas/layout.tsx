import type { Metadata } from "next";

export const metadata = {
  title: "Herramientas financieras para Uruguay | Mi Admi",
  description: "Calculadoras simples: aguinaldo, descuentos de sueldo, seguro de desempleo, despido y renuncia y más.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
