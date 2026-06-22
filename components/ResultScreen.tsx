"use client";
import { useEffect, useState } from "react";
import { ScreenShell, ActionButton, Panel, Stat } from "./ui";
import { topResults, saveResult, StoredResult } from "@/lib/store";
import { HAS_SUPABASE } from "@/lib/supabase";
import type { RunResult } from "@/lib/types";

const RANK_COLOR: Record<string, string> = {
  S: "text-item text-glow-item",
  A: "text-accent text-glow",
  B: "text-accent text-glow",
  C: "text-muted",
  D: "text-danger text-glow-danger",
};

const NAME_KEY = "sound-escape:name";

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
  const [name, setName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) || "");
    topResults(8).then(setBoard);
  }, []);

  const register = async () => {
    const n = (name.trim() || "ANON").slice(0, 16);
    setSaving(true);
    localStorage.setItem(NAME_KEY, n);
    await saveResult(result, n);
    setRegistered(true);
    setSaving(false);
    setBoard(await topResults(8));
  };

  const time = `${Math.floor(result.clearTimeSec / 60)}:${Math.floor(result.clearTimeSec % 60)
    .toString()
    .padStart(2, "0")}`;

  return (
    <ScreenShell bg="/images/ui/result-bg.png" className="justify-center">
      <div className="mx-auto w-full max-w-3xl py-4">
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

        {/* ランキング登録 */}
        <div className="mt-4">
          <Panel title="ランキング登録 / REGISTER">
            {registered ? (
              <p className="text-sm text-accent text-glow">
                登録しました。{HAS_SUPABASE ? "オンラインランキングに反映されます。" : "この端末のランキングに記録しました。"}
              </p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={16}
                  placeholder="オペレーター名（16字まで）"
                  className="flex-1 rounded border border-line bg-black/60 px-3 py-2 font-mono text-sm text-text outline-none placeholder:text-muted/60 focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                />
                <ActionButton variant="primary" onClick={register} disabled={saving} className="min-w-40">
                  {saving ? "登録中…" : "ランキングに登録"}
                </ActionButton>
              </div>
            )}
            <p className="mt-2 font-mono text-[10px] tracking-widest text-muted">
              {HAS_SUPABASE
                ? "保存先: オンライン (Supabase) ＋ この端末"
                : "保存先: この端末 (LocalStorage)。オンライン共有にはSupabase設定が必要"}
            </p>
          </Panel>
        </div>

        {board.length > 0 && (
          <div className="mt-4">
            <Panel title="回収記録 / TOP RECORDS">
              <ol className="space-y-1 font-mono text-xs">
                {board.map((b, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-text/85">
                    <span className="truncate">
                      <span className="text-muted">{String(i + 1).padStart(2, "0")}.</span>{" "}
                      <span className="text-text">{b.name}</span>{" "}
                      <span className="text-muted">
                        ・ {b.rank} ・ {b.item_name}
                        {b.demo ? " (DEMO)" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-accent">{b.score}</span>
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
