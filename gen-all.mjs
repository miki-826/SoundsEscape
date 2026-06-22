#!/usr/bin/env node
// gen-all.mjs — sound escape 用 UI 画像を gpt-image-2 (medium) でまとめて生成する。
// 既存ファイルはスキップして課金を抑える。標準出力に結果を出す。
import { writeFile, mkdir, access } from "node:fs/promises";
import { dirname } from "node:path";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("ERROR: OPENAI_API_KEY が未設定です");
  process.exit(1);
}

const COMMON =
  "Top-down sonar radar console aesthetic of a 1980s submarine sonar station fused with an industrial robot teleoperation terminal and an old CRT scope. Pitch black background, neon green phosphor glow, faint scanlines and vignette, dusty scratched dark metal. No text, no letters, no watermark, no UI labels. Cinematic, high detail, game asset.";

const JOBS = [
  {
    out: "public/images/ui/scope-bg.png",
    size: "1536x1024",
    prompt:
      "Circular sonar radar scope screen seen straight on. Concentric green range rings and faint bearing tick marks, a soft rotating sweep beam, subtle hexagonal grid, dark teal-black gradient. The very center is mostly empty dark space reserved for overlaying game graphics. " +
      COMMON,
  },
  {
    out: "public/images/ui/title-bg.png",
    size: "1536x1024",
    prompt:
      "Moody title-screen background: the silhouette of a deserted nighttime hardware-store aisle (tall metal shelving, scattered boxes) revealed only as faint green sonar wireframe outlines emerging from total darkness, expanding circular sound waves rippling outward, heavy vignette, empty darker band across the center for a title overlay. " +
      COMMON,
  },
  {
    out: "public/images/ui/emblem.png",
    size: "1024x1024",
    prompt:
      "Emblem badge of a fictional 'Night Lost-and-Found Bureau': a circular engraved metal insignia containing concentric sonar sound waves and a small recovered-item silhouette at its core, surrounded by bearing ticks, embossed dark gunmetal with neon green edge lighting, centered on transparent-friendly solid black background, symmetrical, crisp. " +
      COMMON,
  },
  {
    out: "public/images/ui/primary-control.png",
    size: "1024x1024",
    prompt:
      "A single rectangular industrial push-button cap, no text, seen straight on, centered. Dark brushed metal frame with a beveled glowing green inner surface, clear raised edge and a pressable face, mechanical rivets at corners, the flat center safe to stretch. Solid black background. control skin, button face material. " +
      COMMON,
  },
  {
    out: "public/images/ui/secondary-control.png",
    size: "1024x1024",
    prompt:
      "A single rectangular recessed industrial switch panel cap, no text, centered. Darker matte metal with a faint green hairline edge, subtly sunken inset face, minimal glow, the flat center safe to stretch. Solid black background. secondary control skin. " +
      COMMON,
  },
  {
    out: "public/images/ui/mission-panel.png",
    size: "1536x1024",
    prompt:
      "Texture of a printed work-order plate riveted onto dark metal: a faint green dot-matrix printed grid and faint form lines like an official dispatch document, scratched gunmetal, screw heads in the corners, mostly empty so text can overlay, low contrast. No readable text. " +
      COMMON,
  },
  {
    out: "public/images/ui/item-toolbox.png",
    size: "1024x1024",
    prompt:
      "A silver metal toolbox seen from a top-down sonar scan, rendered as a glowing amber-yellow double-ringed sonar echo with bright wireframe outline against pitch black, isolated centered object, distinct from green surroundings. amber item echo. " +
      COMMON,
  },
  {
    out: "public/images/ui/ghost.png",
    size: "1024x1024",
    prompt:
      "A menacing ghost rendered as a magenta-and-red noisy distorted humanoid silhouette made of glitch static and scan interference, semi-transparent, dripping noise, centered on pitch black, unsettling, no face details. magenta danger entity. " +
      COMMON,
  },
  {
    out: "public/images/ui/robot.png",
    size: "1024x1024",
    prompt:
      "A small four-wheeled retrieval robot seen from directly above (top-down), compact industrial chassis with a sensor dome and a single glowing green eye, a bright central marker pulse beneath it, rendered as a clean green sonar blip with crisp wireframe, centered on pitch black. robot unit marker. " +
      COMMON,
  },
  {
    out: "public/images/ui/result-bg.png",
    size: "1536x1024",
    prompt:
      "A full bright radar sweep illuminating an entire circular scope at once, the whole hardware-store floor plan briefly revealed in glowing green wireframe at the moment of mission completion, brighter and clearer than usual, concentric rings, darker calmer edges for overlaying a result panel. " +
      COMMON,
  },
];

let generated = 0;
const results = [];
for (const job of JOBS) {
  try {
    await access(job.out);
    console.log("SKIP (exists): " + job.out);
    results.push({ out: job.out, status: "skip" });
    continue;
  } catch {}
  process.stdout.write("GEN " + job.out + " ... ");
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: job.prompt,
        size: job.size,
        quality: "medium",
        n: 1,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.log("FAIL " + res.status);
      results.push({ out: job.out, status: "fail", error: `${res.status} ${t.slice(0, 200)}` });
      continue;
    }
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      console.log("FAIL no-data");
      results.push({ out: job.out, status: "fail", error: "no b64" });
      continue;
    }
    await mkdir(dirname(job.out), { recursive: true });
    await writeFile(job.out, Buffer.from(b64, "base64"));
    generated++;
    console.log("OK");
    results.push({ out: job.out, status: "ok" });
  } catch (e) {
    console.log("ERROR " + e.message);
    results.push({ out: job.out, status: "error", error: e.message });
  }
}
console.log("\n=== generated this run: " + generated + " ===");
console.log(JSON.stringify(results, null, 2));
