import "./globals.css";
import { Suspense } from "react";
import AppChrome from "../components/AppChrome";
import { SessionProvider } from "../components/SessionProvider";
import { Analytics } from '@vercel/analytics/next';
import InstallPWAButton from "./components/InstallPWAButton";

export const metadata = {
  title: "Finanzas personales para Uruguay | Mi Admi",
  description: "Ordená tus finanzas sin ser experto. Registrá gastos, estimá tu próximo mes y tomá mejores decisiones con Mi Admi.",
  keywords: "finanzas, uruguay, gastos, sueldo, aguinaldo, presupuesto",
  openGraph: {
    title: "Mi Admi - Finanzas Personales en Uruguay",
    description: "Ordená tus finanzas sin ser experto. Registrá gastos y estimá tu próximo mes.",
    url: "https://miadmi.com",
    siteName: "Mi Admi",
    locale: "es_UY",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b1e3a" />

        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="geo.region" content="UY" />
        <meta name="geo.placename" content="Uruguay" />

      </head>
      <body className="min-h-screen bg-[#0b1e3a] text-[#F6F6F6] antialiased">
        <SessionProvider>
          <Suspense fallback={null}>
            <AppChrome>{children}</AppChrome>
          </Suspense>
        </SessionProvider>
        <InstallPWAButton />
        <Analytics />
        

      </body>
    </html>
  );
}
