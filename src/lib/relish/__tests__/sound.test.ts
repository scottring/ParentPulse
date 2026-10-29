// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createSoundEngine, stoneSamples } from "../sound";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mockAudio() {
  const sources: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    buffer: null;
    onended: null;
  }[] = [];
  const ctx = {
    state: "running",
    sampleRate: 44100,
    currentTime: 0,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createBuffer: vi.fn((_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    })),
    createGain: vi.fn(() => ({
      gain: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createBufferSource: vi.fn(() => {
      const source = {
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        buffer: null,
        onended: null,
      };
      sources.push(source);
      return source;
    }),
  };
  const Audio = vi.fn(function () {
    return ctx;
  });
  vi.stubGlobal("AudioContext", Audio);
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: Audio,
  });
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  return { ctx, Audio, sources };
}
describe("quiet local feedback", () => {
  it.each([44100, 48000])(
    "renders finite, unclipped sound with a quiet tail at %s Hz",
    (rate) => {
      const samples = stoneSamples(rate);
      expect(samples.every(Number.isFinite)).toBe(true);
      expect(Math.max(...samples.map(Math.abs))).toBeLessThan(1);
      expect(Math.max(...samples.slice(-100).map(Math.abs))).toBeLessThan(
        0.001,
      );
      expect(Math.abs(samples[0])).toBe(0);
    },
  );
  it("does not allocate audio until invited and stops pending sources when muted", async () => {
    const { Audio, sources } = mockAudio();
    const engine = createSoundEngine();
    expect(Audio).not.toHaveBeenCalled();
    await engine.play("place");
    expect(sources).toHaveLength(2);
    engine.stop();
    sources.forEach((s) => expect(s.stop).toHaveBeenCalled());
    engine.dispose();
  });
  it("does not play a delayed resume after muting", async () => {
    const { ctx, sources } = mockAudio();
    ctx.state = "suspended";
    let resume!: () => void;
    ctx.resume.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resume = resolve;
        }),
    );
    const engine = createSoundEngine();
    const request = engine.play("place");
    engine.stop();
    resume();
    expect(await request).toBe(false);
    expect(sources).toHaveLength(0);
    engine.dispose();
  });
  it("stays silent in hidden tabs", async () => {
    const { Audio } = mockAudio();
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const engine = createSoundEngine();
    expect(await engine.play("place")).toBe(false);
    expect(Audio).not.toHaveBeenCalled();
    engine.dispose();
  });
});
