"use client";
import { useState } from "react";
import { ScreenShell, ActionButton, Emblem, Panel, Typewriter } from "./ui";
import { MOCK_STORY } from "@/lib/mock";

export function IntroScreen({ onDone }: { onDone: () => void }) {
  // オープニングは固定文（API不使用・即時表示）
  const story = MOCK_STORY;
  const [force, setForce] = useState(false);
  const [typed, setTyped] = useState(false);

  return (
    <ScreenShell bg="/images/ui/title-bg.png" className="items-center justify-center">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-center gap-3">
          <Emblem size={56} className="opacity-90" />
          <div className="text-left">
            <div className="font-title text-sm font-bold tracking-[0.3em] text-accent text-glow">
              夜間遺失物回収局
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
              incoming transmission
            </div>
          </div>
        </div>

        <Panel title="PROLOGUE / 通信記録">
          <div className="min-h-44 text-[15px] leading-loose text-text/95">
            <Typewriter
              text={story}
              speed={32}
              force={force}
              onDone={() => setTyped(true)}
            />
          </div>
        </Panel>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setForce(true)}
            disabled={typed}
            className="font-mono text-xs tracking-widest text-muted underline-offset-4 transition-colors hover:text-text disabled:opacity-30"
          >
            ▷▷ 全文表示
          </button>
          <ActionButton variant="primary" onClick={onDone} className="min-w-48">
            {typed ? "▶ 任務へ" : "スキップ ▶"}
          </ActionButton>
        </div>
      </div>
    </ScreenShell>
  );
}
