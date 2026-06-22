import { GameMap } from "./types";
import { isBlocking } from "./mapgen";
import { AudioEngine } from "./audio";

export interface EngineInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
  interact: boolean;
  voice: number; // 0..1 正規化済み声量
  manualPing: boolean; // 手動Ping要求（Space/ボタン）
}

export interface HudState {
  hp: number;
  battery: number;
  noise: number; // 0..1
  timeLeft: number;
  carrying: boolean;
  awareness: number; // 0..1 幽霊警戒
  pings: number;
  hits: number;
  maxVolume: number;
  micActive: boolean;
  ghostState: string;
  message: string;
  pingCd: number; // 0..1 (1=発射可能)
}

type RevealKind = "floor" | "wall" | "shelf" | "hazard" | "item" | "exit";

interface Ray {
  x: number[];
  y: number[];
  cum: number[];
  total: number;
  blocked: boolean;
}

interface PendingReveal {
  idx: number;
  dist: number;
  kind: RevealKind;
  level: number;
}

interface Ping {
  t0: number;
  speed: number;
  life: number;
  energy: number;
  big: boolean;
  rays: Ray[];
  reveals: PendingReveal[];
  ptr: number; // 処理済みreveal index
}

const REVEAL_MS: Record<RevealKind, number> = {
  floor: 1800,
  wall: 3200,
  shelf: 3000,
  hazard: 4000,
  item: 3200,
  exit: 5000,
};

const WAVE_SPEED = 520; // px/s
const STEP = 5;
const MAX_BOUNCE = 2;
const RAY_COUNT = 120;
const MIN_ENERGY = 0.05;
const ROBOT_R = 8;

export class Engine {
  map: GameMap;
  audio: AudioEngine;
  demo: boolean;
  manual: boolean;

  robot: { x: number; y: number; hp: number; battery: number; speed: number };
  carrying = false;
  ghost: {
    x: number;
    y: number;
    state: "patrol" | "investigate" | "chase" | "attack";
    awareness: number;
    target: { x: number; y: number };
    level: number;
    visibleUntil: number;
  };
  itemVisibleUntil = 0;

  timeLeft: number;
  pings = 0;
  hits = 0;
  maxVolume = 0;
  ended = false;
  result: { success: boolean } | null = null;

  private revealUntil: Float64Array;
  private revealLevel: Float32Array;
  private revealKind: Uint8Array;
  private pingList: Ping[] = [];
  private moveEnergy = 0;
  private smoothVoice = 0;
  private noise = 0;
  private cooldownUntil = 0;
  private sustain = 0;
  private sustainPeak = 0;
  private attackTimer = 0;
  hitFlash = 0;
  pickupFlash = 0;
  clearFlash = 0;
  message = "";
  private messageUntil = 0;

  constructor(map: GameMap, audio: AudioEngine, manual: boolean, demo: boolean) {
    this.map = map;
    this.audio = audio;
    this.manual = manual;
    this.demo = demo;
    this.robot = {
      x: map.start.x,
      y: map.start.y,
      hp: 100,
      battery: 100,
      speed: 140,
    };
    this.ghost = {
      x: map.ghost.x,
      y: map.ghost.y,
      state: "patrol",
      awareness: 0,
      target: { ...map.ghost },
      level: 0,
      visibleUntil: 0,
    };
    this.timeLeft = demo ? 90 : 180;
    const n = map.cols * map.rows;
    this.revealUntil = new Float64Array(n);
    this.revealLevel = new Float32Array(n);
    this.revealKind = new Uint8Array(n);
    this.flash("回収を開始する。声で音波を出せ。", 3000);
  }

  private idx(c: number, r: number) {
    return r * this.map.cols + c;
  }

  private flash(msg: string, ms: number) {
    this.message = msg;
    this.messageUntil = performance.now() + ms;
  }

  private cellKind(c: number, r: number): RevealKind | null {
    const t = this.map.grid[r]?.[c];
    if (!t) return null;
    if (t.type === "wall") return "wall";
    if (t.type === "shelf") return "shelf";
    if (t.type === "hazard") return "hazard";
    if (t.type === "exit") return "exit";
    return "floor";
  }

  // ---- ピング ----
  castPing(volume: number) {
    const now = performance.now();
    if (now < this.cooldownUntil) return;
    this.cooldownUntil = now + 650;
    this.pings++;
    const big = volume >= 0.6;
    const small = volume < 0.28 && !this.manual;
    const energy = big ? 1.0 : small ? 0.5 : 0.78;
    const maxLen = big ? 460 : small ? 220 : 340;
    this.audio.sfx(big ? "pingBig" : "ping");

    const reveals = new Map<number, PendingReveal>();
    const rays: Ray[] = [];
    for (let i = 0; i < RAY_COUNT; i++) {
      const a = (i / RAY_COUNT) * Math.PI * 2;
      rays.push(this.castRay(a, energy, maxLen, reveals));
    }
    const revealArr = [...reveals.values()].sort((p, q) => p.dist - q.dist);
    this.pingList.push({
      t0: now,
      speed: WAVE_SPEED,
      life: 1.5,
      energy,
      big,
      rays,
      reveals: revealArr,
      ptr: 0,
    });

    // 幽霊への音の到達（壁で減衰）
    const gd = Math.hypot(this.ghost.x - this.robot.x, this.ghost.y - this.robot.y);
    const hearRange = big ? 520 : 360;
    if (gd < hearRange) {
      const occluded = this.segmentBlocked(
        this.robot.x,
        this.robot.y,
        this.ghost.x,
        this.ghost.y
      );
      const recv = energy * (1 - gd / hearRange) * (occluded ? 0.35 : 1);
      this.ghost.awareness = Math.min(1, this.ghost.awareness + recv * 0.9);
      this.ghost.target = { x: this.robot.x, y: this.robot.y };
    }
  }

  private castRay(
    angle: number,
    energy0: number,
    maxLen: number,
    reveals: Map<number, PendingReveal>
  ): Ray {
    const tile = this.map.tile;
    let dx = Math.cos(angle);
    let dy = Math.sin(angle);
    let px = this.robot.x;
    let py = this.robot.y;
    let cum = 0;
    let energy = energy0;
    let bounce = 0;
    let remaining = maxLen;
    const xs = [px];
    const ys = [py];
    const cums = [0];
    let lastCell = -1;

    const addReveal = (cx: number, cy: number, dist: number, lvl: number) => {
      const kind = this.cellKind(cx, cy);
      if (!kind) return;
      const id = this.idx(cx, cy);
      const ex = reveals.get(id);
      const level = lvl * energy;
      if (!ex || dist < ex.dist) reveals.set(id, { idx: id, dist, kind, level });
      else if (level > ex.level) ex.level = level;
    };

    while (remaining > 0) {
      const ox = px;
      const oy = py;
      px += dx * STEP;
      py += dy * STEP;
      cum += STEP;
      remaining -= STEP;

      if (px < 0 || py < 0 || px >= this.map.cols * tile || py >= this.map.rows * tile)
        break;

      const cx = Math.floor(px / tile);
      const cy = Math.floor(py / tile);
      const cellId = this.idx(cx, cy);

      if (isBlocking(this.map, px, py)) {
        // 反射軸の判定
        const blockX = isBlocking(this.map, px, oy);
        const blockY = isBlocking(this.map, ox, py);
        addReveal(cx, cy, cum, 0.95);
        xs.push(ox);
        ys.push(oy);
        cums.push(cum);
        bounce++;
        if (bounce > MAX_BOUNCE || energy < MIN_ENERGY) {
          return { x: xs, y: ys, cum: cums, total: cum, blocked: true };
        }
        if (blockX && !blockY) dx = -dx;
        else if (blockY && !blockX) dy = -dy;
        else {
          dx = -dx;
          dy = -dy;
        }
        const refl = this.map.grid[cy]?.[cx]?.reflection ?? 0.7;
        energy *= refl * 0.78;
        px = ox;
        py = oy;
        continue;
      }

      if (cellId !== lastCell) {
        lastCell = cellId;
        addReveal(cx, cy, cum, 0.35); // 通過した床を淡く照らす
        // 忘れ物・幽霊の検知
        if (
          !this.carrying &&
          Math.hypot(px - this.map.item.x, py - this.map.item.y) < tile
        ) {
          this.itemVisibleUntil = performance.now() + 1600;
        }
        if (Math.hypot(px - this.ghost.x, py - this.ghost.y) < tile * 1.1) {
          this.ghost.visibleUntil = performance.now() + 500;
        }
      }
    }
    xs.push(px);
    ys.push(py);
    cums.push(cum);
    return { x: xs, y: ys, cum: cums, total: cum, blocked: false };
  }

  /** 2点間が壁/棚で遮られるか（粗い） */
  private segmentBlocked(ax: number, ay: number, bx: number, by: number): boolean {
    const d = Math.hypot(bx - ax, by - ay);
    const n = Math.ceil(d / (this.map.tile * 0.4));
    for (let i = 1; i < n; i++) {
      const x = ax + ((bx - ax) * i) / n;
      const y = ay + ((by - ay) * i) / n;
      if (isBlocking(this.map, x, y)) return true;
    }
    return false;
  }

  // ---- 更新 ----
  update(dt: number, input: EngineInput) {
    if (this.ended) return;
    const now = performance.now();

    // 声量・ノイズ
    this.smoothVoice += (input.voice - this.smoothVoice) * Math.min(1, dt * 12);
    this.maxVolume = Math.max(this.maxVolume, input.voice);

    // 自動Ping（声）/ 手動Ping
    if (input.manualPing) {
      this.castPing(this.manual ? 0.5 : Math.max(0.5, input.voice));
    } else if (!this.manual) {
      if (input.voice >= 0.2) {
        this.sustain += dt;
        this.sustainPeak = Math.max(this.sustainPeak, input.voice);
        if (this.sustain >= 0.16) {
          this.castPing(this.sustainPeak);
          this.sustain = 0;
          this.sustainPeak = 0;
        }
      } else {
        this.sustain = 0;
        this.sustainPeak = 0;
      }
    }

    // 移動
    let dirx = 0;
    let diry = 0;
    if (input.up) diry -= 1;
    if (input.down) diry += 1;
    if (input.left) dirx -= 1;
    if (input.right) dirx += 1;
    const moving = dirx !== 0 || diry !== 0;

    // 発声必須ルール（音動力）
    if (this.manual) {
      this.moveEnergy = moving ? 0.5 : 0;
    } else {
      if (input.voice > 0.06) this.moveEnergy = 0.5;
      else this.moveEnergy = Math.max(0, this.moveEnergy - dt);
    }

    let speedFactor = this.manual
      ? 0.78
      : 0.45 + Math.min(1, this.smoothVoice) * 1.05;
    if (this.carrying) speedFactor *= 0.82; // 運搬で減速
    const onHazard =
      this.tileAt(this.robot.x, this.robot.y) === "hazard";
    if (onHazard) speedFactor *= 0.6;
    const boosting = input.boost && this.robot.battery > 0;
    if (boosting) speedFactor *= 1.7;

    if (moving && this.moveEnergy > 0) {
      const len = Math.hypot(dirx, diry) || 1;
      const sp = this.robot.speed * speedFactor;
      const nx = this.robot.x + (dirx / len) * sp * dt;
      const ny = this.robot.y + (diry / len) * sp * dt;
      if (!this.circleBlocked(nx, this.robot.y)) this.robot.x = nx;
      if (!this.circleBlocked(this.robot.x, ny)) this.robot.y = ny;
      this.robot.battery = Math.max(
        0,
        this.robot.battery - (boosting ? 12 : 2.2) * dt
      );
      this.noise = Math.min(1, this.noise + dt * 0.6);
    } else {
      this.noise = Math.max(0, this.noise - dt * 1.2);
    }
    this.noise = Math.max(this.noise, this.smoothVoice);

    // 危険床ダメージ
    if (onHazard) {
      this.robot.hp = Math.max(0, this.robot.hp - 9 * dt);
      const id = this.cellIdxAt(this.robot.x, this.robot.y);
      if (id >= 0) {
        this.revealUntil[id] = now + REVEAL_MS.hazard;
        this.revealKind[id] = 4;
        this.revealLevel[id] = 1;
      }
    }

    // 忘れ物 取得
    if (
      !this.carrying &&
      Math.hypot(this.robot.x - this.map.item.x, this.robot.y - this.map.item.y) <
        20
    ) {
      this.itemVisibleUntil = now + 1200;
      if (input.interact) {
        this.carrying = true;
        this.pickupFlash = now;
        this.audio.sfx("pickup");
        this.ghost.level++;
        this.ghost.awareness = Math.min(1, this.ghost.awareness + 0.25);
        this.flash("忘れ物を回収。入口へ戻れ。幽霊が活性化した。", 3500);
        const eid = this.cellIdxAt(this.map.start.x, this.map.start.y);
        if (eid >= 0) {
          this.revealUntil[eid] = now + 8000;
          this.revealKind[eid] = 5;
          this.revealLevel[eid] = 1;
        }
      } else if (now > this.messageUntil) {
        this.flash("[E] で回収", 600);
      }
    }

    // 帰還＝クリア
    if (
      this.carrying &&
      Math.hypot(this.robot.x - this.map.start.x, this.robot.y - this.map.start.y) <
        22
    ) {
      this.endGame(true);
      return;
    }

    this.updateGhost(dt, now);
    this.processPings(now);

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.flash("時間切れ。", 2000);
      this.endGame(false);
      return;
    }
    if (this.robot.hp <= 0) {
      this.flash("機体大破。", 2000);
      this.endGame(false);
      return;
    }
    if (this.robot.battery <= 0 && this.carrying) {
      // バッテリー切れで帰還不能
      this.flash("バッテリー切れ。帰還不能。", 2000);
      this.endGame(false);
      return;
    }
  }

  private updateGhost(dt: number, now: number) {
    const g = this.ghost;
    // 警戒の自然減衰
    g.awareness = Math.max(0, g.awareness - dt * (g.state === "chase" ? 0.02 : 0.07));

    const dRobot = Math.hypot(this.robot.x - g.x, this.robot.y - g.y);
    const los = !this.segmentBlocked(g.x, g.y, this.robot.x, this.robot.y);
    const sightRange = 150 + g.level * 40;

    // 状態遷移
    if (dRobot < 22) g.state = "attack";
    else if ((los && dRobot < sightRange) || g.awareness > 0.78) {
      g.state = "chase";
      g.target = { x: this.robot.x, y: this.robot.y };
    } else if (g.awareness > 0.32) g.state = "investigate";
    else if (g.state !== "patrol" && g.awareness < 0.12) {
      g.state = "patrol";
      g.target = this.randomWalkable();
    }

    let speed = 0;
    if (g.state === "patrol") {
      speed = 46;
      if (Math.hypot(g.target.x - g.x, g.target.y - g.y) < 18)
        g.target = this.randomWalkable();
    } else if (g.state === "investigate") {
      speed = 86;
    } else if (g.state === "chase") {
      speed = (130 + g.level * 12) * (this.demo ? 0.8 : 1);
      g.visibleUntil = Math.max(g.visibleUntil, now + 120);
    } else if (g.state === "attack") {
      speed = 60;
      g.visibleUntil = Math.max(g.visibleUntil, now + 200);
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackTimer = 0.5;
        this.robot.hp = Math.max(0, this.robot.hp - (this.demo ? 12 : 16));
        this.hits++;
        this.hitFlash = now;
        this.audio.sfx("hit");
      }
    }

    if (speed > 0 && g.state !== "attack") {
      this.moveGhost(g, speed, dt);
    } else if (g.state === "attack") {
      this.moveGhost(g, speed, dt);
    }

    // 接近音
    if (dRobot < 180 && Math.random() < dt * (g.state === "chase" ? 2.2 : 0.5)) {
      this.audio.sfx("ghost", Math.max(0.2, 1 - dRobot / 180));
    }
  }

  private moveGhost(
    g: { x: number; y: number; target: { x: number; y: number } },
    speed: number,
    dt: number
  ) {
    const tx = g.target.x - g.x;
    const ty = g.target.y - g.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = g.x + (tx / len) * speed * dt;
    const ny = g.y + (ty / len) * speed * dt;
    // 幽霊は壁では止まるが、軸ずらしで回り込む
    if (!isBlocking(this.map, nx, g.y)) g.x = nx;
    else if (!isBlocking(this.map, g.x, ny)) g.y = ny;
    if (!isBlocking(this.map, g.x, ny)) g.y = ny;
    else if (!isBlocking(this.map, nx, g.y)) g.x = nx;
  }

  private processPings(now: number) {
    for (const p of this.pingList) {
      const radius = ((now - p.t0) / 1000) * p.speed;
      while (p.ptr < p.reveals.length && p.reveals[p.ptr].dist <= radius) {
        const rv = p.reveals[p.ptr++];
        const dur = REVEAL_MS[rv.kind];
        const until = now + dur;
        if (until > this.revealUntil[rv.idx]) {
          this.revealUntil[rv.idx] = until;
          this.revealKind[rv.idx] = this.kindCode(rv.kind);
          this.revealLevel[rv.idx] = Math.max(this.revealLevel[rv.idx] * 0.5, rv.level);
        }
        if (rv.kind === "wall" || rv.kind === "shelf") this.audio.sfx("reflect", 0.3);
      }
    }
    this.pingList = this.pingList.filter((p) => (now - p.t0) / 1000 < p.life);
  }

  private kindCode(k: RevealKind): number {
    return { floor: 0, wall: 1, shelf: 2, exit: 5, item: 3, hazard: 4 }[k];
  }

  private endGame(success: boolean) {
    this.ended = true;
    this.result = { success };
    this.audio.sfx(success ? "clear" : "fail");
    if (success) this.clearFlash = performance.now();
  }

  private tileAt(px: number, py: number): string {
    const c = Math.floor(px / this.map.tile);
    const r = Math.floor(py / this.map.tile);
    return this.map.grid[r]?.[c]?.type ?? "wall";
  }
  private cellIdxAt(px: number, py: number): number {
    const c = Math.floor(px / this.map.tile);
    const r = Math.floor(py / this.map.tile);
    if (!this.map.grid[r]?.[c]) return -1;
    return this.idx(c, r);
  }

  private circleBlocked(px: number, py: number): boolean {
    const r = ROBOT_R;
    return (
      isBlocking(this.map, px - r, py) ||
      isBlocking(this.map, px + r, py) ||
      isBlocking(this.map, px, py - r) ||
      isBlocking(this.map, px, py + r)
    );
  }

  private randomWalkable(): { x: number; y: number } {
    for (let i = 0; i < 30; i++) {
      const c = 1 + Math.floor(Math.random() * (this.map.cols - 2));
      const r = 1 + Math.floor(Math.random() * (this.map.rows - 2));
      const t = this.map.grid[r][c].type;
      if (t !== "wall" && t !== "shelf")
        return { x: (c + 0.5) * this.map.tile, y: (r + 0.5) * this.map.tile };
    }
    return { x: this.robot.x, y: this.robot.y };
  }

  hud(): HudState {
    const now = performance.now();
    return {
      hp: Math.round(this.robot.hp),
      battery: Math.round(this.robot.battery),
      noise: this.noise,
      timeLeft: Math.max(0, this.timeLeft),
      carrying: this.carrying,
      awareness: this.ghost.awareness,
      pings: this.pings,
      hits: this.hits,
      maxVolume: this.maxVolume,
      micActive: this.audio.micActive,
      ghostState: this.ghost.state,
      message: now < this.messageUntil ? this.message : "",
      pingCd: Math.max(0, Math.min(1, 1 - (this.cooldownUntil - now) / 650)),
    };
  }

  // ---- 描画 ----
  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const now = performance.now();
    const tile = this.map.tile;

    // カメラ（ロボット中心、マップ内にクランプ）
    const mapW = this.map.cols * tile;
    const mapH = this.map.rows * tile;
    let camX = this.robot.x - w / 2;
    let camY = this.robot.y - h / 2;
    camX = Math.max(0, Math.min(camX, Math.max(0, mapW - w)));
    camY = Math.max(0, Math.min(camY, Math.max(0, mapH - h)));

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#04060a";
    ctx.fillRect(0, 0, w, h);

    // 被弾グリッチ（画面揺れ）
    let shx = 0;
    let shy = 0;
    if (now - this.hitFlash < 350) {
      const k = 1 - (now - this.hitFlash) / 350;
      shx = (Math.random() - 0.5) * 10 * k;
      shy = (Math.random() - 0.5) * 10 * k;
    }
    ctx.save();
    ctx.translate(-camX + shx, -camY + shy);

    // 薄いグリッド
    ctx.strokeStyle = "rgba(57,255,158,0.04)";
    ctx.lineWidth = 1;
    const c0 = Math.floor(camX / tile);
    const c1 = Math.ceil((camX + w) / tile);
    const r0 = Math.floor(camY / tile);
    const r1 = Math.ceil((camY + h) / tile);
    ctx.beginPath();
    for (let c = c0; c <= c1; c++) {
      ctx.moveTo(c * tile, camY);
      ctx.lineTo(c * tile, camY + h);
    }
    for (let r = r0; r <= r1; r++) {
      ctx.moveTo(camX, r * tile);
      ctx.lineTo(camX + w, r * tile);
    }
    ctx.stroke();

    // 既知タイル（残像。古いほど暗く）
    for (let r = Math.max(0, r0); r <= Math.min(this.map.rows - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(this.map.cols - 1, c1); c++) {
        const id = this.idx(c, r);
        const until = this.revealUntil[id];
        if (until <= now) continue;
        const kind = this.revealKind[id];
        const dur =
          kind === 1 ? 3200 : kind === 2 ? 3000 : kind === 4 ? 4000 : kind === 5 ? 5000 : 1800;
        const remain = (until - now) / dur;
        const a = Math.max(0, Math.min(1, remain)) * (0.35 + this.revealLevel[id] * 0.65);
        const x = c * tile;
        const y = r * tile;
        if (kind === 1 || kind === 2) {
          // 壁・棚の輪郭
          ctx.strokeStyle =
            kind === 2 ? `rgba(120,255,200,${a})` : `rgba(57,255,158,${a * 0.9})`;
          ctx.lineWidth = kind === 2 ? 2 : 1.5;
          ctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
          ctx.fillStyle = `rgba(20,80,55,${a * 0.25})`;
          ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
        } else if (kind === 4) {
          // 危険床（赤紫の脈動）
          const pulse = 0.5 + 0.5 * Math.sin(now / 180);
          ctx.fillStyle = `rgba(176,38,255,${a * (0.25 + pulse * 0.4)})`;
          ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
          ctx.strokeStyle = `rgba(255,61,110,${a})`;
          ctx.strokeRect(x + 3, y + 3, tile - 6, tile - 6);
        } else if (kind === 5) {
          // 出入口マーカー（点滅）
          const blink = 0.5 + 0.5 * Math.sin(now / 220);
          ctx.fillStyle = `rgba(57,255,158,${a * (0.25 + blink * 0.5)})`;
          ctx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
          ctx.strokeStyle = `rgba(180,255,220,${a})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, tile - 4, tile - 4);
        } else {
          // 床
          ctx.fillStyle = `rgba(24,70,52,${a * 0.5})`;
          ctx.fillRect(x, y, tile, tile);
        }
      }
    }

    // 音波（欠けながら広がる円）
    for (const p of this.pingList) {
      const elapsed = (now - p.t0) / 1000;
      const radius = elapsed * p.speed;
      const fade = Math.max(0, 1 - elapsed / p.life);
      const base = p.big ? 0.9 : 0.7;
      ctx.lineWidth = p.big ? 2.4 : 1.6;
      ctx.beginPath();
      let started = false;
      let prevX = 0;
      let prevY = 0;
      for (let i = 0; i <= p.rays.length; i++) {
        const ray = p.rays[i % p.rays.length];
        const pt = radius <= ray.total ? pointAt(ray, radius) : null;
        if (pt) {
          if (started && Math.hypot(pt.x - prevX, pt.y - prevY) < tile * 1.6) {
            ctx.lineTo(pt.x, pt.y);
          } else {
            ctx.moveTo(pt.x, pt.y);
          }
          prevX = pt.x;
          prevY = pt.y;
          started = true;
        } else {
          started = false;
        }
      }
      ctx.strokeStyle = `rgba(57,255,158,${base * fade})`;
      ctx.stroke();
    }

    // 忘れ物（黄色の二重反響）
    if (!this.carrying && now < this.itemVisibleUntil) {
      const a = Math.min(1, (this.itemVisibleUntil - now) / 1600);
      const pulse = (now / 400) % 1;
      ctx.strokeStyle = `rgba(255,211,78,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.map.item.x, this.map.item.y, 6 + pulse * 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.map.item.x, this.map.item.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(234,255,176,${a})`;
      ctx.fill();
    }

    // 幽霊（赤紫ノイズ）
    if (now < this.ghost.visibleUntil) {
      const a = Math.min(1, (this.ghost.visibleUntil - now) / 400);
      ctx.save();
      ctx.translate(this.ghost.x, this.ghost.y);
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rr = Math.random() * 13;
        ctx.fillStyle = `rgba(${255},${Math.floor(Math.random() * 60)},${Math.floor(
          110 + Math.random() * 140
        )},${a * (0.4 + Math.random() * 0.6)})`;
        ctx.fillRect(Math.cos(ang) * rr, Math.sin(ang) * rr - 6, 3, 6);
      }
      ctx.strokeStyle = `rgba(255,61,110,${a})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ロボット（中央の明るいマーカー）
    const rx = this.robot.x;
    const ry = this.robot.y;
    const grd = ctx.createRadialGradient(rx, ry, 0, rx, ry, 26);
    grd.addColorStop(0, "rgba(57,255,158,0.5)");
    grd.addColorStop(1, "rgba(57,255,158,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(rx, ry, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.carrying ? "#ffd34e" : "#9affd0";
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(180,255,220,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rx, ry, 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // クリア時の全面走査
    if (this.clearFlash && now - this.clearFlash < 1200) {
      const k = (now - this.clearFlash) / 1200;
      ctx.fillStyle = `rgba(57,255,158,${0.25 * (1 - k)})`;
      ctx.fillRect(0, 0, w, h);
    }
    // 被弾の赤フラッシュ
    if (now - this.hitFlash < 250) {
      ctx.fillStyle = `rgba(255,61,110,${0.22 * (1 - (now - this.hitFlash) / 250)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

function pointAt(ray: Ray, s: number): { x: number; y: number } | null {
  if (s > ray.total) return null;
  for (let i = 1; i < ray.cum.length; i++) {
    if (s <= ray.cum[i]) {
      const seg = ray.cum[i] - ray.cum[i - 1] || 1;
      const t = (s - ray.cum[i - 1]) / seg;
      return {
        x: ray.x[i - 1] + (ray.x[i] - ray.x[i - 1]) * t,
        y: ray.y[i - 1] + (ray.y[i] - ray.y[i - 1]) * t,
      };
    }
  }
  return { x: ray.x[ray.x.length - 1], y: ray.y[ray.y.length - 1] };
}
