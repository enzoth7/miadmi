import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://miadmi.com"; // cambiá esto

  const paths = [
    "/",
    "/aviso-legal",
    "/como-funciona",
    "/contacto",
    "/cookies",
    "/faq",
    "/politica-de-privacidad",
    "/sobre-nosotros",
    "/status",
    "/terminos-condiciones",
    "/estima-tu-mes",
    "/herramientas",
    "/herramientas/aguinaldo",
    "/herramientas/calcular-descuentos-salarios",
    "/herramientas/seguro-desempleo",
  ];

  const now = new Date();

return paths.map((path) => ({
  url: `${baseUrl}${path}`,
  lastModified: now,
  changeFrequency: path === "/" ? "daily" : "weekly",
  priority: path === "/" ? 1 : 0.8,
}));
}
