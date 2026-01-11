"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  DEFAULT_ESTIMATION_MODE,
  fetchProfile,
  getSupabaseSession,
  upsertProfile,
} from "../../lib/app-data";
import {
  buildInstallmentSeries,
  getCurrentMonthKey,
} from "../../lib/installments";
import {
  getRandomPresetAvatar,
  PRESET_AVATARS,
} from "../../lib/profile-avatars";
import { useSessionInfo } from "../../components/SessionProvider";
import { PerfilOnboardingTour } from "../../components/onboarding/PerfilOnboardingTour";

const LS_GEN = "miadmi:estimacion_general";
const LS_ESP = "miadmi:estimacion_especifica";
const LS_EST = "miadmi:egresos_estimables";
const MODE_KEY = "miadmi:estimacion_mode";

const KPI_DEFAULT = {
  saldo: 0,
  pct: 0,
  ingresos: 0,
  egresos: 0,
  mode: DEFAULT_ESTIMATION_MODE,
};

const HISTORY_MODULES = [
  {
    id: "general",
    title: "Estimacion general",
    description: "Ingresos y egresos base que alimentan el inicio y las metas.",
    href: "/estimacion", // HISTORIAL: la redireccion original no consideraba mes ni modo
  },
  {
    id: "especifica",
    title: "Estimacion especifica",
    description: "Escenarios puntuales, proyecciones y ajustes por categoria.",
    href: "/estimacion", // HISTORIAL: la redireccion original no consideraba mes ni modo
  },
  {
    id: "estimables",
    title: "Egresos estimables",
    description: "Suscripciones, prestamos y compras planificadas.",
    href: "/estimacion/egresos-estimables",
  },
  {
    id: "control",
    title: "Control mensual",
    description: "Seguimiento diario del efectivo y tarjetas.",
    href: "/control-mensual",
  },
];

const MONTH_LABEL_SHORT = new Intl.DateTimeFormat("es-UY", {
  month: "short",
  year: "numeric",
});
const MONTH_LABEL_LONG = new Intl.DateTimeFormat("es-UY", {
  month: "long",
  year: "numeric",
});

const buildRecentMonths = (limit) => {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const now = new Date();
  const months = [];
  for (let idx = 0; idx < limit; idx += 1) {
    const target = new Date(now.getFullYear(), now.getMonth() - idx, 1);
    const value = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      value,
      label: MONTH_LABEL_SHORT.format(target),
      fullLabel: MONTH_LABEL_LONG.format(target),
    });
  }
  return months;
};

const readLocalJSON = (key) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

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
  avatar_url: null,
};

const toUiProfile = (remote, fallbackEmail) => {
  const age =
    remote?.age !== null && remote?.age !== undefined
      ? Number(remote.age)
      : null;
  const avatarSource = remote?.avatarUrl ?? remote?.avatar_url ?? "";
  return {
    nombre: remote?.firstName ?? "",
    apellido: remote?.lastName ?? "",
    edad: age != null && Number.isFinite(age) && age > 0 ? String(age) : "",
    ubicacion: remote?.location ?? "",
    ocupacion: remote?.occupation ?? "",
    correo: fallbackEmail || remote?.email || "",
    foto: avatarSource,
    avatar_url: avatarSource || null,
  };
};

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [draft, setDraft] = useState(EMPTY_PROFILE);
  const [password, setPassword] = useState("");
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
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
  const [kpi, setKpi] = useState(KPI_DEFAULT);
  const [historySelection, setHistorySelection] = useState({});
  const [showTour, setShowTour] = useState(false);
  const { plan, premiumUntil } = useSessionInfo();
  const isPremium =
    plan === "premium" &&
    (!premiumUntil || new Date(premiumUntil).getTime() > Date.now());
  const historyLimitMonths = isPremium ? 24 : 3;
  const historyMonths = useMemo(
    () => buildRecentMonths(1), // HISTORIAL TODO: solo mes actual; sin snapshots reales en Supabase
    []
  );

  const hydratingRef = useRef(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      hydratingRef.current = true;
      setLoadError("");
      try {
        const ctx = await getSupabaseSession();
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
            let remote = await fetchProfile(supabase, ctx.userId);
            if (!active) return;
            if (remote && !remote.avatar_url) {
              const randomAvatar = getRandomPresetAvatar();
              try {
                const updated = await upsertProfile(supabase, ctx.userId, {
                  avatarUrl: randomAvatar,
                });
                if (!active) return;
                remote = updated ?? {
                  ...remote,
                  avatarUrl: randomAvatar,
                  avatar_url: randomAvatar,
                };
              } catch (avatarError) {
                console.warn(
                  "No se pudo asignar el avatar predeterminado:",
                  avatarError
                );
                remote = {
                  ...remote,
                  avatarUrl: randomAvatar,
                  avatar_url: randomAvatar,
                };
              }
            }
            const mapped = toUiProfile(remote, email);
            setProfile(mapped);
            setDraft(mapped);
          } catch (remoteError) {
            if (!active) return;
            setLoadError(
              remoteError?.message || "No se pudo cargar la informaciÃ³n del perfil."
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
        setLoadError(error?.message || "OcurriÃÂ³ un error al cargar el perfil.");
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
    setAvatarUrl(profile.avatar_url ?? profile.foto ?? null);
    setDirty(false);
    setSaveError("");
    setSaveSuccess("");
  }, [showConfig, profile]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = setTimeout(() => setSaveSuccess(""), 2500);
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  useEffect(() => {
    if (historyMonths.length === 0) return;
    setHistorySelection((prev) => {
      const fallback = historyMonths[0]?.value ?? "";
      let changed = false;
      const next = {};
      HISTORY_MODULES.forEach((module) => {
        const current = prev?.[module.id];
        const isValid = historyMonths.some(
          (month) => month.value === current
        );
        const value = isValid ? current : fallback;
        next[module.id] = value;
        if (value !== current) changed = true;
      });
      return changed ? next : prev;
    });
  }, [historyMonths]);

useEffect(() => {
  if (typeof window === "undefined") return;

  const key = "miadmi:tour-perfil";

  try {
    const stored = window.localStorage.getItem(key);

    if (!stored) {
      // primera vez que entra
      window.localStorage.setItem(key, "pending");
    }

    if (window.localStorage.getItem(key) === "pending") {
      setShowTour(true);
      window.localStorage.setItem(key, "done");
    }
  } catch {
    // ignore storage issues
  }
}, []);


  useEffect(() => {
    const computeKpi = () => {
      if (typeof window === "undefined") return;
      let activeMode = DEFAULT_ESTIMATION_MODE;
      try {
        const stored = window.localStorage.getItem(MODE_KEY);
        if (stored === "especifica" || stored === "general") {
          activeMode = stored;
        }
      } catch {
        activeMode = DEFAULT_ESTIMATION_MODE;
      }

      const includeGeneral = activeMode === "general";
      const includeEspecifica = activeMode === "especifica";
      const general = readLocalJSON(LS_GEN) || {};
      const especifica = readLocalJSON(LS_ESP) || {};
      const estimables = readLocalJSON(LS_EST) || {};

      const ingresosGen = includeGeneral
        ? n(general.sueldos) + n(general.otrosIngresos)
        : 0;
      const egresosGen = includeGeneral
        ? (Array.isArray(general.egresos) ? general.egresos : []).reduce(
            (acc, item) => acc + n(item?.monto),
            0
          )
        : 0;

      let ingresosEsp = 0;
      let egresosEsp = 0;
      let egresosObjEsp = {};
      if (includeEspecifica) {
        if (Array.isArray(especifica?.ingresos)) {
          ingresosEsp = especifica.ingresos.reduce(
            (acc, item) => acc + n(item?.monto),
            0
          );
        } else if (
          especifica?.ingresos &&
          typeof especifica.ingresos === "object"
        ) {
          ingresosEsp = Object.values(especifica.ingresos).reduce(
            (acc, value) => acc + n(value),
            0
          );
        }

        if (especifica?.egresos && typeof especifica.egresos === "object") {
          egresosObjEsp = especifica.egresos;
        } else if (
          especifica &&
          !especifica.ingresos &&
          !especifica.egresos &&
          typeof especifica === "object"
        ) {
          egresosObjEsp = especifica;
        }

        egresosEsp = Object.values(egresosObjEsp).reduce(
          (acc, value) => acc + n(value),
          0
        );
      }

      const monthKey = getCurrentMonthKey();
      let effPrest = 0;
      let effTarj = 0;
      let effComp = 0;
      if (includeEspecifica) {
        const prestamosSchedule = buildInstallmentSeries(
          Array.isArray(estimables?.prestamos) ? estimables.prestamos : [],
          monthKey
        );
        const tarjetasSchedule = buildInstallmentSeries(
          Array.isArray(estimables?.tarjetas) ? estimables.tarjetas : [],
          monthKey
        );
        const totalPrest = prestamosSchedule.currentTotal;
        const totalTarj = tarjetasSchedule.currentTotal;
        const totalComp = (Array.isArray(estimables?.compras)
          ? estimables.compras
          : []
        ).reduce(
          (acc, compra) =>
            acc +
            (String(compra?.mes || "") === monthKey ? n(compra?.valor) : 0),
          0
        );
        const espKeys = Object.keys(egresosObjEsp || {});
        const hasPrestamos = espKeys.some((key) => keyEquals(key, "Prestamos"));
        const hasTarjetas = espKeys.some((key) => keyEquals(key, "Tarjetas"));
        const hasCompras = espKeys.some((key) =>
          keyEquals(key, "Posibles compras")
        );
        effPrest = hasPrestamos ? 0 : totalPrest;
        effTarj = hasTarjetas ? 0 : totalTarj;
        effComp = hasCompras ? 0 : totalComp;
      }

      const ingresos = Math.max(0, ingresosGen + ingresosEsp);
      const egresos = Math.max(
        0,
        egresosGen + egresosEsp + effPrest + effTarj + effComp
      );
      const saldo = ingresos - egresos;
      const pct = ingresos > 0 ? Math.round((saldo / ingresos) * 1000) / 10 : 0;

      setKpi({
        saldo,
        pct,
        ingresos,
        egresos,
        mode: activeMode,
      });
    };

    computeKpi();
    const handleFocus = () => computeKpi();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        computeKpi();
      }
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("miadmi:data-updated", computeKpi);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("miadmi:data-updated", computeKpi);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

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
    setAvatarUrl(null);
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
      setSaveError("Necesitas iniciar sesiÃÂ³n para guardar.");
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      let avatarToSave = avatarUrl ?? draft.foto ?? null;

      if (pendingAvatar) {
        if (pendingAvatar.size > 500 * 1024) {
          throw new Error("La foto debe pesar menos de 500 KB.");
        }
        avatarToSave = await uploadAvatar(pendingAvatar);
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
        avatarUrl: avatarToSave || null,
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
          ? "Cambios guardados. Revisa tu correo para confirmar la actualizaciÃÂ³n."
          : "Cambios guardados."
      );
      setShowConfig(false);
    } catch (error) {
      const message =
        error?.message ||
        "No se pudo guardar el perfil. Intenta nuevamente mÃÂ¡s tarde.";
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
      console.warn("Error al cerrar sesiÃÂ³n:", error);
    } finally {
      window.location.href = "/";
    }
  };

  const buildHistoryHref = (moduleId) => {
    // HISTORIAL TODO: sin parametro de mes porque no hay snapshots historicos aun
    if (moduleId === "general") {
      return `/estimacion?mode=general`;
    }
    if (moduleId === "especifica") {
      return `/estimacion?mode=especifica`;
    }
    if (moduleId === "estimables") {
      return `/estimacion/egresos-estimables`;
    }
    if (moduleId === "control") {
      return `/control-mensual`;
    }
    return "/";
  };

  const canSave =
    !!session.userId &&
    !saving &&
    (dirty || Boolean(password) || Boolean(pendingAvatar));
  const uiCurrentAvatar =
    avatarUrl ?? draft.foto ?? profile.avatar_url ?? null;
  const headerAvatarSrc =
    profile.avatar_url || profile.foto || PRESET_AVATARS[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section id="perfil-header" className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">Perfil</h1>
            {loadError ? <p className="text-sm text-rose-200">{loadError}</p> : null}
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
              onClick={() => router.push("/paywall")}
              className="rounded-lg border bg-yellow-500 px-3 py-1.5 font-semibold text-white-900"
            >
              Suscripciones
            </button>
            <button
              onClick={logout}
              className="rounded-lg border bg-rose-600 px-3 py-1.5 text-white"
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        <section
          id="perfil-balance-card"
          className="flex flex-col gap-1 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent p-8"
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-30 w-30 overflow-hidden rounded-full border bg-white">
              <Image
                src={headerAvatarSrc}
                alt={
                  profile.nombre
                    ? `${profile.nombre} ${profile.apellido || ""}`.trim()
                    : "Avatar"
                }
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="text-3xl font-semibold">
                {(profile.nombre || "").trim()} {(profile.apellido || "").trim()}
              </div>
              <div className="text-sm text-white-600">
                Ocupación: {profile.ocupacion || "-"}
              </div>
              <div className="text-sm text-white-600">
                Correo: {profile.correo || "-"}
              </div>
            </div>
            <div className="ml-auto rounded-lg border bg-white p-3 text-right shadow-sm">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">
                Balance mensual{" "}
                <span className="text-[10px] font-normal uppercase text-gray-500">
                  {kpi.mode === "especifica"
                    ? "estimacion especifica"
                    : "estimacion general"}
                </span>
              </div>
              <div
                className={[
                  "text-xl font-semibold",
                  kpi.saldo >= 0 ? "text-emerald-700" : "text-rose-700",
                ].join(" ")}
              >
                {fmt(kpi.saldo)}
              </div>
              <div className="text-[11px] text-gray-600">
                {kpi.pct}% del modo activo
              </div>
            </div>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-gray-600">Cargando información...</p>
          ) : null}
        </section>
      </section>

      {/* HISTORIAL TODO: UI solo muestra mes actual porque no hay snapshots mensuales en Supabase */}
      <section
        id="perfil-historial-section"
        className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Elegí que queres ver del pasado</h2>
            <p className="text-sm text-white/70">
              Historial de tus meses pasados.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {HISTORY_MODULES.map((module) => {
            const selectedValue = historySelection[module.id];
            const selectedMonth =
              historyMonths.find((month) => month.value === selectedValue) || null;
            const href = buildHistoryHref(module.id);
            return (
              <div
                key={module.id}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#071429] p-4"
              >
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-white/50">
                    {module.id === "control" ? "Seguimiento" : "Estimaciones"}
                  </p>
                  <h3 className="text-sm font-semibold text-white">{module.title}</h3>
                  <p className="text-xs text-white/70">{module.description}</p>
                </div>

                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wide text-white/50">Meses disponibles</p>
                  {historyMonths.length > 0 ? (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {historyMonths.map((month) => {
                        const active = month.value === selectedValue;
                        return (
                          <button
                            key={`${module.id}-${month.value}`}
                            type="button"
                            onClick={() =>
                              setHistorySelection((prev) => ({
                                ...prev,
                                [module.id]: month.value,
                              }))
                            }
                            className={[
                              "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition",
                              active
                                ? "bg-emerald-500 text-slate-900"
                                : "bg-white/5 text-white/80 hover:bg-white/10",
                            ].join(" ")}
                          >
                            {month.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-white/60">
                      Todavia no hay historial guardado mes a mes; se muestra solo el estado actual.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-1 flex-col justify-end">
                  <span className="text-xs text-white/70">
                    {selectedMonth
                      ? `Mes seleccionado: ${selectedMonth.fullLabel}`
                      : "Sin meses disponibles"}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(href)}
                    className="mt-2 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-white"
                  >
                    Abrir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {showTour ? (
        <PerfilOnboardingTour onClose={() => setShowTour(false)} />
      ) : null}

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
              <div className="md:col-span-2 space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Avatar</h3>
                <p className="text-xs text-gray-500">
                  Si todavía no subiste una imagen, podés elegir uno de estos avatares
                  predeterminados.
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-white">
                    {uiCurrentAvatar ? (
                      <Image
                        src={uiCurrentAvatar}
                        alt="Avatar actual"
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        Sin avatar
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {PRESET_AVATARS.map((preset) => {
                      const isSelected = uiCurrentAvatar === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setAvatarUrl(preset);
                            updateDraft({ foto: preset });
                            setPendingAvatar(null);
                          }}
                          className={[
                            "h-12 w-12 overflow-hidden rounded-full border transition",
                            isSelected
                              ? "ring-2 ring-emerald-400 border-emerald-400"
                              : "border-slate-200 hover:border-slate-400",
                          ].join(" ")}
                        >
                          <Image
                            src={preset}
                            alt="Avatar predefinido"
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
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
                  placeholder="Contraseña"
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
