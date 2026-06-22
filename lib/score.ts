export interface ScoreInput {
  success: boolean;
  hpLeft: number; // 0..100
  batteryLeft: number; // 0..100
  clearTimeSec: number;
  timeLimitSec: number;
  pings: number;
  hits: number; // 幽霊に発見/接触された回数
  manual: boolean;
}

export interface ScoreOutput {
  score: number;
  rank: "S" | "A" | "B" | "C" | "D";
  badge: string;
}

const BADGES_HIGH = ["静寂の回収屋", "人間ソナー", "夜間探査のプロ"];
const BADGES_MID = ["絶叫配達員", "ホームセンターの亡霊"];
const BADGES_LOW = ["幽霊のお得意様", "忘れ物より命が大事"];

export function computeScore(input: ScoreInput): ScoreOutput {
  if (!input.success) {
    return { score: 0, rank: "D", badge: "忘れ物より命が大事" };
  }
  // 回収・帰還成功 50 / 残り耐久 15 / クリア時間 15 / 音波効率 10 / 発見回数 5 / 残りバッテリー 5
  let score = 50;
  score += 15 * (input.hpLeft / 100);
  const timeRatio = Math.max(0, 1 - input.clearTimeSec / input.timeLimitSec);
  score += 15 * timeRatio;
  // 音波効率：少ないPingほど高い。20回で半減を目安。
  score += 10 * Math.max(0, 1 - input.pings / 40);
  score += 5 * Math.max(0, 1 - input.hits / 8);
  score += 5 * (input.batteryLeft / 100);

  if (input.manual) score *= 0.7; // 手動モードは倍率低下

  score = Math.round(Math.max(0, Math.min(100, score)));

  let rank: ScoreOutput["rank"];
  if (score >= 90) rank = "S";
  else if (score >= 75) rank = "A";
  else if (score >= 60) rank = "B";
  else if (score >= 40) rank = "C";
  else rank = "D";

  let badge: string;
  if (rank === "S" || rank === "A")
    badge = BADGES_HIGH[(input.pings + input.hits) % BADGES_HIGH.length];
  else if (rank === "B" || rank === "C")
    badge = BADGES_MID[input.pings % BADGES_MID.length];
  else badge = BADGES_LOW[input.hits % BADGES_LOW.length];

  return { score, rank, badge };
}
