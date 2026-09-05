import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { AudioBus } from "../src/audio";
import { BANTER } from "../src/banter";

class FakeGain {
  gain = { value: 0, setTargetAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
}
class FakeSource {
  buffer: unknown;
  playbackRate = { value: 1 };
  connect = vi.fn();
  disconnect = vi.fn();
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onended?.());
}
class FakeContext {
  state = "running";
  currentTime = 0;
  destination = {};
  sources: FakeSource[] = [];
  resume = vi.fn(async () => {
    this.state = "running";
  });
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  createGain = () => new FakeGain();
  createBufferSource = () => {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  };
  decodeAudioData = vi.fn(async () => ({ duration: 2 }));
}
let context: FakeContext;
async function flush(): Promise<void> {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}
beforeEach(() => {
  context = new FakeContext();
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        return context;
      }
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("bundled spoken reactions", () => {
  it("ships one metadata-free PCM clip for every original line", () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL("../public/audio/voices/manifest.json", import.meta.url),
        "utf8",
      ),
    );
    expect(manifest.clips).toHaveLength(Object.values(BANTER).flat().length);
    for (const [category, lines] of Object.entries(BANTER))
      lines.forEach((line, index) => {
        const name = `${category}-${index}.wav`;
        expect(
          manifest.clips.find((clip: { file: string }) => clip.file === name)
            .text,
        ).toBe(line);
        const data = readFileSync(
          new URL(`../public/audio/voices/${name}`, import.meta.url),
        );
        expect(data.toString("ascii", 0, 4)).toBe("RIFF");
        expect(data.toString("ascii", 8, 12)).toBe("WAVE");
        expect(data.toString("ascii", 36, 40)).toBe("data");
        expect(data.readUInt32LE(40)).toBe(data.length - 44);
        expect(data.readUInt16LE(22)).toBe(1);
        expect(data.readUInt16LE(34)).toBe(16);
        let peak = 0;
        for (let i = 44; i < data.length; i += 2)
          peak = Math.max(peak, Math.abs(data.readInt16LE(i)));
        expect(peak).toBeGreaterThan(1000);
        expect(peak).toBeLessThanOrEqual(27001);
      });
  });
  it("plays from a local buffer and reuses decoded clips", async () => {
    const bus = new AudioBus();
    bus.unlock();
    bus.speak("Test", 0, "/audio/voices/miss-3.wav");
    await flush();
    expect(bus.clipsPlayed).toBe(1);
    expect(context.sources[0].start).toHaveBeenCalledOnce();
    bus.speak("Test", 1, "/audio/voices/miss-3.wav");
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(context.sources[0].stop).toHaveBeenCalledOnce();
    expect(bus.clipsPlayed).toBe(2);
  });
  it("mute and pause stop voice playback immediately", async () => {
    const bus = new AudioBus();
    bus.unlock();
    bus.speak("Test", 0, "/audio/voices/miss-3.wav");
    await flush();
    bus.setMuted(true);
    expect(context.sources[0].stop).toHaveBeenCalledOnce();
    expect(bus.voiceState).toBe("idle");
    bus.setMuted(false);
    bus.speak("Test", 0, "/audio/voices/miss-3.wav");
    await flush();
    bus.suspend();
    expect(context.sources[1].stop).toHaveBeenCalledOnce();
    expect(context.state).toBe("suspended");
  });
  it("does not play a late-loading clip after pause or disabled voices", async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      ),
    );
    const bus = new AudioBus();
    bus.unlock();
    bus.speak("Test", 0, "/audio/voices/miss-3.wav");
    bus.setVoices(false);
    resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) });
    await flush();
    expect(context.sources).toHaveLength(0);
    expect(bus.clipsPlayed).toBe(0);
  });
});
