import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceder",
  description: "Acceso opcional con Google para respaldar tus estimaciones en Mi Admi.",
  robots: { index: false, follow: false },
};

export default function AccederLayout({ children }: { children: React.ReactNode }) {
  return children;
}
