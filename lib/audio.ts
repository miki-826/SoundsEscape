// audio.ts — マイク音量(RMS)測定と合成効果音。
// 音声は録音・保存・送信しない。time-domainのRMS数値のみをローカルで使う。

export type SfxName =
  | "ping"
  | "pingBig"
  | "reflect"
  | "item"
  | "pickup"
  | "ghost"
  | "hit"
  | "clear"
  | "fail";

export class AudioEngine {
  ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;
  private master: GainNode | null = null;
  noiseFloor = 0.012;
  micActive = false;

  ensureCtx() {
    if (this.ctx) return this.ctx;
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  async resume() {
    try {
      await this.ensureCtx().resume();
    } catch {
      /* ignore */
    }
  }

  async requestMic(): Promise<boolean> {
    try {
      const ctx = this.ensureCtx();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      this.micStream = stream;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.2;
      src.connect(analyser);
      this.analyser = analyser;
      this.buf = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
      this.micActive = true;
      return true;
    } catch {
      this.micActive = false;
      return false;
    }
  }

  /** 現在の生RMS（0..1程度）。マイク未許可なら0。 */
  rawRms(): number {
    if (!this.analyser || !this.buf) return 0;
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    return Math.sqrt(sum / this.buf.length);
  }

  /** ノイズフロアと感度から 0..1 に正規化した声量を返す。 */
  level(sensitivity = 1): number {
    const rms = this.rawRms();
    const range = 0.12 / Math.max(0.3, sensitivity);
    return Math.max(0, Math.min(1, (rms - this.noiseFloor) / range));
  }

  /** ノイズフロアを durationMs かけて測定（起動時のキャリブレーション） */
  async calibrateNoiseFloor(durationMs = 1500): Promise<number> {
    if (!this.analyser) return this.noiseFloor;
    const samples: number[] = [];
    const end = performance.now() + durationMs;
    return new Promise((resolve) => {
      const tick = () => {
        samples.push(this.rawRms());
        if (performance.now() < end) {
          requestAnimationFrame(tick);
        } else {
          samples.sort((a, b) => a - b);
          // 中央値+わずかなマージンをフロアに
          const med = samples[Math.floor(samples.length / 2)] ?? 0.012;
          this.noiseFloor = Math.max(0.006, med + 0.006);
          resolve(this.noiseFloor);
        }
      };
      tick();
    });
  }

  stopMic() {
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
    this.analyser = null;
    this.micActive = false;
  }

  /** 合成効果音。SEファイル不要でゼロ・インフラ依存を守る。 */
  sfx(name: SfxName, volume = 1) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(this.master);

    const tone = (
      freq: number,
      dur: number,
      type: OscillatorType,
      vol: number,
      slideTo?: number
    ) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(vol * volume, t + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur + 0.02);
    };

    const noise = (dur: number, vol: number, hp = 600) => {
      const len = Math.floor(ctx.sampleRate * dur);
      const b = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = ctx.createBufferSource();
      s.buffer = b;
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = hp;
      const ng = ctx.createGain();
      ng.gain.value = vol * volume;
      s.connect(f).connect(ng).connect(g);
      s.start(t);
    };

    switch (name) {
      case "ping":
        tone(880, 0.5, "sine", 0.22, 320);
        break;
      case "pingBig":
        tone(620, 0.7, "sine", 0.3, 180);
        tone(1240, 0.4, "sine", 0.12, 500);
        break;
      case "reflect":
        tone(1500, 0.12, "triangle", 0.06, 900);
        break;
      case "item":
        tone(1320, 0.18, "sine", 0.18, 1760);
        tone(1760, 0.22, "sine", 0.12, 2200);
        break;
      case "pickup":
        tone(523, 0.12, "square", 0.16, 784);
        tone(784, 0.18, "square", 0.16, 1046);
        break;
      case "ghost":
        tone(140, 0.6, "sawtooth", 0.12, 70);
        noise(0.5, 0.05, 1200);
        break;
      case "hit":
        tone(90, 0.4, "sawtooth", 0.3, 40);
        noise(0.35, 0.18, 300);
        break;
      case "clear":
        tone(523, 0.5, "sine", 0.2, 1046);
        tone(659, 0.5, "sine", 0.16, 1318);
        tone(784, 0.6, "sine", 0.16, 1568);
        break;
      case "fail":
        tone(330, 0.8, "sawtooth", 0.22, 110);
        break;
    }
  }
}
