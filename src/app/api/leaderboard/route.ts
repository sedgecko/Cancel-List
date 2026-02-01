import { NextResponse } from "next/server";
import { supabaseService } from "../../../lib/supabase";

type PeriodRow = {
  id: string;
  is_closed?: boolean | null;
  ends_at?: string | null;
  end_at?: string | null;
};

type ItemRow = {
  id: string;
  title: string;
  category: string | null;
  votes: number;
};

export async function GET() {
  const supabase = supabaseService();

  // 1) Get current period (best effort; never 500 just because period is missing)
  const { data: period, error: periodErr } = await supabase
    .rpc("current_period")
    .single<PeriodRow>();

  if (periodErr || !period) {
    return NextResponse.json({
      items: [],
      period: null,
    });
  }

  // Canonical end time: always return ends_at
  const canonicalEndsAt = period.ends_at ?? period.end_at ?? null;

  // 2) Get leaderboard for that period (your function requires p_period_id)
  const { data: rows, error: lbErr } = await supabase.rpc("leaderboard", {
    p_period_id: period.id,
  });

  if (lbErr) {
    return NextResponse.json({ error: lbErr.message }, { status: 500 });
  }

  // 3) Trim items to only what the UI needs
  const items: ItemRow[] = (rows ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    category: r.category ?? null,
    votes: Number(r.votes ?? 0),
  }));

  // 4) Trim period to only what the UI needs
  return NextResponse.json({
    items,
    period: {
      id: period.id,
      is_closed: period.is_closed ?? false,
      ends_at: canonicalEndsAt,
    },
  });
}
