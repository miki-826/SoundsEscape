import { NextResponse } from "next/server";
import { mockComment } from "@/lib/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HAS_KEY = !!process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  const {
    success = false,
    rank = "C",
    score = 0,
    hits = 0,
    pings = 0,
  } = await req.json().catch(() => ({}));
  const fallback = mockComment(success, rank);

  if (!HAS_KEY) return NextResponse.json({ comment: fallback });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "あなたは夜間遺失物回収局の冷静な管制官。回収ロボットのオペレーターへ短い講評を述べる。出力はJSONのみ。音声データは一切受け取っていない。",
          },
          {
            role: "user",
            content: `結果: ${success ? "成功" : "失敗"}, ランク${rank}, スコア${score}, 被弾${hits}回, Ping${pings}回。次のJSONを返せ: {"comment": 120字以内の日本語の講評}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("api");
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    return NextResponse.json({ comment: parsed.comment || fallback });
  } catch {
    return NextResponse.json({ comment: fallback });
  }
}
