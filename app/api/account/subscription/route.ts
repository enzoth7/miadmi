import { NextResponse } from "next/server";
import { getServerClient } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const accessToken = bearerMatch?.[1];

    const supabase = await getServerClient(accessToken);
    const {
      data: { user },
      error: userError,
    } = accessToken ? await supabase.auth.getUser(accessToken) : await supabase.auth.getUser();
    if (userError) return NextResponse.json({ error: userError.message }, { status: 401 });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("plan, trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    const plan = profile?.plan ?? "free";
    const trialEndsAt = profile?.trial_ends_at ?? null;
    let daysLeft: number | null = null;

    if (trialEndsAt) {
      const end = new Date(trialEndsAt);
      if (!Number.isNaN(end.getTime())) {
        const diffMs = end.getTime() - Date.now();
        daysLeft = diffMs > 0 ? Math.ceil(diffMs / (24 * 60 * 60 * 1000)) : 0;
      }
    }

    return NextResponse.json({
      plan,
      trial_ends_at: trialEndsAt,
      days_left: daysLeft,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}
