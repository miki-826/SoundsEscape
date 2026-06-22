"use client";
import dynamic from "next/dynamic";

const Game = dynamic(() => import("@/components/Game"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <span className="animate-pulse-soft font-mono text-xs uppercase tracking-[0.4em] text-muted">
        SYSTEM BOOTING…
      </span>
    </div>
  ),
});

export default function Home() {
  return <Game />;
}
