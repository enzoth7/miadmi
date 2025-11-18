"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    // Si ya hay sesión, vamos a /home
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) router.replace("/home");
    })();
  }, [router, supabase]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (mode === "signup") {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  await fetch("/api/profile/ensure", { method: "POST" });
  router.replace("/home");
} else {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await fetch("/api/profile/ensure", { method: "POST" });
  router.replace("/home");
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
