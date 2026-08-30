import { rm } from "node:fs/promises";
import { createServer } from "node:net";
import { basename, dirname, resolve, sep } from "node:path";

const DEV_PORT = 3001;
const projectRoot = resolve(process.cwd());
const devOutput = resolve(projectRoot, ".next-dev");

const assertPortIsFree = () =>
  new Promise((resolvePort, rejectPort) => {
    const server = createServer();

    server.once("error", (error) => {
      if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
        rejectPort(
          new Error(
            `Mi Admi ya está ejecutándose en http://localhost:${DEV_PORT}. Cerrá ese servidor antes de usar dev:fresh.`
          )
        );
        return;
      }
      rejectPort(error);
    });

    server.once("listening", () => {
      server.close((error) => (error ? rejectPort(error) : resolvePort()));
    });

    server.listen(DEV_PORT);
  });

if (basename(devOutput) !== ".next-dev" || dirname(devOutput) !== projectRoot) {
  throw new Error(`Ruta de caché inesperada: ${devOutput}`);
}

if (!devOutput.startsWith(`${projectRoot}${sep}`)) {
  throw new Error(`La caché quedó fuera del proyecto: ${devOutput}`);
}

await assertPortIsFree();
await rm(devOutput, { recursive: true, force: true });
