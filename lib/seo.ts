import type { Metadata } from "next";

export const SITE_NAME = "Mi Admi";
export const SITE_URL = "https://miadmi.com";
export const DEFAULT_DESCRIPTION =
  "Calculadoras y herramientas gratuitas para resolver dudas de sueldo, aguinaldo, despido, seguro de desempleo, gastos y ahorro en Uruguay.";

const BASE_KEYWORDS = [
  "calculadoras gratis Uruguay",
  "herramientas financieras Uruguay",
  "sueldo líquido Uruguay",
  "aguinaldo Uruguay",
  "despido y renuncia Uruguay",
  "seguro de desempleo BPS",
  "finanzas personales Uruguay",
];

type SeoInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function createSeoMetadata({
  title,
  description,
  path,
  keywords = [],
  noIndex = false,
}: SeoInput): Metadata {
  const fullTitle = `${SITE_NAME} | ${title}`;

  return {
    title: { absolute: fullTitle },
    description,
    keywords: [...keywords, ...BASE_KEYWORDS],
    alternates: {
      canonical: path,
      languages: {
        "es-UY": path,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "es_UY",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
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
  };
}

export function createToolJsonLd({
  name,
  description,
  path,
}: Pick<SeoInput, "description" | "path"> & { name: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: `${SITE_URL}${path}`,
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
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
