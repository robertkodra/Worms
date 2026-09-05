import { GameEvent } from "./game/simulation";

/** Original procedural prototype sounds; no downloaded recordings or voice impersonation. */
export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.22;
      this.master.connect(this.ctx.destination);
    }
    void this.ctx.resume().catch(() => {});
  }
  setMuted(value: boolean): void {
    this.muted = value;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(
        value ? 0 : 0.22,
        this.ctx.currentTime,
        0.03,
      );
  }
  suspend(): void {
    void this.ctx?.suspend().catch(() => {});
  }
  private tone(
    hz: number,
    length: number,
    type: OscillatorType = "sine",
    end?: number,
    volume = 0.4,
  ): void {
    if (!this.ctx || !this.master || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(hz, t);
    if (end) o.frequency.exponentialRampToValueAtTime(end, t + length);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + length);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + length);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  private noise(length: number, cutoff: number): void {
    if (!this.ctx || !this.master || this.ctx.state !== "running") return;
    const c = this.ctx,
      t = c.currentTime,
      b = c.createBuffer(1, c.sampleRate * length, c.sampleRate),
      data = b.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const s = c.createBufferSource(),
      g = c.createGain(),
      f = c.createBiquadFilter();
    s.buffer = b;
    f.type = "lowpass";
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + length);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start();
    s.onended = () => {
      s.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }
  event(e: GameEvent): void {
    if (e.type === "blast") {
      this.noise(0.65, 900);
      this.tone(95, 0.45, "sine", 28, 0.8);
    } else if (e.type === "fire") {
      this.noise(0.14, 1700);
      this.tone(240, 0.12, "triangle", 95);
    } else if (e.type === "jump") this.tone(260, 0.16, "sine", 430, 0.15);
    else if (e.type === "damage") this.tone(190, 0.16, "triangle", 110, 0.2);
    else if (e.type === "turn") {
      this.tone(440, 0.18, "sine", 660, 0.2);
    } else if (e.type === "bridge") this.tone(660, 0.3, "sine", 330, 0.2);
    else if (e.type === "shove") this.noise(0.25, 400);
    else if (e.type === "result") {
      this.tone(330, 0.6, "triangle", 660, 0.2);
    }
  }
}
