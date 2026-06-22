"use client";
import { useEffect, useRef, useState } from "react";
import { ScreenShell, ActionButton, Panel } from "./ui";
import type { AudioEngine } from "@/lib/audio";

export function MicCalibration({
  audio,
  onProceed,
  onManual,
  onBack,
}: {
  audio: AudioEngine;
  onProceed: (sensitivity: number) => void;
  onManual: () => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "calibrating" | "ready" | "denied">("idle");
  const [sensitivity, setSensitivity] = useState(1);
  const [level, setLevel] = useState(0);
  const [floor, setFloor] = useState(audio.noiseFloor);
  const sensRef = useRef(1);
  sensRef.current = sensitivity;

  useEffect(() => {
    let raf = 0;
    let alive = true;
    (async () => {
      await audio.resume();
      const ok = await audio.requestMic();
      if (!alive) return;
      if (!ok) {
        setStatus("denied");
        return;
      }
      setStatus("calibrating");
      const f = await audio.calibrateNoiseFloor(1500);
      if (!alive) return;
      setFloor(f);
      setStatus("ready");
      const loop = () => {
        setLevel(audio.level(sensRef.current));
        raf = requestAnimationFrame(loop);
      };
      loop();
    })();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [audio]);

  const pct = Math.round(level * 100);
  const band = level >= 0.6 ? "大声" : level >= 0.28 ? "標準" : level > 0.06 ? "小声" : "無音";

  return (
    <ScreenShell className="justify-center">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="mb-4 font-title text-2xl font-bold tracking-[0.15em] text-accent text-glow">
          マイク・キャリブレーション
        </h2>
        <Panel title="INPUT LEVEL / SENSOR CALIBRATION">
          {status === "denied" ? (
            <div className="space-y-4 text-sm text-text/90">
              <p className="text-danger text-glow-danger">マイクを利用できませんでした。</p>
              <p>手動モード（疑似動力＋手動Ping）に切り替えて、そのままプレイできます。</p>
              <div className="flex justify-end gap-3">
                <ActionButton variant="secondary" onClick={onBack}>
                  ← 戻る
                </ActionButton>
                <ActionButton variant="primary" onClick={onManual}>
                  手動モードで投入
                </ActionButton>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="mb-1 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                  <span>入力音量</span>
                  <span className="text-accent text-glow">{band} ・ {pct}%</span>
                </div>
                <div className="relative h-6 w-full overflow-hidden rounded border border-line bg-black/70">
                  <div
                    className="h-full transition-[width] duration-75"
                    style={{
                      width: `${pct}%`,
                      background: level >= 0.6 ? "var(--danger)" : "var(--accent)",
                      boxShadow: "0 0 12px currentColor",
                    }}
                  />
                  <div className="absolute left-[28%] top-0 h-full w-px bg-accent/40" />
                  <div className="absolute left-[60%] top-0 h-full w-px bg-danger/50" />
                </div>
                <div className="mt-1 font-mono text-[10px] tracking-widest text-muted">
                  ノイズフロア: {floor.toFixed(3)}{" "}
                  {status === "calibrating" && <span className="animate-pulse-soft">測定中…</span>}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                  <span>感度</span>
                  <span className="text-accent">{sensitivity.toFixed(2)}×</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  className="slider w-full"
                  style={{ ["--val" as string]: `${((sensitivity - 0.5) / 1.5) * 100}%` }}
                />
              </div>

              <p className="font-mono text-[10px] leading-relaxed tracking-wide text-muted">
                ※ 端末内で音量(RMS)のみを測定しています。音声は録音・保存・送信されません。
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <ActionButton variant="secondary" onClick={() => audio.sfx("ping")}>
                  テストPing ♪
                </ActionButton>
                <div className="flex gap-3">
                  <ActionButton variant="secondary" onClick={onBack}>
                    ← 戻る
                  </ActionButton>
                  <ActionButton
                    variant="primary"
                    disabled={status !== "ready"}
                    onClick={() => onProceed(sensitivity)}
                    className="min-w-40"
                  >
                    現場へ投入
                  </ActionButton>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </ScreenShell>
  );
}
