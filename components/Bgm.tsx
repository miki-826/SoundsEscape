"use client";
import { useEffect, useRef, useState } from "react";

export function Bgm({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) el.volume = 0.28; // マイク誤検出を避けるため低音量
    const start = () => {
      ref.current
        ?.play()
        .then(() => setOn(true))
        .catch(() => {});
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (on) el.pause();
    else el.play().catch(() => {});
    setOn(!on);
  };

  return (
    <>
      <audio ref={ref} src={src} loop preload="auto" />
      <button
        onClick={toggle}
        aria-label={on ? "BGMを止める" : "BGMを鳴らす"}
        className="fixed bottom-3 right-3 z-50 flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel/80 text-accent transition-colors hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {on ? "♪" : "✕"}
      </button>
    </>
  );
}
