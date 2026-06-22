#!/usr/bin/env node
// gen-image.mjs — OpenAI gpt-image-2 で画像を生成して保存する CLI
//
// 使い方:
//   export OPENAI_API_KEY="sk-..."
//   node gen-image.mjs "<プロンプト>" <出力パス> [サイズ] [品質]
//
// 例:
//   node gen-image.mjs "ファンタジー世界の地図、羊皮紙風、俯瞰、ゲームUI素材" \
//     public/images/map-bg.png 1536x1024 medium
//
// サイズ: 1024x1024 / 1536x1024 / 1024x1536 / auto
// 品質:   必ず medium を指定する（このプロジェクトのルール。未指定でも medium）
//
// 注意: gpt-image系APIは組織の本人確認(Verify Organization)が必要。
//       料金は高解像度で1枚あたり約$0.2前後。プロンプト→課金なので無駄打ち注意。

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const [, , prompt, outPath = "image.png", size = "1024x1024", quality = "medium"] =
  process.argv;

if (!prompt) {
  console.error(
    'Usage: node gen-image.mjs "<prompt>" <output.png> [size] [quality]'
  );
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("ERROR: 環境変数 OPENAI_API_KEY が設定されていません");
  process.exit(1);
}

const res = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-image-2",
    prompt,
    size,
    quality,
    n: 1,
  }),
});

if (!res.ok) {
  console.error(`API error ${res.status}:\n${await res.text()}`);
  process.exit(1);
}

const data = await res.json();
const b64 = data?.data?.[0]?.b64_json;
if (!b64) {
  console.error("画像データが返ってきませんでした:\n" + JSON.stringify(data, null, 2));
  process.exit(1);
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, Buffer.from(b64, "base64"));
console.log(outPath); // ← Claude がこのパスを受け取って img に組み込める
