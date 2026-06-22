"use client";
import { useEffect, useRef, useState } from "react";
import { Engine, EngineInput, HudState } from "@/lib/engine";
import type { AudioEngine } from "@/lib/audio";
import type { GameMap, Mode } from "@/lib/types";
import { GaugeBar, ActionButton } from "./ui";

const GHOST_LABEL: Record<string, string> = {
  patrol: "徘徊",
  investigate: "調査",
  chase: "追跡",
  attack: "攻撃",
};

export function PlayScreen({
  map,
  audio,
  mode,
  demo,
  sensitivity,
  onEnd,
  onAbort,
}: {
  map: GameMap;
  audio: AudioEngine;
  mode: Mode;
  demo: boolean;
  sensitivity: number;
  onEnd: (e: Engine) => void;
  onAbort: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const keys = useRef<Record<string, boolean>>({});
  const pingQueued = useRef(false);
  const manual = mode === "manual";

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const engine = new Engine(map, audio, manual, demo);
    (window as unknown as { __engine: Engine }).__engine = engine;

    const resize = () => {
      const wrap = wrapRef.current!;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    let hudT = 0;
    let ended = false;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!pausedRef.current && !engine.ended) {
        const k = keys.current;
        const voice = manual ? 0 : audio.level(sensitivity);
        const input: EngineInput = {
          up: !!(k["w"] || k["arrowup"]),
          down: !!(k["s"] || k["arrowdown"]),
          left: !!(k["a"] || k["arrowleft"]),
          right: !!(k["d"] || k["arrowright"]),
          boost: !!k["shift"],
          interact: !!k["e"],
          voice,
          manualPing: pingQueued.current,
        };
        pingQueued.current = false;
        engine.update(dt, input);
      }

      const wrap = wrapRef.current!;
      engine.render(ctx, wrap.clientWidth, wrap.clientHeight);

      hudT += dt;
      if (hudT > 0.08) {
        hudT = 0;
        setHud(engine.hud());
      }

      if (engine.ended && !ended) {
        ended = true;
        cancelAnimationFrame(raf);
        setTimeout(() => onEnd(engine), 900);
      }
    };
    raf = requestAnimationFrame(loop);

    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key))
        e.preventDefault();
      if (key === "escape") {
        setPaused((p) => !p);
        return;
      }
      if (key === " ") pingQueued.current = true;
      keys.current[key === " " ? "space" : key] = true;
    };
    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keys.current[key === " " ? "space" : key] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const time = hud?.timeLeft ?? (demo ? 90 : 180);
  const mm = Math.floor(time / 60);
  const ss = Math.floor(time % 60);

  const setKey = (k: string, v: boolean) => (keys.current[k] = v);
  const holdProps = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      setKey(k, true);
    },
    onPointerUp: () => setKey(k, false),
    onPointerLeave: () => setKey(k, false),
    onPointerCancel: () => setKey(k, false),
  });

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg">
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>

      {/* HUD: 左上ステータス */}
      <div className="pointer-events-none absolute left-3 top-3 w-44 space-y-2">
        <GaugeBar label="耐久値 HP" value={hud?.hp ?? 100} color="accent" />
        <GaugeBar label="バッテリー" value={hud?.battery ?? 100} color="item" />
        <GaugeBar label="騒音 NOISE" value={(hud?.noise ?? 0) * 100} color="danger" />
      </div>

      {/* HUD: 右上 */}
      <div className="absolute right-3 top-3 w-40 space-y-2">
        <div className="rivets panel-edge rounded-md bg-panel/80 px-3 py-2 text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">残り時間</div>
          <div
            className={`font-title text-2xl font-bold ${time < 20 ? "text-danger text-glow-danger" : "text-accent text-glow"}`}
          >
            {mm}:{ss.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="pointer-events-none">
          <GaugeBar label="幽霊警戒" value={(hud?.awareness ?? 0) * 100} color="danger" />
          <div className="mt-1 text-right font-mono text-[10px] tracking-widest text-danger">
            {GHOST_LABEL[hud?.ghostState ?? "patrol"]}
          </div>
        </div>
        <div className="pointer-events-none rounded border border-line bg-black/50 px-2 py-1 text-right font-mono text-[10px] tracking-widest">
          <span className={hud?.carrying ? "text-item text-glow-item" : "text-muted"}>
            {hud?.carrying ? "● 回収済み" : "○ 未回収"}
          </span>
        </div>
      </div>

      {/* メッセージ */}
      {hud?.message && (
        <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded border border-accent/50 bg-black/70 px-4 py-1.5 text-center font-mono text-xs tracking-wide text-accent text-glow">
          {hud.message}
        </div>
      )}

      {/* 下部コントロール */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
        <div className="hidden font-mono text-[10px] leading-relaxed tracking-wide text-muted sm:block">
          <div>移動: WASD / 矢印{!manual && " ・ 声で前進"}</div>
          <div>Ping: Space{manual ? "" : " / 声"} ・ 回収: E ・ Esc: 一時停止</div>
          <div className="text-accent/80">
            MIC: {manual ? "手動モード" : hud?.micActive ? "稼働中（音量のみ）" : "—"}
          </div>
        </div>

        {/* モバイル用十字キー */}
        <div className="grid grid-cols-3 grid-rows-2 gap-1 sm:hidden">
          <span />
          <button {...holdProps("w")} className="rounded border border-line bg-panel/80 py-3 text-accent">▲</button>
          <span />
          <button {...holdProps("a")} className="rounded border border-line bg-panel/80 py-3 text-accent">◀</button>
          <button {...holdProps("s")} className="rounded border border-line bg-panel/80 py-3 text-accent">▼</button>
          <button {...holdProps("d")} className="rounded border border-line bg-panel/80 py-3 text-accent">▶</button>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <ActionButton variant="secondary" onClick={() => keys.current["e"] = true} onPointerUp={() => keys.current["e"] = false}>
              回収 E
            </ActionButton>
            <button
              onClick={() => (pingQueued.current = true)}
              className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent bg-panel/80 font-title text-sm font-bold tracking-wider text-accent transition-all hover:bg-panel active:translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style={{ boxShadow: `0 0 ${10 + (hud?.pingCd ?? 1) * 14}px rgba(57,255,158,${0.3 + (hud?.pingCd ?? 1) * 0.4})` }}
            >
              <span className="text-glow">PING</span>
              {(hud?.pingCd ?? 1) < 1 && (
                <span className="absolute inset-1 rounded-full border-2 border-accent/30" style={{ clipPath: `inset(${(1 - (hud?.pingCd ?? 1)) * 100}% 0 0 0)` }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {paused && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/85">
          <h2 className="font-title text-3xl font-bold tracking-widest text-accent text-glow">一時停止</h2>
          <div className="flex gap-3">
            <ActionButton variant="primary" onClick={() => setPaused(false)}>
              再開
            </ActionButton>
            <ActionButton variant="secondary" onClick={onAbort}>
              中断してタイトルへ
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
