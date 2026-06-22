"use client";
import { useEffect, useState } from "react";
import { ScreenShell, ActionButton, Panel } from "./ui";
import { topResults, StoredResult } from "@/lib/store";
import { HAS_SUPABASE } from "@/lib/supabase";

const RANK_COLOR: Record<string, string> = {
  S: "text-item text-glow-item",
  A: "text-accent text-glow",
  B: "text-accent text-glow",
  C: "text-muted",
  D: "text-danger text-glow-danger",
};

export function RankingScreen({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<StoredResult[] | null>(null);
  useEffect(() => {
    topResults(20).then(setBoard);
  }, []);

  return (
    <ScreenShell className="justify-center">
      <div className="mx-auto w-full max-w-2xl py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-title text-2xl font-bold tracking-[0.15em] text-accent text-glow">
            回収記録ランキング
          </h2>
          <span className="font-mono text-[10px] tracking-widest text-muted">
            {HAS_SUPABASE ? "ONLINE" : "この端末のみ"}
          </span>
        </div>

        <Panel title="TOP RECORDS">
          {board === null ? (
            <p className="animate-pulse-soft py-6 text-center font-mono text-sm text-muted">
              読み込み中…
            </p>
          ) : board.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              まだ記録がありません。回収を成功させて結果画面から登録してください。
            </p>
          ) : (
            <ol className="space-y-1.5 font-mono text-sm">
              {board.map((b, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 border-b border-line/40 py-1.5 last:border-0"
                >
                  <span className="w-7 shrink-0 text-right font-title text-base text-muted">
                    {i + 1}
                  </span>
                  <span className={`w-6 shrink-0 text-center font-title font-bold ${RANK_COLOR[b.rank]}`}>
                    {b.rank}
                  </span>
                  <span className="flex-1 truncate text-text">{b.name}</span>
                  <span className="hidden shrink-0 text-muted sm:inline">
                    {b.item_name}
                    {b.demo ? " (DEMO)" : ""}
                  </span>
                  <span className="w-12 shrink-0 text-right text-accent text-glow">{b.score}</span>
                </li>
              ))}
            </ol>
          )}
          {!HAS_SUPABASE && (
            <p className="mt-3 font-mono text-[10px] leading-relaxed tracking-wide text-muted">
              ※ オンラインで全員と共有するには、Vercelに NEXT_PUBLIC_SUPABASE_URL /
              NEXT_PUBLIC_SUPABASE_ANON_KEY を設定し supabase.sql を実行してください。
            </p>
          )}
        </Panel>

        <div className="mt-5 flex justify-center">
          <ActionButton variant="primary" onClick={onBack} className="min-w-48">
            ← タイトルへ
          </ActionButton>
        </div>
      </div>
    </ScreenShell>
  );
}
