"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useSession } from "../../components/SessionProvider";

const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/home";

export default function AccederPage() {
  const searchParams = useSearchParams();
  const { supabase, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const continueWithGoogle = async () => {
    setLoading(true);
    setError("");
    const next = safeNext(searchParams.get("next"));
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (authError) {
      setError("No pudimos abrir el acceso con Google. Probá nuevamente.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[68vh] items-center justify-center py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-950 shadow-xl shadow-slate-950/10 sm:p-9">
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Guardá tus estimaciones</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Accedé opcionalmente para respaldar tus datos y verlos en otros dispositivos. Sin cuenta, Mi Admi sigue funcionando en este navegador.
        </p>
        {status === "authenticated" ? (
          <Link href="/home" className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">
            Ir al dashboard
          </Link>
        ) : (
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={loading}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-950 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            <Image src="/google-logo.png" alt="" width={20} height={20} />
            {loading ? "Abriendo Google…" : "Continuar con Google"}
          </button>
        )}
        {error ? <p className="mt-4 text-sm text-rose-700" role="alert">{error}</p> : null}
        <p className="mt-6 text-xs leading-5 text-slate-500">
          Al continuar aceptás los <Link className="underline hover:text-slate-800" href="/terminos-condiciones">términos</Link> y la <Link className="underline hover:text-slate-800" href="/politica-de-privacidad">política de privacidad</Link>.
        </p>
      </section>
    </div>
  );
}
