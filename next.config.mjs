/** @type {import('next').NextConfig} */
const nextConfig = {
  // El servidor de desarrollo y el build de producción no deben compartir
  // artefactos: si corren a la vez, Next puede borrar manifests que el otro usa.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
