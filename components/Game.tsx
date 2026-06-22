"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioEngine } from "@/lib/audio";
import { Engine } from "@/lib/engine";
import { generateMap } from "@/lib/mapgen";
import { computeScore } from "@/lib/score";
import { buildMockMission, mockComment } from "@/lib/mock";
import { makeSeedString } from "@/lib/rng";
import { saveResult } from "@/lib/store";
import { diffConfig } from "@/lib/difficulty";
import type { Difficulty, GameMap, Mission, Mode, RunResult, Screen } from "@/lib/types";
import { IntroScreen } from "./IntroScreen";
import { TitleScreen } from "./TitleScreen";
import { MissionScreen } from "./MissionScreen";
import { MicCalibration } from "./MicCalibration";
import { PlayScreen } from "./PlayScreen";
import { ResultScreen } from "./ResultScreen";
import { Bgm } from "./Bgm";

export default function Game() {
  const audioRef = useRef<AudioEngine | null>(null);
  if (!audioRef.current && typeof window !== "undefined") audioRef.current = new AudioEngine();

  const [screen, setScreen] = useState<Screen>("intro");
  const [mode, setMode] = useState<Mode>("voice");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [demo, setDemo] = useState(false);
  const [seed, setSeed] = useState("");
  const [, setMission] = useState<Mission | null>(null);
  const [map, setMap] = useState<GameMap | null>(null);
  const [sensitivity, setSensitivity] = useState(1);
  const [result, setResult] = useState<RunResult | null>(null);

  // /?demo=1 で Demo Mode 起動
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      setDemo(true);
      setMode("manual");
      setSeed(makeSeedString());
      setScreen("mission");
    }
  }, []);

  const startRun = useCallback((m: Mode, d: Difficulty) => {
    setMode(m);
    setDifficulty(d);
    setDemo(false);
    setSeed(makeSeedString());
    setScreen("mission");
  }, []);

  const startDemo = useCallback((d: Difficulty) => {
    setDifficulty(d);
    setDemo(true);
    setMode("manual");
    setSeed(makeSeedString());
    setScreen("mission");
  }, []);

  const enterPlay = useCallback(
    (curMode: Mode) => {
      setMap(generateMap(seed, demo));
      setMode(curMode);
      setScreen("play");
    },
    [seed, demo]
  );

  const onProceedMission = useCallback(
    (m: Mission) => {
      setMission(m);
      if (mode === "voice" && !demo) setScreen("calibration");
      else enterPlay(mode);
    },
    [mode, demo, enterPlay]
  );

  const onEnd = useCallback(
    async (engine: Engine) => {
      const timeLimit = demo ? 90 : diffConfig(difficulty).timeSec;
      const success = engine.result?.success ?? false;
      const clearTimeSec = Math.max(0, timeLimit - engine.timeLeft);
      const { score, rank, badge } = computeScore({
        success,
        hpLeft: engine.robot.hp,
        batteryLeft: engine.robot.battery,
        clearTimeSec,
        timeLimitSec: timeLimit,
        pings: engine.pings,
        hits: engine.hits,
        manual: mode === "manual",
      });
      const mission = buildMockMission(seed);
      let comment = mockComment(success, rank);
      try {
        const r = await fetch("/api/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success, rank, score, hits: engine.hits, pings: engine.pings }),
        });
        const d = await r.json();
        if (d?.comment) comment = d.comment;
      } catch {
        /* mock を使う */
      }
      const run: RunResult = {
        success,
        score,
        rank,
        badge,
        clearTimeSec,
        hits: engine.hits,
        pings: engine.pings,
        maxVolume: engine.maxVolume,
        hpLeft: Math.round(engine.robot.hp),
        batteryLeft: Math.round(engine.robot.battery),
        seed,
        itemName: mission.itemName,
        mode,
        demo,
        comment,
        createdAt: Date.now(),
      };
      setResult(run);
      saveResult(run).catch(() => {});
      setScreen("result");
    },
    [demo, mode, seed, difficulty]
  );

  const onRetry = useCallback(() => {
    setSeed(makeSeedString());
    setScreen("mission");
  }, []);

  const toTitle = useCallback(() => setScreen("title"), []);

  const audio = audioRef.current;
  const content = useMemo(() => {
    if (!audio) return null;
    switch (screen) {
      case "intro":
        return <IntroScreen onDone={() => setScreen("title")} />;
      case "title":
        return <TitleScreen onStart={startRun} onDemo={startDemo} />;
      case "mission":
        return (
          <MissionScreen
            seed={seed}
            mode={mode}
            demo={demo}
            difficulty={difficulty}
            onProceed={onProceedMission}
            onBack={toTitle}
          />
        );
      case "calibration":
        return (
          <MicCalibration
            audio={audio}
            onProceed={(s) => {
              setSensitivity(s);
              enterPlay("voice");
            }}
            onManual={() => enterPlay("manual")}
            onBack={() => setScreen("mission")}
          />
        );
      case "play":
        return map ? (
          <PlayScreen
            map={map}
            audio={audio}
            mode={mode}
            demo={demo}
            difficulty={difficulty}
            sensitivity={sensitivity}
            onEnd={onEnd}
            onAbort={toTitle}
          />
        ) : null;
      case "result":
        return result ? (
          <ResultScreen result={result} onRetry={onRetry} onTitle={toTitle} />
        ) : null;
    }
  }, [
    audio,
    screen,
    seed,
    mode,
    demo,
    difficulty,
    map,
    sensitivity,
    result,
    startRun,
    startDemo,
    onProceedMission,
    enterPlay,
    onEnd,
    onRetry,
    toTitle,
  ]);

  return (
    <>
      {content}
      <Bgm src="/audio/bgm.mp3" />
    </>
  );
}
