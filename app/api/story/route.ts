import { NextResponse } from "next/server";
import { MOCK_STORY } from "@/lib/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HAS_KEY = !!process.env.OPENAI_API_KEY;

export async function POST() {
  if (!HAS_KEY) return NextResponse.json({ story: MOCK_STORY, source: "mock" });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 1.0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "あなたはホラー探索ゲーム『sound escape』の語り部。世界観: 深夜、停電した施設に幽霊が彷徨う。主人公は『夜間遺失物回収局』のオペレーターで、遠隔操作の回収ロボットを送り込み、声が生む音波だけを頼りに暗闇を探索して忘れ物を持ち帰る。光を点けると幽霊に位置を知られる。出力はJSONのみ。",
          },
          {
            role: "user",
            content:
              "ゲーム開始時に表示するオープニングのプロローグを書け。暗く詩的で緊張感のある日本語、150〜250字、改行で2〜4段落。最後は必ず『声を出さなければ、進めない。声を出すほど、何かが近づいてくる。』で締めること。次のJSONを返せ: {\"story\": 本文}",
          },
        ],
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) throw new Error("api");
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    const story =
      typeof parsed.story === "string" && parsed.story.trim().length > 30
        ? parsed.story.trim()
        : MOCK_STORY;
    return NextResponse.json({ story, source: "openai" });
  } catch {
    return NextResponse.json({ story: MOCK_STORY, source: "fallback" });
  }
}
