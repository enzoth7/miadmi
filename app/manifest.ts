import type { MetadataRoute } from "next";
import { DEFAULT_DESCRIPTION } from "../lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mi Admi | Herramienta financiera para Uruguay",
    short_name: "Mi Admi",
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0b1e3a",
    theme_color: "#0b1e3a",
    lang: "es-UY",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      {
        src: "/image.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/image.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
