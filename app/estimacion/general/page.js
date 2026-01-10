import { redirect } from "next/navigation";

// LEGACY: redirige a la pantalla principal de estimación.
export default function Page() {
  redirect("/estimacion");
}
