import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://miadmi.com/sitemap.xml",
    host: "https://miadmi.com",
  };
}
