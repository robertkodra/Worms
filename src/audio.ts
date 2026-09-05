import { GameEvent } from "./game/simulation";

/** Original effects and bundled Flite-synthesized quips; no game recordings. */
export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  voicesEnabled = true;
  voiceVolume = 0.7;
  voiceState: "idle" | "loading" | "playing" | "fallback" = "idle";
  clipsPlayed = 0;
  private voiceGeneration = 0;
  private clip: AudioBufferSourceNode | null = null;
  private clipGain: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private utterance: SpeechSynthesisUtterance | null = null;
  private lastStep = 0;
  private chatterTimers: ReturnType<typeof setTimeout>[] = [];
  private synth =
    typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis
      : null;
  get voiceAvailable(): boolean {
    return !!this.synth
      ?.getVoices()
      .some((v) => v.localService && /^en/i.test(v.lang));
  }
  stopVoices(): void {
    this.voiceGeneration++;
    this.clip?.stop();
    this.clip = null;
    this.clipGain = null;
    this.voiceState = "idle";
    this.synth?.cancel();
    this.utterance = null;
    this.chatterTimers.forEach(clearTimeout);
    this.chatterTimers = [];
  }
  setVoices(value: boolean): void {
    this.voicesEnabled = value;
    if (!value) this.stopVoices();
  }
  setVoiceVolume(value: number): void {
    this.voiceVolume = Math.max(
      0,
      Math.min(1, Number.isFinite(value) ? value : 0.7),
    );
    if (this.clipGain && this.ctx)
      this.clipGain.gain.setTargetAtTime(
        this.voiceVolume * 2.8,
        this.ctx.currentTime,
        0.03,
      );
  }
  previewVoice(): void {
    this.unlock();
    void this.ctx
      ?.resume()
      .then(() =>
        this.speak("Wind. Definitely the wind.", 0, "/audio/voices/miss-3.wav"),
      )
      .catch(() => {});
  }
  speak(line: string, actor: number, clipUrl?: string): void {
    if (this.muted || !this.voicesEnabled || this.ctx?.state !== "running")
      return;
    this.stopVoices();
    if (clipUrl) {
      this.voiceState = "loading";
      const generation = this.voiceGeneration;
      let buffer = this.buffers.get(clipUrl);
      if (!buffer) {
        buffer = fetch(clipUrl)
          .then((response) => {
            if (!response.ok) throw new Error("Voice unavailable");
            return response.arrayBuffer();
          })
          .then((bytes) => this.ctx!.decodeAudioData(bytes));
        this.buffers.set(clipUrl, buffer);
      }
      void buffer
        .then((decoded) => {
          if (
            generation !== this.voiceGeneration ||
            this.muted ||
            !this.voicesEnabled ||
            this.ctx?.state !== "running"
          )
            return;
          const source = this.ctx.createBufferSource(),
            gain = this.ctx.createGain();
          source.buffer = decoded;
          source.playbackRate.value = [1.15, 1.23, 1.04, 1.1][actor % 4];
          gain.gain.value = this.voiceVolume * 2.8;
          source.connect(gain);
          gain.connect(this.master!);
          this.clip = source;
          this.clipGain = gain;
          this.voiceState = "playing";
          this.clipsPlayed++;
          source.onended = () => {
            source.disconnect();
            gain.disconnect();
            if (this.clip === source) {
              this.clip = null;
              this.clipGain = null;
              this.voiceState = "idle";
            }
          };
          source.start();
        })
        .catch(() => {
          this.buffers.delete(clipUrl);
          if (generation === this.voiceGeneration)
            this.speakFallback(line, actor);
        });
      return;
    }
    this.speakFallback(line, actor);
  }
  private speakFallback(line: string, actor: number): void {
    this.voiceState = "fallback";
    // Use only device-local English voices. No network speech service or recordings.
    const voices =
      this.synth
        ?.getVoices()
        .filter((v) => v.localService && /^en/i.test(v.lang)) ?? [];
    if (voices.length && this.synth) {
      const u = new SpeechSynthesisUtterance(line);
      u.voice =
        voices.find((v) => /Samantha|Daniel|Karen|Moira/i.test(v.name)) ??
        voices[0];
      u.pitch = [1.7, 1.85, 1.45, 1.6][actor % 4];
      u.rate = [1.22, 1.15, 1.1, 1.18][actor % 4];
      u.volume = this.voiceVolume;
      u.onend = () => {
        if (this.utterance === u) this.utterance = null;
      };
      u.onerror = () => {
        if (this.utterance === u) {
          this.utterance = null;
          this.warble(actor);
        }
      };
      this.utterance = u;
      this.synth.speak(u);
    } else this.warble(actor);
  }
  private warble(actor: number): void {
    // A short original squeaky chatter accompanies captions when speech is unavailable.
    for (let i = 0; i < 7; i++)
      this.chatterTimers.push(
        setTimeout(() => {
          if (!this.muted && this.voicesEnabled)
            this.tone(
              370 + actor * 35 + (i % 3) * 115,
              0.065,
              "triangle",
              i % 2 ? 480 : 720,
              0.13 * this.voiceVolume,
            );
        }, i * 95),
      );
  }
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.22;
      this.master.connect(this.ctx.destination);
    }
    this.synth?.getVoices();
    void this.ctx.resume().catch(() => {});
  }
  setMuted(value: boolean): void {
    this.muted = value;
    if (value) this.stopVoices();
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(
        value ? 0 : 0.22,
        this.ctx.currentTime,
        0.03,
      );
  }
  suspend(): void {
    this.stopVoices();
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
    if (this.muted) return;
    if (e.type === "step") {
      const now = this.ctx?.currentTime ?? 0;
      if (now - this.lastStep < 0.16) return;
      this.lastStep = now;
      const pitch = 170 + (e.actor ?? 0) * 22;
      this.tone(pitch, 0.105, "sine", pitch * 2.1, 0.23);
      this.tone(pitch * 2.5, 0.075, "triangle", pitch * 0.8, 0.07);
      this.noise(0.035, 430);
    } else if (e.type === "land") {
      this.noise(0.085, 360);
      this.tone(115, 0.11, "sine", 60, 0.2);
    } else if (e.type === "teleport") {
      this.tone(260, 0.4, "sine", 1200, 0.18);
      this.tone(395, 0.3, "triangle", 790, 0.08);
    } else if (e.type === "heal") {
      this.tone(520, 0.5, "sine", 1040, 0.2);
    } else if (e.type === "blast") {
      this.noise(0.65, 900);
      this.tone(95, 0.45, "sine", 28, 0.8);
    } else if (e.type === "fire") {
      if (e.weapon === "sniper") {
        this.noise(0.12, 4200);
        this.tone(880, 0.18, "sawtooth", 140, 0.15);
      } else if (e.weapon === "shotgun") {
        this.noise(0.25, 2400);
        this.tone(130, 0.2, "triangle", 45, 0.5);
      } else if (e.weapon === "airstrike")
        this.tone(180, 0.85, "sawtooth", 340, 0.13);
      else {
        this.noise(0.14, 1700);
        this.tone(240, 0.12, "triangle", 95);
      }
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
