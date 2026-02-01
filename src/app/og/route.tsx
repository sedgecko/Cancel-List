// src/app/og/route.tsx
import { ImageResponse } from "next/og";
import { supabaseAnon } from "@/lib/supabase";

export const runtime = "edge";

type ItemRow = {
  id: string | number;
  title: string | null;
  category: string | null;
  votes: number | null;
  created_at: string | null;
};

const WIDTH = 1200;
const HEIGHT = 630;

const baseStyle: React.CSSProperties = {
  width: `${WIDTH}px`,
  height: `${HEIGHT}px`,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "60px",
  background: "#0b0b0b",
  color: "white",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
};

export async function GET(_req: Request) {
  const supabase = supabaseAnon();

  const { data, error } = await supabase
    .from("items")
    .select("id,title,category,votes,created_at")
    .order("votes", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(5);

  // Always return a valid OG image even if DB fails
  if (error) {
    return new ImageResponse(
      (
        <div style={baseStyle}>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: -1 }}>
            The Cancel List
          </div>

          <div style={{ marginTop: 14, fontSize: 30, opacity: 0.85 }}>
            Top 5 • Vote at /s
          </div>

          <div style={{ marginTop: 26, fontSize: 22, opacity: 0.7 }}>
            OG image failed to load items.
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    );
  }

  const items: ItemRow[] = (data as ItemRow[] | null) ?? [];

  return new ImageResponse(
    (
      <div style={baseStyle}>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: -1 }}>
          The Cancel List
        </div>

        <div style={{ marginTop: 14, fontSize: 30, opacity: 0.85, fontWeight: 600 }}>
          Top 5 • Vote at /s
        </div>

        {items.length === 0 ? (
          <div style={{ marginTop: 28, fontSize: 28, opacity: 0.8 }}>
            No votes yet — be the first.
          </div>
        ) : (
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
            {items.map((it, idx) => {
              const title = it.title ?? "Untitled";
              const votes = it.votes ?? 0;
              const category = it.category ?? "";

              return (
                <div
                  key={String(it.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 18px",
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      fontWeight: 800,
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.18)",
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                      style={{
                        fontSize: 30,
                        fontWeight: 800,
                        lineHeight: 1.1,
                        maxWidth: 980,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {title}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 20, opacity: 0.75 }}>
                      {category ? `${category} • ` : ""}
                      {votes} vote{votes === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 26, fontSize: 20, opacity: 0.7 }}>
          Share this link to vote
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
