export type MaterialType = "concrete" | "metal" | "wood";

export type TileType =
  | "floor"
  | "wall"
  | "shelf"
  | "exit"
  | "hazard"
  | "safeZone";

export interface Tile {
  type: TileType;
  material: MaterialType;
  /** 反射率 0..1（reflection） */
  reflection: number;
}

export interface GameMap {
  cols: number;
  rows: number;
  tile: number; // 1マスのピクセルサイズ
  grid: Tile[][]; // grid[row][col]
  start: { x: number; y: number }; // px（入口＝帰還地点）
  item: { x: number; y: number }; // px（忘れ物）
  ghost: { x: number; y: number }; // px（幽霊初期）
  seed: string;
}

export interface Mission {
  id: string;
  locationName: string;
  itemName: string;
  clientName: string;
  lastSeen: string;
  description: string;
  reward: string;
  difficulty: number; // 1..3
  seed: string;
}

export type Mode = "voice" | "manual";

export type Difficulty = "easy" | "normal" | "hard";

export interface RunResult {
  success: boolean;
  score: number;
  rank: "S" | "A" | "B" | "C" | "D";
  badge: string;
  clearTimeSec: number;
  hits: number;
  pings: number;
  maxVolume: number; // 0..1
  hpLeft: number;
  batteryLeft: number;
  seed: string;
  itemName: string;
  mode: Mode;
  demo: boolean;
  comment: string;
  createdAt: number;
}

export type Screen =
  | "intro"
  | "title"
  | "mission"
  | "calibration"
  | "play"
  | "result";
