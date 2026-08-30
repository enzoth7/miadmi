import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";

const routes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/herramientas", changeFrequency: "weekly", priority: 0.95 },
  { path: "/herramientas/calcular-descuentos-salarios", changeFrequency: "monthly", priority: 0.9 },
  { path: "/herramientas/aguinaldo", changeFrequency: "monthly", priority: 0.9 },
  { path: "/herramientas/despido-renuncia", changeFrequency: "monthly", priority: 0.9 },
  { path: "/herramientas/seguro-desempleo", changeFrequency: "monthly", priority: 0.9 },
  { path: "/estima-tu-mes", changeFrequency: "monthly", priority: 0.85 },
  { path: "/estimacion", changeFrequency: "monthly", priority: 0.8 },
  { path: "/estimacion/egresos-estimables", changeFrequency: "monthly", priority: 0.75 },
  { path: "/estimacion/ahorros", changeFrequency: "monthly", priority: 0.75 },
  { path: "/home", changeFrequency: "monthly", priority: 0.7 },
  { path: "/politica-de-privacidad", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terminos-condiciones", changeFrequency: "yearly", priority: 0.2 },
  { path: "/status", changeFrequency: "weekly", priority: 0.2 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date("2026-08-29"),
    changeFrequency,
    priority,
  }));
}
