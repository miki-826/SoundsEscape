import { Difficulty } from "./types";

export interface DiffConfig {
  key: Difficulty;
  label: string;
  desc: string;
  timeSec: number; // 非DEMO時の制限時間
  ghostSpeedMul: number;
  damageMul: number;
  awarenessMul: number;
}

export const DIFFICULTIES: Record<Difficulty, DiffConfig> = {
  easy: {
    key: "easy",
    label: "易しい",
    desc: "幽霊は遅く、被弾も軽い。じっくり探索向け。",
    timeSec: 240,
    ghostSpeedMul: 0.68,
    damageMul: 0.55,
    awarenessMul: 0.6,
  },
  normal: {
    key: "normal",
    label: "普通",
    desc: "標準のバランス。",
    timeSec: 180,
    ghostSpeedMul: 0.85,
    damageMul: 0.9,
    awarenessMul: 0.9,
  },
  hard: {
    key: "hard",
    label: "難しい",
    desc: "幽霊は速く、声に鋭く反応する。静寂が命。",
    timeSec: 150,
    ghostSpeedMul: 1.05,
    damageMul: 1.2,
    awarenessMul: 1.3,
  },
};

export function diffConfig(d: Difficulty): DiffConfig {
  return DIFFICULTIES[d] ?? DIFFICULTIES.normal;
}
