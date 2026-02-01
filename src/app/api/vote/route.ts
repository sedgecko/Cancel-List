import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseService } from "../../../lib/supabase";
import crypto from "crypto";

export const runtime = "nodejs";

type PeriodRow = {
  id: string;
  is_closed?: boolean | null;
  starts_at?: string | null;
  ends_at?: string | null;
  start_at?: string | null;
  end_at?: string | null;
};

export async function POST(req: Request) {
  const supabase = supabaseService();

  const body = await req.json().catch(() => ({}));
  const itemId = body?.itemId as string | undefined;

  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  const cookieStore = await cookies();
  let voterKey = cookieStore.get("voter_key")?.value;
  if (!voterKey) voterKey = crypto.randomUUID();

  const { data: period, error: periodErr } = await supabase
    .rpc("current_period")
    .single<PeriodRow>();

  if (periodErr || !period) {
    return NextResponse.json(
      { error: periodErr?.message ?? "No active voting period." },
      { status: 403 }
    );
  }

  if (period.is_closed === true) {
    return NextResponse.json(
      { error: "Voting is closed for this period." },
      { status: 403 }
    );
  }

  const endValue = period.ends_at ?? period.end_at;
  if (!endValue) {
    return NextResponse.json(
      { error: "Current period has no end time (ends_at/end_at missing)." },
      { status: 500 }
    );
  }

  const endsAtMs = new Date(endValue).getTime();
  if (Number.isNaN(endsAtMs)) {
    return NextResponse.json(
      { error: "Current period end time is invalid." },
      { status: 500 }
    );
  }

  if (Date.now() >= endsAtMs) {
    return NextResponse.json(
      { error: "Voting for this week has ended." },
      { status: 403 }
    );
  }

  const { error: voteErr } = await supabase.from("votes").insert({
    item_id: itemId,
    period_id: period.id,
    voter_key: voterKey,
  });

  const res =
    (voteErr as any)?.code === "23505"
      ? NextResponse.json({ ok: true, alreadyVoted: true, period })
      : voteErr
      ? NextResponse.json({ error: voteErr.message }, { status: 500 })
      : NextResponse.json({ ok: true, alreadyVoted: false, period });

  if (!cookieStore.get("voter_key")?.value) {
    res.cookies.set("voter_key", voterKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}
