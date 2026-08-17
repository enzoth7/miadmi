import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/perfil/", "/premium/", "/control-mensual/", "/estima-tu-mes/"],
    },
    sitemap: "https://miadmi.com/sitemap.xml",
  };
}
