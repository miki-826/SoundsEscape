"use client";
import { useState } from "react";
import { ScreenShell, ActionButton, Emblem, Panel } from "./ui";
import { DIFFICULTIES } from "@/lib/difficulty";
import type { Difficulty, Mode } from "@/lib/types";

const DIFF_ORDER: Difficulty[] = ["easy", "normal", "hard"];

export function TitleScreen({
  onStart,
  onDemo,
}: {
  onStart: (mode: Mode, difficulty: Difficulty) => void;
  onDemo: (difficulty: Difficulty) => void;
}) {
  const [howto, setHowto] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  return (
    <ScreenShell bg="/images/ui/title-bg.png" className="items-center justify-center text-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-7">
        <Emblem size={132} className="flicker drop-shadow-[0_0_24px_rgba(57,255,158,0.35)]" />
        <div>
          <h1 className="font-title text-5xl font-black tracking-[0.1em] text-accent text-glow sm:text-7xl">
            SOUND ESCAPE
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.45em] text-muted sm:text-sm">
            夜間遺失物回収局 ・ 音波探索回収記録
          </p>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-text/90">
          声を出さなければ進めない。声を出すほど、何かが近づいてくる。
          <br />
          暗闇のホームセンターで、音波だけを頼りに忘れ物を持ち帰れ。
        </p>

        {/* 難易度セレクター */}
        <div className="w-full max-w-md">
          <div className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-muted">
            難易度
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DIFF_ORDER.map((d) => {
              const cfg = DIFFICULTIES[d];
              const active = difficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  aria-pressed={active}
                  className={`rounded-md border px-3 py-2 font-title text-sm font-bold tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    active
                      ? "border-accent bg-accent/15 text-accent text-glow"
                      : "border-line bg-panel/70 text-muted hover:border-accent/50 hover:text-text"
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center font-mono text-[10px] leading-relaxed text-muted">
            {DIFFICULTIES[difficulty].desc} ・ 制限 {DIFFICULTIES[difficulty].timeSec}s
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <ActionButton
            variant="primary"
            onClick={() => onStart("voice", difficulty)}
            className="min-w-64 text-base"
          >
            回収を開始する
          </ActionButton>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ActionButton variant="secondary" onClick={() => onStart("manual", difficulty)}>
              手動モードで遊ぶ
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => setHowto(true)}>
              遊び方
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => onDemo(difficulty)}>
              DEMO（90秒）
            </ActionButton>
          </div>
        </div>

        <p className="max-w-sm font-mono text-[10px] leading-relaxed tracking-wide text-muted">
          ※ マイクは「音量」だけを端末内で測定します。音声の録音・保存・送信は一切行いません。
        </p>
      </div>

      {howto && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setHowto(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
            <Panel title="遊び方 / OPERATION MANUAL">
              <ul className="space-y-2 text-sm text-text/90">
                <li>
                  <b className="text-accent">WASD / 矢印</b> で移動。声を出していない間も動ける。
                </li>
                <li>
                  <b className="text-accent">声 / Space</b> で音波(Ping)を出すと、当たった壁・棚・床・忘れ物が一時的に光る。声が大きいほど遠くまで見え・速く動けるが、幽霊に気づかれやすい。
                </li>
                <li>
                  <b className="text-item">忘れ物</b>（黄色の二重反響）に近づき <b>E</b> で回収。
                </li>
                <li>
                  <b className="text-danger">幽霊</b> は大きな音に反応して近づく。接触で耐久値が減る。
                </li>
                <li>回収して<b className="text-accent">入口</b>へ戻ればクリア。大声ほど遠くまで見えるが危険。</li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ActionButton variant="secondary" onClick={() => setHowto(false)}>
                  閉じる
                </ActionButton>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
