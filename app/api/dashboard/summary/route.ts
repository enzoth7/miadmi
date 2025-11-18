import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import {
  fetchEstimacionEspecifica,
  fetchEstimacionGeneral,
  fetchEstimablesGrouped,
  fetchEstimationMode,
  DEFAULT_ESTIMATION_MODE,
} from "../../../../lib/app-data";
import { buildDashboardSummary } from "../../../../lib/summary";

export async function GET(): Promise<Response> {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [general, especifica, estimables, mode] = await Promise.all([
      fetchEstimacionGeneral(supabase as any, user.id).catch(() => null),
      fetchEstimacionEspecifica(supabase as any, user.id).catch(() => null),
      fetchEstimablesGrouped(supabase as any, user.id).catch(() => null),
      fetchEstimationMode(supabase as any, user.id).catch(
        () => DEFAULT_ESTIMATION_MODE
      ),
    ]);

    const summary = buildDashboardSummary({
      general,
      especifica,
      estimables,
      activeMode: mode ?? DEFAULT_ESTIMATION_MODE,
    });

    return NextResponse.json({
      data: summary,
      cachedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    const message =
      error?.message ?? "Unexpected error while building dashboard summary.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
