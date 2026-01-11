"use client";

import { Suspense, useEffect, useState } from "react";
import { supabaseBrowser } from "../../../lib/supabaseBrowser";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionInfo } from "../../../components/SessionProvider";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = supabaseBrowser();
  const { user, loading: sessionLoading } = useSessionInfo();

  const modeParam = searchParams?.get("mode");
  const redirectToParam = searchParams?.get("redirectTo");
  const isValidRedirect =
    typeof redirectToParam === "string" &&
    redirectToParam.startsWith("/") &&
    !redirectToParam.startsWith("//");
  const redirectDestination = isValidRedirect ? redirectToParam : "/home";
  const reasonParam = searchParams?.get("reason");
  const timedOut = reasonParam === "timeout";
  const initialMode = modeParam === "signup" ? "signup" : "login";
  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (modeParam === "signup" || modeParam === "login") {
      setMode(modeParam);
    }
  }, [modeParam]);

  useEffect(() => {
    if (!sessionLoading && user) {
      router.replace(redirectDestination);
    }
  }, [sessionLoading, user, router, redirectDestination]);

async function signInWithGoogle() {
  setBusy(true);
  setErr("");
  try {
    // Guardamos el destino post-login en una cookie simple (válida para el callback server)
    document.cookie = `post_auth_redirect=${encodeURIComponent(
      redirectDestination
    )}; path=/; samesite=lax`;

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) throw error;
  } catch (e: any) {
    setErr(e?.message || "Error");
    setBusy(false);
  }
}






async function onSubmit(e) {
  e.preventDefault();
  setBusy(true);
  setErr("");
  try {
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

// Enviar email de bienvenida (server)
const { data: sessionData } = await supabase.auth.getSession();
const accessToken = sessionData?.session?.access_token;

if (accessToken) {
  await fetch("/api/email/welcome", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}



      // Crea el perfil/base en Supabase
      await fetch("/api/profile/ensure", { method: "POST" });

      // NUEVO: siempre que es signup => vamos al onboarding
      router.replace("/onboarding");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      await fetch("/api/profile/ensure", { method: "POST" });

      // Login normal respeta redirectTo o /home
      router.replace(redirectDestination);
    }
  } catch (e) {
    setErr(e?.message || "Error");
  } finally {
    setBusy(false);
  }
}


  return (
    <div className="max-w-md mx-auto mt-10 rounded-2xl p-6 bg-sky-50 text-gray-900 shadow border border-white/70">
      <h1 className="text-2xl font-semibold mb-2">
        {mode === "signup" ? "Crear cuenta" : "Ingresar"}
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        Usá tu email y una contraseña para {mode === "signup" ? "registrarte" : "entrar"}.
      </p>

      {timedOut ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700">
          Tu sesión se cerró por inactividad. Volvé a ingresar para continuar.
        </div>
      ) : null}

<button
  type="button"
  onClick={signInWithGoogle}
  disabled={busy}
  className="w-full rounded-lg border bg-white py-2 hover:bg-gray-50 disabled:opacity-60"
>
  <span className="relative flex w-full items-center justify-center">
    <img
      src="/google-logo.png"
      alt=""
      className="absolute left-4 h-5 w-5"
    />
    <span>Continuar con Google</span>
  </span>
</button>



<div className="flex items-center gap-3">
  <div className="h-px flex-1 bg-gray-200" />
  <span className="text-xs text-gray-500">o</span>
  <div className="h-px flex-1 bg-gray-200" />
</div>



      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            className="w-full rounded-lg border bg-white p-2 outline-none"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@dominio.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Contraseña</label>
          <input
            className="w-full rounded-lg border bg-white p-2 outline-none"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
          />
        </div>

        {err ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {err}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#0b1e3a] text-white py-2 hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Procesando..." : mode === "signup" ? "Crear cuenta" : "Ingresar"}
        </button>
      </form>

      <div className="mt-4 text-sm text-center">
        {mode === "signup" ? (
          <>
            ¿Ya tenés cuenta?{" "}
            <button
              className="text-blue-700 underline"
              onClick={() => setMode("login")}
            >
              Ingresar
            </button>
          </>
        ) : (
          <>
            ¿No tenés cuenta?{" "}
            <button
              className="text-blue-700 underline"
              onClick={() => setMode("signup")}
            >
              Crear cuenta
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
