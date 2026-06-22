"use client";
import { useEffect, useState } from "react";
import { ScreenShell, ActionButton, Panel, Stat } from "./ui";
import { topResults, StoredResult } from "@/lib/store";
import type { RunResult } from "@/lib/types";

const RANK_COLOR: Record<string, string> = {
  S: "text-item text-glow-item",
  A: "text-accent text-glow",
  B: "text-accent text-glow",
  C: "text-muted",
  D: "text-danger text-glow-danger",
};

export function ResultScreen({
  result,
  onRetry,
  onTitle,
}: {
  result: RunResult;
  onRetry: () => void;
  onTitle: () => void;
}) {
  const [board, setBoard] = useState<StoredResult[]>([]);
  useEffect(() => {
    topResults(5).then(setBoard);
  }, []);

  const time = `${Math.floor(result.clearTimeSec / 60)}:${Math.floor(result.clearTimeSec % 60)
    .toString()
    .padStart(2, "0")}`;

  return (
    <ScreenShell bg="/images/ui/result-bg.png" className="justify-center">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-center justify-center gap-3">
          {result.demo && (
            <span className="rounded border border-danger/60 px-2 py-1 font-mono text-[10px] tracking-widest text-danger">
              DEMO MODE
            </span>
          )}
          <h2
            className={`font-title text-4xl font-black tracking-[0.15em] ${result.success ? "text-accent text-glow" : "text-danger text-glow-danger"}`}
          >
            {result.success ? "回収成功" : "回収失敗"}
          </h2>
        </div>

        <Panel>
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex flex-col items-center justify-center gap-1 sm:w-44">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">RANK</div>
              <div className={`font-title text-7xl font-black ${RANK_COLOR[result.rank]}`}>
                {result.rank}
              </div>
              <div className="font-title text-3xl font-bold text-accent text-glow">{result.score}</div>
              <div className="font-mono text-[10px] tracking-widest text-muted">/ 100</div>
              <div className="mt-2 rounded border border-item/50 px-3 py-1 text-center text-sm text-item text-glow-item">
                {result.badge}
              </div>
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <Stat label="回収対象" value={<span className="text-sm">{result.itemName}</span>} accent="item" />
                <Stat label="クリア時間" value={time} />
                <Stat label="残り耐久" value={`${result.hpLeft}`} />
                <Stat label="被弾回数" value={`${result.hits}`} accent="danger" />
                <Stat label="Ping回数" value={`${result.pings}`} />
                <Stat label="最大声量" value={`${Math.round(result.maxVolume * 100)}%`} />
              </div>
              <div className="mt-4 border-t border-line/70 pt-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                  管制官コメント
                </div>
                <p className="mt-1 text-sm leading-relaxed text-text/90">{result.comment}</p>
              </div>
            </div>
          </div>
        </Panel>

        {board.length > 0 && (
          <div className="mt-4">
            <Panel title="回収記録 / TOP RECORDS">
              <ol className="space-y-1 font-mono text-xs">
                {board.map((b, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-text/85">
                    <span className="text-muted">
                      {String(i + 1).padStart(2, "0")} ・ {b.rank} ・ {b.item_name}
                      {b.demo ? " (DEMO)" : ""}
                    </span>
                    <span className="text-accent">{b.score}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <ActionButton variant="secondary" onClick={onTitle}>
            タイトルへ
          </ActionButton>
          <div className="text-center font-mono text-[10px] tracking-widest text-muted">
            SEED: {result.seed}
          </div>
          <ActionButton variant="primary" onClick={onRetry} className="min-w-40">
            もう一度
          </ActionButton>
        </div>
      </div>
    </ScreenShell>
  );
}
