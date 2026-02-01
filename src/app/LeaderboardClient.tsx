"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  title: string;
  category: string | null;
  votes: number;
};

type Period = {
  id: string;
  is_closed: boolean;
  ends_at: string | null;
};

function formatRemaining(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

/**
 * Rank styling:
 *  1: gold + "flame" vibe
 *  2: red-orange
 *  3: strong red
 *  4-10: green -> blue gradient fading toward neutral by 10
 */
function getRankStyle(rank: number) {
  if (rank === 1) {
    return {
      border: "1px solid rgba(255, 215, 0, 0.65)",
      background:
        "linear-gradient(90deg, rgba(255, 140, 0, 0.12) 0%, rgba(255, 215, 0, 0.10) 40%, rgba(255, 255, 255, 0.04) 100%)",
      boxShadow:
        "0 0 0 1px rgba(255, 215, 0, 0.20), 0 10px 30px rgba(255, 140, 0, 0.10)",
      badgeBg: "rgba(255, 215, 0, 0.16)",
      badgeBorder: "1px solid rgba(255, 215, 0, 0.55)",
      badgeText: "rgba(255, 235, 160, 1)",
      flair: "🔥",
    };
  }

  if (rank === 2) {
    return {
      border: "1px solid rgba(255, 120, 50, 0.55)",
      background:
        "linear-gradient(90deg, rgba(255, 80, 0, 0.10) 0%, rgba(255, 140, 0, 0.08) 45%, rgba(255, 255, 255, 0.04) 100%)",
      boxShadow:
        "0 0 0 1px rgba(255, 120, 50, 0.16), 0 10px 26px rgba(255, 80, 0, 0.08)",
      badgeBg: "rgba(255, 120, 50, 0.12)",
      badgeBorder: "1px solid rgba(255, 120, 50, 0.40)",
      badgeText: "rgba(255, 190, 155, 1)",
      flair: "🔥",
    };
  }

  if (rank === 3) {
    return {
      border: "1px solid rgba(255, 60, 60, 0.55)",
      background:
        "linear-gradient(90deg, rgba(255, 35, 35, 0.10) 0%, rgba(255, 60, 60, 0.06) 55%, rgba(255, 255, 255, 0.04) 100%)",
      boxShadow:
        "0 0 0 1px rgba(255, 60, 60, 0.14), 0 10px 24px rgba(255, 35, 35, 0.07)",
      badgeBg: "rgba(255, 60, 60, 0.10)",
      badgeBorder: "1px solid rgba(255, 60, 60, 0.40)",
      badgeText: "rgba(255, 185, 185, 1)",
      flair: "🔥",
    };
  }

  // 4-10: green -> blue fade, with alpha fading down
  const t = Math.min(1, Math.max(0, (rank - 4) / 6)); // 4=>0, 10=>1

  const green = { r: 60, g: 255, b: 160 };
  const blue = { r: 80, g: 160, b: 255 };
  const mix = (a: number, b: number, tt: number) =>
    Math.round(a + (b - a) * tt);

  const r = mix(green.r, blue.r, t);
  const g = mix(green.g, blue.g, t);
  const b = mix(green.b, blue.b, t);

  const fadeAlpha = 0.40 - t * 0.32; // 4~0.40 -> 10~0.08

  return {
    border: `1px solid rgba(${r}, ${g}, ${b}, ${fadeAlpha})`,
    background: `linear-gradient(90deg, rgba(${r}, ${g}, ${b}, ${
      fadeAlpha * 0.22
    }) 0%, rgba(255,255,255,0.04) 85%)`,
    boxShadow: `0 0 0 1px rgba(${r}, ${g}, ${b}, ${
      fadeAlpha * 0.10
    }), 0 8px 20px rgba(0,0,0,0.22)`,
    badgeBg: `rgba(${r}, ${g}, ${b}, ${fadeAlpha * 0.18})`,
    badgeBorder: `1px solid rgba(${r}, ${g}, ${b}, ${fadeAlpha * 0.55})`,
    badgeText: `rgba(${r}, ${g}, ${b}, ${Math.min(1, fadeAlpha + 0.25)})`,
    flair: rank <= 5 ? "✨" : "",
  };
}

const neutralStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  boxShadow: "none",
  badgeBg: "rgba(255,255,255,0.06)",
  badgeBorder: "1px solid rgba(255,255,255,0.14)",
  badgeText: "rgba(255,255,255,0.75)",
  flair: "",
};

export default function LeaderboardClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);

  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [votingLocked, setVotingLocked] = useState<boolean>(false);

  const periodEndMs = useMemo(() => {
    if (!period?.ends_at) return null;
    const ms = new Date(period.ends_at).getTime();
    return Number.isNaN(ms) ? null : ms;
  }, [period]);

  async function load() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/leaderboard", { cache: "no-store" });
    const json = await res.json();

    if (!res.ok) {
      setError(json?.error ?? "Failed to load leaderboard");
      setLoading(false);
      return;
    }

    setItems(json.items ?? []);
    setPeriod(json.period ?? null);
    setLoading(false);
  }

  async function vote(itemId: string) {
    if (votingLocked) {
      setMessage(null);
      setError("Voting is closed right now.");
      return;
    }

    setVotingId(itemId);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json?.error ?? "Vote failed");
      setVotingId(null);
      return;
    }

    // Refresh leaderboard FIRST (so UI updates)
    await load();

    // Then show message (so it doesn't get cleared by load)
    if (json?.alreadyVoted) setMessage("1 vote per week!");
    else setMessage("Vote counted!");

    setVotingId(null);
  }

  // ✅ Step 3: Copy share link button
  async function copyShareLink() {
    try {
      const url = `${window.location.origin}/s`;
      await navigator.clipboard.writeText(url);
      setError(null);
      setMessage("Share link copied! Paste it anywhere.");
    } catch {
      setError("Could not copy. Try manually copying /s after your URL.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!period || period.is_closed || !periodEndMs) {
      setVotingLocked(true);
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const r = Math.max(0, periodEndMs - Date.now());
      setRemainingMs(r);
      setVotingLocked(r <= 0 || period.is_closed);
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [period, periodEndMs]);

  const visible = items.slice(0, 15); // Top 10 + 5 runner-ups

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 8 }}>
        The Cancel List
      </h1>

      <p style={{ opacity: 0.8, marginBottom: 12 }}>
        Vote + live ranking (weekly)
      </p>

      {/* Share button */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={copyShareLink}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.06)",
            cursor: "pointer",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          Copy share link
        </button>

        <div style={{ opacity: 0.7, alignSelf: "center" }}>
          Shares <span style={{ fontVariantNumeric: "tabular-nums" }}>/s</span> (shows Top 5 + “Click to vote”)
        </div>
      </div>

      {/* Countdown / lock banner */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 12,
          opacity: 0.95,
        }}
      >
        {votingLocked ? (
          <div>
            <strong>Voting is closed.</strong>{" "}
            <span style={{ opacity: 0.85 }}>Come back for the next period.</span>
          </div>
        ) : (
          <div>
            <strong>Voting ends in:</strong>{" "}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatRemaining(remainingMs)}
            </span>
          </div>
        )}
      </div>

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 12,
            opacity: 0.9,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 12,
          }}
        >
          Error: {error}
        </div>
      )}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {visible.map((item, idx) => {
            const rank = idx + 1;
            const isTop10 = rank <= 10;
            const s = isTop10 ? getRankStyle(rank) : neutralStyle;

            return (
              <div key={item.id}>
                {rank === 11 && (
                  <div
                    style={{
                      margin: "18px 2px 8px",
                      fontSize: 12,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      opacity: 0.7,
                    }}
                  >
                    Runner-ups
                  </div>
                )}

                <div
                  style={{
                    border: s.border,
                    background: s.background,
                    boxShadow: s.boxShadow,
                    borderRadius: 14,
                    padding: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    opacity: votingLocked ? 0.8 : 1,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        opacity: 0.85,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: s.badgeBg,
                          border: s.badgeBorder,
                          color: s.badgeText,
                          fontWeight: 700,
                        }}
                      >
                        {s.flair ? `${s.flair} ` : ""}
                        #{rank}
                      </span>

                      <span style={{ opacity: 0.7 }}>
                        {item.category ? `${item.category} • ` : ""}
                        {item.votes} vote{item.votes === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        letterSpacing: 0.2,
                        marginTop: 4,
                        opacity: isTop10 ? 1 : 0.92,
                      }}
                    >
                      {item.title}
                    </div>
                  </div>

                  <button
                    onClick={() => vote(item.id)}
                    disabled={votingLocked || votingId === item.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.25)",
                      background: "rgba(255,255,255,0.06)",
                      cursor:
                        votingLocked || votingId === item.id
                          ? "not-allowed"
                          : "pointer",
                      whiteSpace: "nowrap",
                      opacity: votingLocked ? 0.6 : 1,
                      fontWeight: 700,
                    }}
                  >
                    {votingLocked
                      ? "Voting closed"
                      : votingId === item.id
                      ? "Voting…"
                      : "Vote to cancel"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
