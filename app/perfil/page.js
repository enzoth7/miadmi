"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  fetchProfile,
  getSupabaseSession,
  upsertProfile,
} from "../../lib/app-data";
import {
  buildInstallmentSeries,
  getCurrentMonthKey,
} from "../../lib/installments";

const LS_GEN = "miadmi:estimacion_general";
const LS_ESP = "miadmi:estimacion_especifica";
const LS_EST = "miadmi:egresos_estimables";

const DEPARTAMENTOS = [
  "",
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
];

const n = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

const fmt = (v) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(v || 0);

const strip = (s) => {
  try {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  } catch {
    return String(s || "").toLowerCase();
  }
};

const keyEquals = (a, b) => strip(a) === strip(b);

const EMPTY_PROFILE = {
  nombre: "",
  apellido: "",
  edad: "",
  ubicacion: "",
  ocupacion: "",
  correo: "",
  foto: "",
};

const toUiProfile = (remote, fallbackEmail) => {
  const age =
    remote?.age !== null && remote?.age !== undefined
      ? Number(remote.age)
      : null;
  return {
    nombre: remote?.firstName ?? "",
    apellido: remote?.lastName ?? "",
    edad: age != null && Number.isFinite(age) && age > 0 ? String(age) : "",
    ubicacion: remote?.location ?? "",
    ocupacion: remote?.occupation ?? "",
    correo: fallbackEmail || remote?.email || "",
    foto: remote?.avatarUrl ?? "",
  };
};

export default function PerfilPage() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [draft, setDraft] = useState(EMPTY_PROFILE);
  const [password, setPassword] = useState("");
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [dirty, setDirty] = useState(false);
  const [session, setSession] = useState({
    supabase: null,
    userId: null,
    email: "",
  });

  const hydratingRef = useRef(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      hydratingRef.current = true;
      setLoadError("");
      try {
        const ctx = await getSupabaseSession();
        if (!active) return;

        const supabase = ctx.supabase;
        let email = "";

        if (supabase) {
          try {
            const {
              data: { user },
              error: userError,
            } = await supabase.auth.getUser();
            if (userError) throw userError;
            email = user?.email ?? "";
          } catch (authError) {
            email = "";
            console.warn("No se pudo obtener el usuario actual:", authError);
          }
        }

        setSession({ supabase, userId: ctx.userId, email });

        if (supabase && ctx.userId) {
          try {
            const remote = await fetchProfile(supabase, ctx.userId);
            if (!active) return;
            const mapped = toUiProfile(remote, email);
            setProfile(mapped);
            setDraft(mapped);
          } catch (remoteError) {
            if (!active) return;
            setLoadError(
              remoteError?.message || "No se pudo cargar la información del perfil."
            );
            const mapped = toUiProfile(null, email);
            setProfile(mapped);
            setDraft(mapped);
          }
        } else {
          const mapped = toUiProfile(null, email);
          setProfile(mapped);
          setDraft(mapped);
        }
      } catch (error) {
        if (!active) return;
        setLoadError(error?.message || "Ocurrió un error al cargar el perfil.");
      } finally {
        if (active) {
          hydratingRef.current = false;
          setDirty(false);
          setLoading(false);
        }
      }
    };

    hydrate();

    const refresh = () => {
      setProfile((prev) => ({ ...prev }));
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      hydratingRef.current = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!showConfig) return;
    setDraft(profile);
    setPassword("");
    setPendingAvatar(null);
    setDirty(false);
    setSaveError("");
    setSaveSuccess("");
  }, [showConfig, profile]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = setTimeout(() => setSaveSuccess(""), 2500);
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  const markDirty = () => {
    if (!hydratingRef.current) {
      setDirty(true);
      setSaveError("");
      setSaveSuccess("");
    }
  };

  const updateDraft = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    markDirty();
  };

  const onFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      setSaveError("La foto debe pesar menos de 500 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateDraft({ foto: String(reader.result || "") });
    };
    reader.readAsDataURL(file);
    setPendingAvatar(file);
  };

  const uploadAvatar = async (file) => {
    if (!session.supabase || !session.userId) return draft.foto;

    const ext =
      file.name?.split(".").pop()?.toLowerCase() ||
      file.type?.split("/").pop() ||
      "jpg";
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `profiles/${session.userId}/${Date.now()}.${safeExt}`;

    const { error: uploadError } = await session.supabase.storage
      .from("avatars")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) throw uploadError;

    const { data } = session.supabase.storage.from("avatars").getPublicUrl(path);
    return data?.publicUrl ?? draft.foto;
  };

  const handleSave = async () => {
    if (!session.userId || !session.supabase) {
      setSaveError("Necesitas iniciar sesión para guardar.");
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      let avatarUrl = draft.foto;

      if (pendingAvatar) {
        if (pendingAvatar.size > 500 * 1024) {
          throw new Error("La foto debe pesar menos de 500 KB.");
        }
        avatarUrl = await uploadAvatar(pendingAvatar);
      }

      const targetEmail = String(draft.correo || "").trim();
      const authPayload = {};

      if (targetEmail && targetEmail !== session.email) {
        authPayload.email = targetEmail;
      }
      if (password) {
        authPayload.password = password;
      }

      if (Object.keys(authPayload).length > 0) {
        const { error: authError } = await session.supabase.auth.updateUser(
          authPayload
        );
        if (authError) throw authError;
      }

      const updated = await upsertProfile(session.supabase, session.userId, {
        email: targetEmail || session.email || null,
        firstName: draft.nombre || null,
        lastName: draft.apellido || null,
        age: draft.edad ? Number(draft.edad) || null : null,
        location: draft.ubicacion || null,
        occupation: draft.ocupacion || null,
        avatarUrl: avatarUrl || null,
      });

      const refreshedEmail =
        targetEmail || session.email || updated?.email || "";

      const nextProfile = toUiProfile(updated, refreshedEmail);
      setProfile(nextProfile);
      setDraft(nextProfile);
      setSession((prev) => ({ ...prev, email: refreshedEmail }));
      setPassword("");
      setPendingAvatar(null);
      setDirty(false);
      setSaveSuccess(
        targetEmail && targetEmail !== session.email
          ? "Cambios guardados. Revisa tu correo para confirmar la actualización."
          : "Cambios guardados."
      );
      setShowConfig(false);
    } catch (error) {
      const message =
        error?.message ||
        "No se pudo guardar el perfil. Intenta nuevamente más tarde.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    if (!session.supabase) return;
    try {
      await session.supabase.auth.signOut();
    } catch (error) {
      console.warn("Error al cerrar sesión:", error);
    } finally {
      window.location.href = "/";
    }
  };

  const kpi = useMemo(() => {
    try {
      const g = JSON.parse(localStorage.getItem(LS_GEN) || "null") || {};
      const e = JSON.parse(localStorage.getItem(LS_ESP) || "null") || {};
      const est = JSON.parse(localStorage.getItem(LS_EST) || "null") || {};

      const ingresosGen = n(g.sueldos) + n(g.otrosIngresos);
      const egresosGen = (Array.isArray(g.egresos) ? g.egresos : []).reduce(
        (a, it) => a + n(it?.monto),
        0
      );

      const ingresosEsp = e?.ingresos
        ? Array.isArray(e.ingresos)
          ? e.ingresos.reduce((a, it) => a + n(it?.monto), 0)
          : Object.values(e.ingresos).reduce((a, v) => a + n(v), 0)
        : 0;

      const egrosObjEsp =
        e?.egresos && typeof e.egresos === "object"
          ? e.egresos
          : e && !e.ingresos && !e.egresos && typeof e === "object"
          ? e
          : {};

      const egresosEsp = Object.values(egrosObjEsp).reduce(
        (a, v) => a + n(v),
        0
      );

      const monthKey = getCurrentMonthKey();
      const prestamosSchedule = buildInstallmentSeries(est?.prestamos || [], monthKey);
      const totalPrest = prestamosSchedule.currentTotal;
      const tarjetasSchedule = buildInstallmentSeries(est?.tarjetas || [], monthKey);
      const totalTarj = tarjetasSchedule.currentTotal;
      const totalComp = (Array.isArray(est?.compras) ? est.compras : []).reduce(
        (a, c) => a + (String(c?.mes || "") === monthKey ? n(c?.valor) : 0),
        0
      );

      const espKeys = Object.keys(egrosObjEsp || {});
      const effPrest = espKeys.some((k) => keyEquals(k, "Préstamos"))
        ? 0
        : totalPrest;
      const effTarj = espKeys.some((k) => keyEquals(k, "Tarjetas"))
        ? 0
        : totalTarj;
      const effComp = espKeys.some((k) => keyEquals(k, "Posibles compras"))
        ? 0
        : totalComp;

      const ingresos = Math.max(0, ingresosGen + ingresosEsp);
      const egresos = Math.max(
        0,
        egresosGen + egresosEsp + effPrest + effTarj + effComp
      );
      const saldo = ingresos - egresos;
      const pct = ingresos > 0 ? Math.round((saldo / ingresos) * 1000) / 10 : 0;
      return { saldo, pct, ingresos, egresos };
    } catch {
      return { saldo: 0, pct: 0, ingresos: 0, egresos: 0 };
    }
  }, []);

  const canSave =
    !!session.userId &&
    !saving &&
    (dirty || Boolean(password) || Boolean(pendingAvatar));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Perfil
          </h1>
          {loadError ? (
            <p className="text-sm text-rose-200">{loadError}</p>
          ) : null}
          {!session.userId && !loading ? (
            <p className="text-sm text-rose-100">
              Inicia sesión para sincronizar tu información.
            </p>
          ) : null}
          {saveSuccess ? (
            <p className="text-sm text-emerald-200">{saveSuccess}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(true)}
            disabled={!session.userId || loading}
            className="rounded-lg border bg-white px-3 py-1.5 text-gray-900 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-gray-500"
          >
            Configuración
          </button>
          <button
            onClick={logout}
            className="rounded-lg border bg-rose-600 px-3 py-1.5 text-white"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-white/70 bg-sky-50 p-6 text-gray-900 shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border bg-white">
            {profile.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.foto}
                alt="Foto de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src="/logo.png"
                alt="Mi Admi"
                width={80}
                height={80}
                className="h-20 w-20 object-contain"
              />
            )}
          </div>
          <div>
            <div className="text-xl font-semibold">
              {(profile.nombre || "").trim()} {(profile.apellido || "").trim()}
            </div>
            <div className="text-sm text-gray-600">
              Ocupación: {profile.ocupacion || "-"}
            </div>
            <div className="text-sm text-gray-600">
              Correo: {profile.correo || "-"}
            </div>
          </div>
          <div className="ml-auto rounded-lg border bg-white p-3 text-right shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Dif. ingresos - egresos
            </div>
            <div
              className={[
                "text-xl font-semibold",
                kpi.saldo >= 0 ? "text-emerald-700" : "text-rose-700",
              ].join(" ")}
            >
              {fmt(kpi.saldo)}
            </div>
            <div className="text-[11px] text-gray-600">{kpi.pct}%</div>
          </div>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Cargando información...</p>
        ) : null}
      </section>

      {showConfig ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfig(false)}
          />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 text-gray-900 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold md:text-xl">Configuración</h2>
              <button
                onClick={() => setShowConfig(false)}
                className="text-sm text-gray-600"
              >
                Cerrar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-sm text-gray-700">Nombre y apellido</span>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    className="rounded border bg-white px-3 py-2"
                    value={draft.nombre}
                    onChange={(e) => updateDraft({ nombre: e.target.value })}
                    placeholder="Nombre"
                  />
                  <input
                    className="rounded border bg-white px-3 py-2"
                    value={draft.apellido}
                    onChange={(e) => updateDraft({ apellido: e.target.value })}
                    placeholder="Apellido"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">Edad</span>
                <input
                  className="rounded border bg-white px-3 py-2"
                  value={draft.edad}
                  onChange={(e) => updateDraft({ edad: e.target.value })}
                  inputMode="numeric"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">Ubicación</span>
                <select
                  className="rounded border bg-white px-3 py-2"
                  value={draft.ubicacion ?? ""}
                  onChange={(e) => updateDraft({ ubicacion: e.target.value })}
                >
                  {DEPARTAMENTOS.map((dep) => (
                    <option key={dep || "placeholder"} value={dep}>
                      {dep ? dep : "Selecciona un departamento"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">Ocupación</span>
                <input
                  className="rounded border bg-white px-3 py-2"
                  value={draft.ocupacion}
                  onChange={(e) => updateDraft({ ocupacion: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">Correo</span>
                <input
                  className="rounded border bg-white px-3 py-2"
                  value={draft.correo}
                  onChange={(e) => updateDraft({ correo: e.target.value })}
                  inputMode="email"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">Contraseña</span>
                <input
                  className="rounded border bg-white px-3 py-2"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    markDirty();
                  }}
                  type="password"
                  placeholder="••••••"
                />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-sm text-gray-700">Foto de perfil</span>
                <input
                  className="rounded border bg-white px-3 py-2"
                  type="file"
                  accept="image/*"
                  onChange={onFile}
                />
                <span className="text-xs text-gray-500">
                  Máximo 500 KB. Reemplaza la imagen actual si cargas un archivo.
                </span>
              </label>
            </div>
            {saveError ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {saveError}
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfig(false)}
                className="rounded-lg border bg-white px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-lg border bg-[#0b1e3a] px-3 py-1.5 text-white disabled:cursor-not-allowed disabled:bg-[#0b1e3a]/40"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
