type SupabaseClient = any;

export type EstimacionGeneral = {
  id?: string | null;
  sueldos: number;
  otrosIngresos: number;
  ahorroDeseado: number;
  saldoInicial: number;
  egresos: Array<{ id?: string; nombre: string; monto: number }>;
};

export type EstimacionEspecifica = {
  id: string | null;
  ingresos: any;
  egresos: any;
  saldo_inicial?: number | null;
  projection?: any | null;
  projection_anchor?: string | null;
  ahorro_mensual?: number | null;
};


export type EstimationActiveMode = "general" | "especifica";

export type AppSettingsData = {
  estimations?: {
    active?: EstimationActiveMode;
    [key: string]: any;
  };
  customCategories?: {
    ingresos?: Array<{ id?: string; nombre?: string }>;
    egresos?: Array<{ id?: string; nombre?: string }>;
  };
  [key: string]: any;
};


export const DEFAULT_ESTIMATION_MODE: EstimationActiveMode = "general";

const normalizeEstimationMode = (value: any): EstimationActiveMode =>
  value === "especifica" ? "especifica" : "general";

export type ProfileData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number | null;
  location: string;
  occupation: string;
  avatarUrl: string;
  avatar_url?: string | null;
};

export type EstimablePrestamo = {
  id: string;
  nombre: string;
  cuotas: string | number;
  montoCuota: string | number;
  mesInicio: string;
  mesFin: string;
};

export type EstimableTarjeta = {
  id: string;
  nombre: string;
  cuotas: string | number;
  montoCuota: string | number;
  mesInicio: string;
  mesFin: string;
  valorTotal: string | number;
  suscripcion: boolean;
};

export type EstimableCompra = {
  id: string;
  nombre: string;
  valor: string | number;
  mes: string;
};

export type EstimablesGrouped = {
  prestamos: EstimablePrestamo[];
  tarjetas: EstimableTarjeta[];
  compras: EstimableCompra[];
};

export async function getSupabaseSession(): Promise<{
  supabase: SupabaseClient | null;
  userId: string | null;
}> {
  if (typeof window === "undefined") return { supabase: null, userId: null };
  try {
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { supabase: null, userId: null };
    return { supabase, userId: data.user.id };
  } catch {
    return { supabase: null, userId: null };
  }
}

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileData | null> {
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("id, email, display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    email: data.email ?? "",
    firstName: data.display_name ?? "",
    lastName: "",
    age: null,
    location: "",
    occupation: "",
    avatarUrl: data.avatar_url ?? "",
    avatar_url: data.avatar_url ?? null,
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
  if (payload.firstName !== undefined) row.display_name = payload.firstName || null;
  if (payload.avatarUrl !== undefined) row.avatar_url = payload.avatarUrl || null;

  const { data, error } = await (supabase as any)
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select("id, email, display_name, avatar_url")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    email: data.email ?? "",
    firstName: data.display_name ?? "",
    lastName: "",
    age: null,
    location: "",
    occupation: "",
    avatarUrl: data.avatar_url ?? "",
    avatar_url: data.avatar_url ?? null,
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

  const { data, error } = await supabase
    .from("estimacion_general")
    .upsert({ user_id: userId, ...row }, { onConflict: "user_id" })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  await persistEstimacionGeneralHistory(supabase, userId, row);
  return data?.id ?? payload.id ?? null;
}

async function persistEstimacionGeneralHistory(
  supabase: SupabaseClient,
  userId: string,
  row: {
    sueldos: number;
    otros_ingresos: number;
    ahorro_deseado: number;
    saldo_inicial: number;
    egresos: EstimacionGeneral["egresos"];
  }
) {
  const periodMonthDate = new Date();
  periodMonthDate.setDate(1);
  const periodMonth = periodMonthDate.toISOString().slice(0, 10);

  const historyPayload = {
    sueldos: row.sueldos,
    otros_ingresos: row.otros_ingresos,
    ahorro_deseado: row.ahorro_deseado,
    saldo_inicial: row.saldo_inicial,
    egresos: row.egresos,
  };

  const { data: existing, error: historyLookupError } = await supabase
    .from("estimacion_general_history")
    .select("id")
    .eq("user_id", userId)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (historyLookupError) {
    console.error("estimacion_general_history error", historyLookupError);
    throw historyLookupError;
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("estimacion_general_history")
      .update(historyPayload)
      .eq("user_id", userId)
      .eq("period_month", periodMonth);

    if (updateError) {
      console.error("estimacion_general_history error", updateError);
      throw updateError;
    }
    return;
  }

  const historyRow = {
    user_id: userId,
    period_month: periodMonth,
    ...historyPayload,
  };

  const { error: insertError } = await supabase
    .from("estimacion_general_history")
    .insert(historyRow);

  if (insertError) {
    console.error("estimacion_general_history error", insertError);
    throw insertError;
  }
}


export async function fetchEstimacionEspecifica(
  supabase: SupabaseClient,
  userId: string
): Promise<EstimacionEspecifica | null> {
  const { data } = await supabase
    .from("estimacion_especifica")
    .select("id, ingresos, egresos, saldo_inicial, projection, projection_anchor, ahorro_mensual")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id ?? null,
    ingresos: data.ingresos ?? {},
    egresos: data.egresos ?? {},
    saldo_inicial: data.saldo_inicial ?? null,
    projection: data.projection ?? null,
    projection_anchor: data.projection_anchor ?? null,
    ahorro_mensual: data.ahorro_mensual ?? null,
  };
}


export async function upsertEstimacionEspecifica(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    id?: string | null;
    ingresos: any;
    egresos: any;
    saldo_inicial?: number;
    projection?: any;
    projection_anchor?: string | null;
    ahorro_mensual?: number | null;
  }
) {

const row = {
  ingresos: payload.ingresos ?? {},
  egresos: payload.egresos ?? {},
saldo_inicial:
  payload.saldo_inicial === null || payload.saldo_inicial === undefined
    ? null
    : payload.saldo_inicial,
  projection: payload.projection ?? null,
  projection_anchor: payload.projection_anchor ?? null,
  ahorro_mensual:
    payload.ahorro_mensual === null || payload.ahorro_mensual === undefined
      ? null
      : payload.ahorro_mensual,
};

  const { data, error } = await supabase
    .from("estimacion_especifica")
    .upsert({ user_id: userId, ...row }, { onConflict: "user_id" })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  await persistEstimacionEspecificaHistory(supabase, userId, row);
  return data?.id ?? payload.id ?? null;
}

async function persistEstimacionEspecificaHistory(
  supabase: SupabaseClient,
  userId: string,
  row: { ingresos: any; egresos: any }
) {
  const periodMonthDate = new Date();
  periodMonthDate.setDate(1);
  const periodMonth = periodMonthDate.toISOString().slice(0, 10);

  const historyPayload = {
    ingresos: row.ingresos ?? {},
    egresos: row.egresos ?? {},
  };

  const { data: existing, error: historyLookupError } = await supabase
    .from("estimacion_especifica_history")
    .select("id")
    .eq("user_id", userId)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (historyLookupError) {
    console.error("estimacion_especifica_history lookup error", historyLookupError);
    throw historyLookupError;
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("estimacion_especifica_history")
      .update(historyPayload)
      .eq("user_id", userId)
      .eq("period_month", periodMonth);

    if (updateError) {
      console.error("estimacion_especifica_history update error", updateError);
      throw updateError;
    }
    return;
  }

  const historyRow = {
    user_id: userId,
    period_month: periodMonth,
    ...historyPayload,
  };
  const { error: insertError } = await supabase
    .from("estimacion_especifica_history")
    .insert(historyRow);

  if (insertError) {
    console.error("estimacion_especifica_history insert error", insertError);
    throw insertError;
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

export async function fetchCustomCategories(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ingresos?: Array<{ id?: string; nombre?: string }>; egresos?: Array<{ id?: string; nombre?: string }> } | null> {
  const settings = await fetchAppSettings(supabase, userId);
  const payload = settings?.customCategories;
  if (payload && typeof payload === "object") {
    return payload;
  }
  return null;
}

export async function saveCustomCategories(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    ingresos: Array<{ id?: string; nombre?: string }>;
    egresos: Array<{ id?: string; nombre?: string }>;
  }
) {
  let current: AppSettingsData = {};
  try {
    current = await fetchAppSettings(supabase, userId);
  } catch {
    current = {};
  }

  const nextData: AppSettingsData = {
    ...current,
    customCategories: {
      ingresos: Array.isArray(payload.ingresos) ? payload.ingresos : [],
      egresos: Array.isArray(payload.egresos) ? payload.egresos : [],
    },
  };

  const { error } = await supabase
    .from("app_settings")
    .upsert({ user_id: userId, data: nextData }, { onConflict: "user_id" });

  if (error) throw error;
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



export async function fetchEstimablesGrouped(
  supabase: SupabaseClient,
  userId: string
): Promise<EstimablesGrouped> {
  const { data, error } = await supabase
    .from("egresos_estimables")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("fetchEstimablesGrouped error", error);
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];
  const bundleRow = rows.find((row) => row?.estado === "bundle");

  if (bundleRow) {
    const payload = extractEstimablesBundlePayload(bundleRow);
    if (payload) {
      return normalizeEstimablesPayload(payload);
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
    const monthSource =
      row.mes_objetivo ?? row.updated_at ?? row.created_at ?? null;

    if (tipo === "prestamo") {
      grouped.prestamos.push({
        id: ensureEstimableId(row.id),
        nombre: row.nombre ?? "",
        cuotas: row.cuotas_rest != null ? String(row.cuotas_rest) : "",
        montoCuota: row.monto_cuota != null ? String(row.monto_cuota) : "",
        mesInicio: toMonthString(monthSource),
        mesFin: "",
      });
    } else if (tipo === "tarjeta") {
      grouped.tarjetas.push({
        id: ensureEstimableId(row.id),
        nombre: row.nombre ?? "",
        cuotas: row.cuotas_rest != null ? String(row.cuotas_rest) : "",
        montoCuota: row.monto_cuota != null ? String(row.monto_cuota) : "",
        mesInicio: toMonthString(monthSource),
        mesFin: "",
        valorTotal: "",
        suscripcion: false,
      });
    } else if (tipo === "compra") {
      grouped.compras.push({
        id: ensureEstimableId(row.id),
        nombre: row.nombre ?? "",
        valor: row.monto_cuota != null ? String(row.monto_cuota) : "",
        mes: toMonthString(row.mes_objetivo ?? monthSource),
      });
    }
  }

  return grouped;
}

function extractEstimablesBundlePayload(row: any) {
  if (!row) return null;

  const fromColumns = {
    prestamos: Array.isArray(row.prestamos) ? row.prestamos : [],
    tarjetas: Array.isArray(row.tarjetas) ? row.tarjetas : [],
    compras: Array.isArray(row.compras) ? row.compras : [],
  };

  const parsed = parseBundleFromNombre(row.nombre);
  const parsedHasContent =
    parsed &&
    (parsed.prestamos.length > 0 ||
      parsed.tarjetas.length > 0 ||
      parsed.compras.length > 0);

  if (parsedHasContent) {
    return parsed;
  }

  if (
    fromColumns.prestamos.length > 0 ||
    fromColumns.tarjetas.length > 0 ||
    fromColumns.compras.length > 0
  ) {
    return fromColumns;
  }

  return fromColumns;
}

function parseBundleFromNombre(raw: any) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        prestamos: Array.isArray(parsed.prestamos) ? parsed.prestamos : [],
        tarjetas: Array.isArray(parsed.tarjetas) ? parsed.tarjetas : [],
        compras: Array.isArray(parsed.compras) ? parsed.compras : [],
      };
    }
  } catch {
    // ignore invalid JSON
  }
  return null;
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
      prestamos: bundle.prestamos,
      tarjetas: bundle.tarjetas,
      compras: bundle.compras,
    });

  if (insertError) throw insertError;

  const periodMonthDate = new Date();
  periodMonthDate.setDate(1);
  const periodMonth = periodMonthDate.toISOString().slice(0, 10);
  const historyPayload = {
    prestamos: bundle.prestamos,
    tarjetas: bundle.tarjetas,
    compras: bundle.compras,
  };

  const { data: existingHistory, error: historyLookupError } = await supabase
    .from("egresos_estimables_history")
    .select("id")
    .eq("user_id", userId)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (historyLookupError) {
    console.error("replaceEstimables history lookup error", historyLookupError);
    throw historyLookupError;
  }

  if (existingHistory) {
    const { error: historyUpdateError } = await supabase
      .from("egresos_estimables_history")
      .update(historyPayload)
      .eq("user_id", userId)
      .eq("period_month", periodMonth);

    if (historyUpdateError) {
      console.error("replaceEstimables history update error", historyUpdateError);
      throw historyUpdateError;
    }
    return;
  }

  const historyRow = {
    user_id: userId,
    period_month: periodMonth,
    ...historyPayload,
  };

  const { error: historyError } = await supabase
    .from("egresos_estimables_history")
    .insert(historyRow);

  if (historyError) {
    console.error("replaceEstimables history insert error", historyError);
    throw historyError;
  }
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
        mesFin: toMonthKey(item?.mesFin),
      })
    ),
    tarjetas: (Array.isArray(data.tarjetas) ? data.tarjetas : []).map(
      (item) => ({
        id: ensureEstimableId(item?.id),
        nombre: sanitizeText(item?.nombre),
        cuotas: toIntOrNull(item?.cuotas),
        montoCuota: toNumberOrNull(item?.montoCuota),
        mesInicio: toMonthKey(item?.mesInicio),
        mesFin: toMonthKey(item?.mesFin),
        valorTotal: toNumberOrNull(item?.valorTotal),
        suscripcion: Boolean(item?.suscripcion),
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
          mesFin: toMonthString(item?.mesFin),
        }))
      : [],
    tarjetas: Array.isArray(payload?.tarjetas)
      ? payload.tarjetas.map((item: any) => ({
          id: ensureEstimableId(item?.id),
          nombre: sanitizeText(item?.nombre),
          cuotas: toCleanString(item?.cuotas),
          montoCuota: toCleanString(item?.montoCuota),
          mesInicio: toMonthString(item?.mesInicio),
          mesFin: toMonthString(item?.mesFin),
          valorTotal: toCleanString(item?.valorTotal),
          suscripcion: Boolean(item?.suscripcion),
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

function n(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const numeric = Number(String(value).trim());
  if (Number.isFinite(numeric)) return numeric;
  return null;
}
