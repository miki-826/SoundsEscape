import { GameMap, MaterialType, Tile, TileType } from "./types";
import { hashSeed, makeRng } from "./rng";

const COLS = 40;
const ROWS = 28;
const TILE = 28;

function mat(type: TileType, rng: () => number): Tile {
  let material: MaterialType = "concrete";
  let reflection = 0;
  if (type === "wall") {
    material = "concrete";
    reflection = 0.85;
  } else if (type === "shelf") {
    // 金属棚 or 木製棚（材質で反響が変わる）
    if (rng() < 0.55) {
      material = "metal";
      reflection = 0.9;
    } else {
      material = "wood";
      reflection = 0.65;
    }
  } else {
    material = "concrete";
    reflection = 0.05;
  }
  return { type, material, reflection };
}

interface Room {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

function buildOnce(seedStr: string, demo: boolean): GameMap | null {
  const rng = makeRng(hashSeed(seedStr));
  const grid: Tile[][] = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) grid[r][c] = mat("wall", rng);
  }

  const carve = (x: number, y: number, t: TileType) => {
    if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1) return;
    grid[y][x] = mat(t, rng);
  };

  const rooms: Room[] = [];
  const count = demo ? 3 : 4 + Math.floor(rng() * 3); // 3 or 4-6
  for (let i = 0; i < count; i++) {
    const w = 5 + Math.floor(rng() * 5);
    const h = 4 + Math.floor(rng() * 4);
    const cx = 4 + Math.floor(rng() * (COLS - 8));
    const cy = 4 + Math.floor(rng() * (ROWS - 8));
    const room = { cx, cy, w, h };
    rooms.push(room);
    for (let y = cy - (h >> 1); y <= cy + (h >> 1); y++)
      for (let x = cx - (w >> 1); x <= cx + (w >> 1); x++) carve(x, y, "floor");
  }

  // 連続する部屋をL字通路（幅2）で接続 → 連結性を保証
  const corridor = (ax: number, ay: number, bx: number, by: number) => {
    let x = ax;
    let y = ay;
    while (x !== bx) {
      carve(x, y, "floor");
      carve(x, y + 1, "floor");
      x += x < bx ? 1 : -1;
    }
    while (y !== by) {
      carve(x, y, "floor");
      carve(x + 1, y, "floor");
      y += y < by ? 1 : -1;
    }
  };
  for (let i = 1; i < rooms.length; i++)
    corridor(rooms[i - 1].cx, rooms[i - 1].cy, rooms[i].cx, rooms[i].cy);

  // 棚（商品棚の列）を部屋内に置く。通路を完全に塞がないよう隙間を空ける。
  for (const room of rooms) {
    if (rng() < 0.35) continue;
    const vertical = rng() < 0.5;
    const gapAt = rng();
    if (vertical) {
      const x = room.cx + (rng() < 0.5 ? -1 : 1) * (1 + Math.floor(rng() * 2));
      for (let y = room.cy - (room.h >> 1) + 1; y <= room.cy + (room.h >> 1) - 1; y++) {
        if (Math.abs(y - (room.cy - (room.h >> 1) + 1) - gapAt * room.h) < 1.2) continue;
        if (grid[y]?.[x]?.type === "floor") carve(x, y, "shelf");
      }
    } else {
      const y = room.cy + (rng() < 0.5 ? -1 : 1) * (1 + Math.floor(rng() * 2));
      for (let x = room.cx - (room.w >> 1) + 1; x <= room.cx + (room.w >> 1) - 1; x++) {
        if (Math.abs(x - (room.cx - (room.w >> 1) + 1) - gapAt * room.w) < 1.2) continue;
        if (grid[y]?.[x]?.type === "floor") carve(x, y, "shelf");
      }
    }
  }

  const startRoom = rooms[0];
  // 忘れ物は入口から最も遠い部屋に置く（隣接して即クリアになるのを防ぐ）
  let itemRoom = rooms[rooms.length - 1];
  let far = -1;
  for (let i = 1; i < rooms.length; i++) {
    const d = Math.hypot(rooms[i].cx - startRoom.cx, rooms[i].cy - startRoom.cy);
    if (d > far) {
      far = d;
      itemRoom = rooms[i];
    }
  }
  const ghostRoom = rooms[Math.floor(rooms.length / 2)] ?? rooms[0];

  const sCell = { x: startRoom.cx, y: startRoom.cy };
  const iCell = { x: itemRoom.cx, y: itemRoom.cy };
  const gCell = { x: ghostRoom.cx, y: ghostRoom.cy };

  // 入口と忘れ物が近すぎる配置は破棄して再生成（探索の手応えを確保）
  const sep = Math.hypot(iCell.x - sCell.x, iCell.y - sCell.y);
  if (sep < (demo ? 9 : 13)) return null;

  carve(sCell.x, sCell.y, "exit");

  // 安全地帯（入口隣）
  carve(sCell.x + 1, sCell.y, "safeZone");

  // 危険床（呪い床）を通路にいくつか
  if (!demo) {
    const hazardN = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < hazardN; i++) {
      const x = 2 + Math.floor(rng() * (COLS - 4));
      const y = 2 + Math.floor(rng() * (ROWS - 4));
      if (
        grid[y][x].type === "floor" &&
        !(Math.abs(x - sCell.x) < 3 && Math.abs(y - sCell.y) < 3) &&
        !(Math.abs(x - iCell.x) < 2 && Math.abs(y - iCell.y) < 2)
      )
        carve(x, y, "hazard");
    }
  }

  // 到達可能性検証（BFS。歩行可能=wall/shelf以外）
  const walkable = (x: number, y: number) =>
    grid[y]?.[x] && grid[y][x].type !== "wall" && grid[y][x].type !== "shelf";
  const seen = new Set<number>();
  const q: [number, number][] = [[sCell.x, sCell.y]];
  seen.add(sCell.y * COLS + sCell.x);
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = ny * COLS + nx;
      if (!seen.has(k) && walkable(nx, ny)) {
        seen.add(k);
        q.push([nx, ny]);
      }
    }
  }
  if (!seen.has(iCell.y * COLS + iCell.x)) return null; // 忘れ物へ到達不能 → 再生成

  return {
    cols: COLS,
    rows: ROWS,
    tile: TILE,
    grid,
    start: { x: (sCell.x + 0.5) * TILE, y: (sCell.y + 0.5) * TILE },
    item: { x: (iCell.x + 0.5) * TILE, y: (iCell.y + 0.5) * TILE },
    ghost: { x: (gCell.x + 0.5) * TILE, y: (gCell.y + 0.5) * TILE },
    seed: seedStr,
  };
}

export function generateMap(seedStr: string, demo = false): GameMap {
  for (let i = 0; i < 24; i++) {
    const m = buildOnce(i === 0 ? seedStr : `${seedStr}#${i}`, demo);
    if (m) {
      m.seed = seedStr;
      return m;
    }
  }
  // 最終フォールバック：必ず1つ返す（無限ループ回避）
  return buildOnce(`${seedStr}#fallback-open`, true)!;
}

export function isBlocking(map: GameMap, px: number, py: number): boolean {
  const c = Math.floor(px / map.tile);
  const r = Math.floor(py / map.tile);
  const t = map.grid[r]?.[c];
  if (!t) return true;
  return t.type === "wall" || t.type === "shelf";
}
