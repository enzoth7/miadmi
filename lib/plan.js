import { supabaseServer } from "./supabaseServer";

/** Devuelve { isPremium: boolean, plan, premiumUntil } para el usuario actual (sesión). */
export async function getCurrentPlan() {
  const supabase = supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { isPremium: false, plan: "free", premiumUntil: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("plan,premium_until")
    .eq("id", user.id)
    .single();

  const plan = error ? "free" : (data?.plan || "free");
  const premiumUntil = error ? null : data?.premium_until ?? null;
  const isPremium = plan === "premium" &&
    (!premiumUntil || new Date(premiumUntil).getTime() > Date.now());

  return { isPremium, plan, premiumUntil };
}
