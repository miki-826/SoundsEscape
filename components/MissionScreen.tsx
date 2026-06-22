"use client";
import { useEffect, useState } from "react";
import { ScreenShell, ActionButton, Panel, Stat } from "./ui";
import { buildMockMission } from "@/lib/mock";
import type { Mission, Mode } from "@/lib/types";

const DANGER_LABEL = ["", "低", "中", "高"];

export function MissionScreen({
  seed,
  mode,
  demo,
  onProceed,
  onBack,
}: {
  seed: string;
  mode: Mode;
  demo: boolean;
  onProceed: (m: Mission) => void;
  onBack: () => void;
}) {
  const [mission, setMission] = useState<Mission>(() => buildMockMission(seed));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fallback = buildMockMission(seed);
    setMission(fallback);
    setLoading(true);
    fetch("/api/mission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed, difficulty: fallback.difficulty }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setMission({ ...fallback, ...d, seed });
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [seed]);

  return (
    <ScreenShell className="justify-center">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-title text-2xl font-bold tracking-[0.15em] text-accent text-glow">
            業務指示書
          </h2>
          {demo && (
            <span className="rounded border border-danger/60 px-2 py-1 font-mono text-[10px] tracking-widest text-danger">
              DEMO MODE
            </span>
          )}
        </div>

        <Panel bg="/images/ui/mission-panel.png">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="flex shrink-0 items-center justify-center sm:w-44">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/ui/item-toolbox.png"
                alt="回収対象の音波エコー"
                className="h-36 w-36 object-contain drop-shadow-[0_0_18px_rgba(255,211,78,0.35)]"
              />
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-4">
                <Stat label="依頼人" value={<span className="text-base">{mission.clientName}</span>} />
                <Stat label="ステージ" value={<span className="text-base">{mission.locationName}</span>} />
                <Stat label="回収対象" value={<span className="text-item text-glow-item">{mission.itemName}</span>} accent="item" />
                <Stat label="危険度" value={DANGER_LABEL[mission.difficulty] ?? "中"} accent="danger" />
                <Stat label="報酬" value={mission.reward} />
                <Stat label="制限時間" value={`${demo ? 90 : 180}s`} />
              </div>
              <div className="mt-4 border-t border-line/70 pt-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                  最終確認場所
                </div>
                <p className="mt-1 text-sm text-text/90">
                  {loading ? (
                    <span className="animate-pulse-soft text-muted">指示書を受信中…</span>
                  ) : (
                    mission.description
                  )}
                </p>
                <p className="mt-1 text-xs text-muted">{mission.lastSeen}</p>
              </div>
            </div>
          </div>
        </Panel>

        <div className="mt-5 flex items-center justify-between">
          <ActionButton variant="secondary" onClick={onBack}>
            ← 戻る
          </ActionButton>
          <ActionButton variant="primary" onClick={() => onProceed(mission)} className="min-w-48">
            {mode === "voice" ? "マイク設定へ" : "現場へ投入"}
          </ActionButton>
        </div>
        <p className="mt-3 text-center font-mono text-[10px] tracking-widest text-muted">
          SEED: {seed} ・ MODE: {mode === "voice" ? "VOICE" : "MANUAL"}
        </p>
      </div>
    </ScreenShell>
  );
}
