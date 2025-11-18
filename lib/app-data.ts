import { supabaseBrowser } from "./supabaseBrowser";

type SupabaseClient = ReturnType<typeof supabaseBrowser>;

export type EstimacionGeneral = {
  id?: string | null;
  sueldos: number;
  otrosIngresos: number;
  ahorroDeseado: number;
  saldoInicial: number;
  egresos: Array<{ id?: string; nombre: string; monto: number }>;
};

export type EstimacionEspecifica = {
  id?: string | null;
  ingresos: Record<string, any>;
  egresos: Record<string, any>;
};

export type EstimationActiveMode = "general" | "especifica";

export type AppSettingsData = {
  estimations?: {
    active?: EstimationActiveMode;
    [key: string]: any;
  };
  [key: string]: any;
};

export const DEFAULT_ESTIMATION_MODE: EstimationActiveMode = "general";

const normalizeEstimationMode = (value: any): EstimationActiveMode =>
  value === "especifica" ? "especifica" : "general";

export type MetaRecord = {
  id: string;
  nombre: string;
  monto: number;
  ahorrado: number;
  done: boolean;
};

export type ProfileData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number | null;
  location: string;
  occupation: string;
  avatarUrl: string;
};

export type EstimablesGrouped = {
  prestamos: Array<{ id: string; nombre: string; cuotas: string; montoCuota: string; mesInicio?: string }>;
  tarjetas: Array<{ id: string; nombre: string; cuotas: string; montoCuota: string; mesInicio?: string }>;
  compras: Array<{ id: string; nombre: string; valor: string; mes: string }>;
};

export type ControlMensualState = {
  inicial: { cash: string; tarjetas: string };
  actual: { cash: string; tarjetas: string };
  movimientos: Array<{
    id: string;
    fecha: string;
    categoria: string;
    desc: string;
    monto: string;
    medio: string;
  }>;
};

export async function getSupabaseSession(): Promise<{
  supabase: SupabaseClient;
  userId: string | null;
}> {
  const supabase = supabaseBrowser();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { supabase, userId: user?.id ?? null };
  } catch {
    return { supabase, userId: null };
  }
}

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, age, location, occupation, avatar_url"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    email: data.email ?? "",
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    age: data.age != null ? Number(data.age) : null,
    location: data.location ?? "",
    occupation: data.occupation ?? "",
    avatarUrl: data.avatar_url ?? "",
  };
}

export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    age?: number | null;
    location?: string | null;
    occupation?: string | null;
    avatarUrl?: string | null;
  }
): Promise<ProfileData | null> {
  const row: Record<string, any> = { id: userId };

  if (payload.email !== undefined) row.email = payload.email || null;
  if (payload.firstName !== undefined) row.first_name = payload.firstName || null;
  if (payload.lastName !== undefined) row.last_name = payload.lastName || null;
  if (payload.age !== undefined)
    row.age = payload.age != null ? Math.max(0, Math.round(payload.age)) : null;
  if (payload.location !== undefined) row.location = payload.location || null;
  if (payload.occupation !== undefined) row.occupation = payload.occupation || null;
  if (payload.avatarUrl !== undefined) row.avatar_url = payload.avatarUrl || null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select(
      "id, email, first_name, last_name, age, location, occupation, avatar_url"
    )
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    email: data.email ?? "",
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    age: data.age != null ? Number(data.age) : null,
    location: data.location ?? "",
    occupation: data.occupation ?? "",
    avatarUrl: data.avatar_url ?? "",
  };
}

export async function fetchEstimacionGeneral(
  supabase: SupabaseClient,
  userId: string
): Promise<EstimacionGeneral | null> {
  const { data } = await supabase
    .from("estimacion_general")
    .select(
      "id, sueldos, otros_ingresos, ahorro_deseado, saldo_inicial, egresos"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id ?? null,
    sueldos: Number(data.sueldos ?? 0),
    otrosIngresos: Number(data.otros_ingresos ?? 0),
    ahorroDeseado: Number(data.ahorro_deseado ?? 0),
    saldoInicial: Number(data.saldo_inicial ?? 0),
    egresos: Array.isArray(data.egresos)
      ? (data.egresos as Array<{ nombre: string; monto: number }>)
      : [],
  };
}

export async function upsertEstimacionGeneral(
  supabase: SupabaseClient,
  userId: string,
  payload: EstimacionGeneral
) {
  const row = {
    sueldos: payload.sueldos ?? 0,
    otros_ingresos: payload.otrosIngresos ?? 0,
    ahorro_deseado: payload.ahorroDeseado ?? 0,
    saldo_inicial: payload.saldoInicial ?? 0,
    egresos: payload.egresos ?? [],
  };

  if (payload.id) {
    const { data, error } = await supabase
      .from("estimacion_general")
      .update(row)
      .eq("id", payload.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? payload.id;
  } else {
    const { data, error } = await supabase
      .from("estimacion_general")
      .insert([{ user_id: userId, ...row }])
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? null;
  }
}

export async function fetchEstimacionEspecifica(
  supabase: SupabaseClient,
  userId: string
): Promise<EstimacionEspecifica | null> {
  const { data } = await supabase
    .from("estimacion_especifica")
    .select("id, ingresos, egresos")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id ?? null,
    ingresos: data.ingresos ?? {},
    egresos: data.egresos ?? {},
  };
}

export async function upsertEstimacionEspecifica(
  supabase: SupabaseClient,
  userId: string,
  payload: { id?: string | null; ingresos: any; egresos: any }
) {
  const row = {
    ingresos: payload.ingresos ?? {},
    egresos: payload.egresos ?? {},
  };

  if (payload.id) {
    const { data, error } = await supabase
      .from("estimacion_especifica")
      .update(row)
      .eq("id", payload.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? payload.id;
  } else {
    const { data, error } = await supabase
      .from("estimacion_especifica")
      .insert([{ user_id: userId, ...row }])
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? null;
  }
}

export async function fetchAppSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<AppSettingsData> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const payload = data?.data;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as AppSettingsData;
  }

  return {};
}

export async function fetchEstimationMode(
  supabase: SupabaseClient,
  userId: string
): Promise<EstimationActiveMode> {
  try {
    const settings = await fetchAppSettings(supabase, userId);
    return normalizeEstimationMode(settings?.estimations?.active);
  } catch {
    return DEFAULT_ESTIMATION_MODE;
  }
}

export async function saveEstimationMode(
  supabase: SupabaseClient,
  userId: string,
  mode: EstimationActiveMode
): Promise<EstimationActiveMode> {
  const target = normalizeEstimationMode(mode);

  let current: AppSettingsData = {};
  try {
    current = await fetchAppSettings(supabase, userId);
  } catch {
    current = {};
  }

  const estimations =
    current && typeof current.estimations === "object" && current.estimations !== null
      ? { ...current.estimations }
      : {};

  const nextData: AppSettingsData = {
    ...current,
    estimations: {
      ...estimations,
      active: target,
    },
  };

  const { error } = await supabase
    .from("app_settings")
    .upsert({ user_id: userId, data: nextData }, { onConflict: "user_id" });

  if (error) throw error;

  return target;
}

export async function fetchMetas(
  supabase: SupabaseClient,
  userId: string
): Promise<MetaRecord[]> {
  const { data } = await supabase
    .from("metas")
    .select("id, nombre, monto, ahorrado, done")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre ?? "",
    monto: Number(row.monto ?? 0),
    ahorrado: Number(row.ahorrado ?? 0),
    done: Boolean(row.done),
  }));
}

export async function insertMeta(
  supabase: SupabaseClient,
  userId: string,
  meta: { nombre: string; monto: number; ahorrado: number }
): Promise<MetaRecord | null> {
  const { data } = await supabase
    .from("metas")
    .insert({
      user_id: userId,
      nombre: meta.nombre,
      monto: meta.monto,
      ahorrado: meta.ahorrado,
    })
    .select("id, nombre, monto, ahorrado, done")
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    nombre: data.nombre ?? "",
    monto: Number(data.monto ?? 0),
    ahorrado: Number(data.ahorrado ?? 0),
    done: Boolean(data.done),
  };
}

export async function updateMetaRecord(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{ nombre: string; monto: number; ahorrado: number; done: boolean }>
) {
  await supabase.from("metas").update(patch).eq("id", id);
}

export async function removeMetaRecord(
  supabase: SupabaseClient,
  id: string
) {
  await supabase.from("metas").delete().eq("id", id);
}

export async function fetchEstimablesGrouped(
  supabase: SupabaseClient,
  userId: string
): Promise<EstimablesGrouped> {
  const { data } = await supabase
    .from("egresos_estimables")
    .select("id, tipo, nombre, cuotas_rest, monto_cuota, mes_objetivo, estado, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const rows = Array.isArray(data) ? data : [];
  const bundleRow = rows.find((row) => row?.estado === "bundle");

  if (bundleRow) {
    try {
      const payload = JSON.parse(String(bundleRow.nombre ?? "{}"));
      return normalizeEstimablesPayload(payload);
    } catch {
      // ignore malformed JSON and fall back to row-based parsing
    }
  }

  const grouped: EstimablesGrouped = {
    prestamos: [],
    tarjetas: [],
    compras: [],
  };

  for (const row of rows) {
    if (!row || row.estado === "bundle") continue;
    const tipo = String(row.tipo ?? "");
    if (tipo === "prestamo") {
      grouped.prestamos.push({
        id: ensureEstimableId(row.id),
        nombre: row.nombre ?? "",
        cuotas: row.cuotas_rest != null ? String(row.cuotas_rest) : "",
        montoCuota: row.monto_cuota != null ? String(row.monto_cuota) : "",
        mesInicio: toMonthString(row?.updated_at) ?? "",
      });
    } else if (tipo === "tarjeta") {
      grouped.tarjetas.push({
        id: ensureEstimableId(row.id),
        nombre: row.nombre ?? "",
        cuotas: row.cuotas_rest != null ? String(row.cuotas_rest) : "",
        montoCuota: row.monto_cuota != null ? String(row.monto_cuota) : "",
        mesInicio: toMonthString(row?.updated_at) ?? "",
      });
    } else if (tipo === "compra") {
      grouped.compras.push({
        id: ensureEstimableId(row.id),
        nombre: row.nombre ?? "",
        valor: row.monto_cuota != null ? String(row.monto_cuota) : "",
        mes: toMonthString(row.mes_objetivo),
      });
    }
  }

  return grouped;
}

export async function upsertEstimable(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    id?: string;
    tipo: "prestamo" | "tarjeta" | "compra";
    nombre: string;
    cuotas?: string;
    montoCuota?: string;
    mes?: string;
  }
) {
  await supabase
    .from("egresos_estimables")
    .upsert(
      {
        id: payload.id,
        user_id: userId,
        tipo: payload.tipo,
        nombre: payload.nombre,
        cuotas_rest:
          payload.tipo === "compra"
            ? null
            : payload.cuotas != null
            ? Number(payload.cuotas) || null
            : null,
        monto_cuota:
          payload.tipo === "compra"
            ? payload.montoCuota != null
              ? Number(payload.montoCuota) || null
              : null
            : payload.montoCuota != null
            ? Number(payload.montoCuota) || null
            : null,
        mes_objetivo: payload.tipo === "compra" ? payload.mes ?? null : null,
      },
      { onConflict: "id" }
    );
}

export async function deleteEstimable(
  supabase: SupabaseClient,
  id: string
) {
  await supabase.from("egresos_estimables").delete().eq("id", id);
}

export async function replaceEstimables(
  supabase: SupabaseClient,
  userId: string,
  data: EstimablesGrouped
) {
  const { error: deleteError } = await supabase
    .from("egresos_estimables")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  const bundle = buildEstimablesBundle(data);
  const payload = JSON.stringify(bundle);

  const { error: insertError } = await supabase
    .from("egresos_estimables")
    .insert({
      user_id: userId,
      tipo: "prestamo",
      nombre: payload,
      estado: "bundle",
    });

  if (insertError) throw insertError;
}

function buildEstimablesBundle(data: EstimablesGrouped) {
  return {
    prestamos: (Array.isArray(data.prestamos) ? data.prestamos : []).map(
      (item) => ({
        id: ensureEstimableId(item?.id),
        nombre: sanitizeText(item?.nombre),
        cuotas: toIntOrNull(item?.cuotas),
        montoCuota: toNumberOrNull(item?.montoCuota),
        mesInicio: toMonthKey(item?.mesInicio),
      })
    ),
    tarjetas: (Array.isArray(data.tarjetas) ? data.tarjetas : []).map(
      (item) => ({
        id: ensureEstimableId(item?.id),
        nombre: sanitizeText(item?.nombre),
        cuotas: toIntOrNull(item?.cuotas),
        montoCuota: toNumberOrNull(item?.montoCuota),
        mesInicio: toMonthKey(item?.mesInicio),
      })
    ),
    compras: (Array.isArray(data.compras) ? data.compras : []).map((item) => ({
      id: ensureEstimableId(item?.id),
      nombre: sanitizeText(item?.nombre),
      valor: toNumberOrNull(item?.valor),
      mes: toMonthKey(item?.mes),
    })),
  };
}

function normalizeEstimablesPayload(payload: any): EstimablesGrouped {
  return {
    prestamos: Array.isArray(payload?.prestamos)
      ? payload.prestamos.map((item: any) => ({
          id: ensureEstimableId(item?.id),
          nombre: sanitizeText(item?.nombre),
          cuotas: toCleanString(item?.cuotas),
          montoCuota: toCleanString(item?.montoCuota),
          mesInicio: toMonthString(item?.mesInicio),
        }))
      : [],
    tarjetas: Array.isArray(payload?.tarjetas)
      ? payload.tarjetas.map((item: any) => ({
          id: ensureEstimableId(item?.id),
          nombre: sanitizeText(item?.nombre),
          cuotas: toCleanString(item?.cuotas),
          montoCuota: toCleanString(item?.montoCuota),
          mesInicio: toMonthString(item?.mesInicio),
        }))
      : [],
    compras: Array.isArray(payload?.compras)
      ? payload.compras.map((item: any) => ({
          id: ensureEstimableId(item?.id),
          nombre: sanitizeText(item?.nombre),
          valor: toCleanString(item?.valor),
          mes: toMonthString(item?.mes),
        }))
      : [],
  };
}

function ensureEstimableId(value: any): string {
  if (typeof value === "string" && value) return value;
  if (value !== null && value !== undefined) {
    const str = String(value);
    if (str) return str;
  }
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // ignore runtime errors and fall back below
    }
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeText(value: any): string {
  return String(value ?? "").trim();
}

function toCleanString(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toNumberOrNull(value: any): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (!raw) return null;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

function toIntOrNull(value: any): number | null {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return null;
  return Math.round(numeric);
}

function toMonthKey(value: any): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 7);
  return null;
}

function toMonthString(value: any): string {
  return toMonthKey(value) ?? "";
}

export async function fetchControlMensual(
  supabase: SupabaseClient,
  userId: string
): Promise<ControlMensualState | null> {
  const { data, error } = await supabase
    .from("control_mensual")
    .select(
      "inicial_cash, inicial_tarjetas, actual_cash, actual_tarjetas, movimientos"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const movimientos = Array.isArray(data.movimientos)
    ? (data.movimientos as any[]).map((item) => ({
        id: item?.id ?? "",
        fecha: item?.fecha ?? "",
        categoria: item?.categoria ?? "Otros",
        desc: item?.desc ?? "",
        monto: item?.monto != null ? String(item.monto) : "",
        medio: item?.medio ?? "cash",
      }))
    : [];

  return {
    inicial: {
      cash: data.inicial_cash != null ? String(data.inicial_cash) : "",
      tarjetas: data.inicial_tarjetas != null ? String(data.inicial_tarjetas) : "",
    },
    actual: {
      cash: data.actual_cash != null ? String(data.actual_cash) : "",
      tarjetas: data.actual_tarjetas != null ? String(data.actual_tarjetas) : "",
    },
    movimientos,
  };
}

export async function saveControlMensual(
  supabase: SupabaseClient,
  userId: string,
  payload: ControlMensualState
) {
  const movimientos = payload.movimientos?.map((item) => ({
    id: item.id,
    fecha: item.fecha,
    categoria: item.categoria,
    desc: item.desc,
    monto: n(item.monto),
    medio: item.medio,
  })) ?? [];

  const { error: upsertError } = await supabase
    .from("control_mensual")
    .upsert(
      {
        user_id: userId,
        inicial_cash: n(payload.inicial.cash),
        inicial_tarjetas: n(payload.inicial.tarjetas),
        actual_cash: n(payload.actual.cash),
        actual_tarjetas: n(payload.actual.tarjetas),
        movimientos,
      },
      { onConflict: "user_id" }
    );

  if (upsertError) throw upsertError;
}

function n(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const numeric = Number(String(value).trim());
  if (Number.isFinite(numeric)) return numeric;
  return null;
}
