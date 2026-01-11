import "./globals.css";
import { Suspense } from "react";
import AppChrome from "../components/AppChrome";
import { SessionProvider } from "../components/SessionProvider";
import FeedbackWidget from "./components/FeedbackWidget";
import { Analytics } from '@vercel/analytics/next';
import InstallPWAButton from "./components/InstallPWAButton";



export const metadata = {
  title: "Finanzas personales para Uruguay | Mi Admi",
  description:
    "Ordená tus finanzas en sin ser experto. Registrá gastos, estimá tu próximo mes y tomá mejores decisiones con Mi Admi.",
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

      </head>
      <body className="min-h-screen bg-[#0b1e3a] text-white antialiased">
        <SessionProvider>
          <Suspense fallback={null}>
            <AppChrome>{children}</AppChrome>
          </Suspense>
        </SessionProvider>
        <FeedbackWidget />
        <InstallPWAButton />
        <Analytics />
        

      </body>
    </html>
  );
}
