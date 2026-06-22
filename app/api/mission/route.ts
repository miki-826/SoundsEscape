import { NextResponse } from "next/server";
import { buildMockMission } from "@/lib/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HAS_KEY = !!process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  const { seed = "SEED", difficulty } = await req.json().catch(() => ({}));
  const mock = buildMockMission(seed, difficulty);

  if (!HAS_KEY) {
    return NextResponse.json({
      description: mock.description,
      locationName: mock.locationName,
    });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.9,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "あなたはホラー回収ゲーム『sound escape』の管制システム。深夜の停電したホームセンターへロボットを送る依頼文を生成する。出力はJSONのみ。",
          },
          {
            role: "user",
            content: `回収対象は「${mock.itemName}」、危険度${mock.difficulty}。次のJSONを返せ: {"locationName": ステージ名20字以内, "description": 依頼文80字以内・暗く緊張感のある日本語}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("api");
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    return NextResponse.json({
      locationName: parsed.locationName || mock.locationName,
      description: parsed.description || mock.description,
    });
  } catch {
    return NextResponse.json({
      description: mock.description,
      locationName: mock.locationName,
    });
  }
}
