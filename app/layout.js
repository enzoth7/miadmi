import "./globals.css";
import { Suspense } from "react";
import AppChrome from "../components/AppChrome";
import { Analytics } from '@vercel/analytics/next';
import InstallPWAButton from "./components/InstallPWAButton";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "../lib/seo";
import { SessionProvider } from "../components/SessionProvider";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mi Admi | Herramienta financiera para Uruguay",
    template: "Mi Admi | %s",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "finance",
  keywords: [
    "calculadoras gratis Uruguay",
    "calculadora sueldo líquido Uruguay",
    "calculadora aguinaldo Uruguay",
    "calculadora despido Uruguay",
    "seguro de desempleo BPS",
    "estimador de gastos Uruguay",
    "finanzas personales Uruguay",
  ],
  openGraph: {
    title: "Mi Admi | Calculadoras gratis para Uruguay",
    description: DEFAULT_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "es_UY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mi Admi | Calculadoras gratis para Uruguay",
    description: DEFAULT_DESCRIPTION,
  },
  alternates: {
    canonical: "/",
    languages: {
      "es-UY": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "geo.region": "UY",
    "geo.placename": "Uruguay",
    "content-language": "es-UY",
  },
};

export const viewport = {
  themeColor: "#0b1e3a",
  colorScheme: "dark light",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: "MiAdmi",
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      inLanguage: "es-UY",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/Mi%20Admi_4k_T.png`,
      areaServed: {
        "@type": "Country",
        name: "Uruguay",
      },
    },
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Cualquier navegador web",
      inLanguage: "es-UY",
      isAccessibleForFree: true,
      areaServed: {
        "@type": "Country",
        name: "Uruguay",
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "UYU",
      },
      featureList: [
        "Calculadora de sueldo líquido",
        "Calculadora de aguinaldo",
        "Calculadora de despido y renuncia",
        "Calculadora de seguro de desempleo BPS",
        "Estimador de gastos y ahorro mensual",
      ],
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-UY">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
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
