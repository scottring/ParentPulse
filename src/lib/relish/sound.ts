// Small, inharmonic resonances and a short grain of friction: synthesized here,
// without audio files, microphones, analytics, or network requests.
export type SoundKind = "touch" | "place";
export function stoneSamples(rate: number, weight = 1): Float32Array {
  const out = new Float32Array(Math.ceil(rate * 0.26));
  let seed = 9137,
    grain = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    seed = (seed * 16807) % 2147483647;
    grain = grain * 0.55 + (seed / 1073741823.5 - 1) * 0.45;
    const attack = 1 - Math.exp(-t / 0.0008);
    const body =
      Math.sin(((2 * Math.PI * 386) / weight) * t) *
      Math.exp(-t / 0.024) *
      0.25;
    const ring = [1270, 2137, 3411].reduce(
      (sum, f, j) =>
        sum +
        Math.sin(((2 * Math.PI * f) / weight) * t) *
          Math.exp(-t / (0.029 - j * 0.005)) *
          [0.35, 0.2, 0.1][j],
      0,
    );
    out[i] = attack * (body + ring + grain * Math.exp(-t / 0.009) * 0.38);
  }
  return out;
}
export function createSoundEngine() {
  let context: AudioContext | null = null;
  let generation = 0,
    lastTouch = 0;
  const active = new Set<AudioBufferSourceNode>();
  const buffers = new Map<number, AudioBuffer>();
  function stop() {
    generation++;
    active.forEach((source) => {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    });
    active.clear();
    void context?.suspend().catch(() => {});
  }
  async function play(kind: SoundKind): Promise<boolean> {
    if (typeof window === "undefined" || document.hidden) return false;
    const now = Date.now();
    if (kind === "touch" && now - lastTouch < 65) return true;
    lastTouch = now;
    const token = generation;
    try {
      const Audio =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Audio) return false;
      context ??= new Audio({ latencyHint: "interactive" });
      if (context.state !== "running") await context.resume();
      if (token !== generation || document.hidden) return false;
      const ctx = context;
      function strike(delay: number, weight: number, level: number) {
        let buffer = buffers.get(weight);
        if (!buffer) {
          const data = stoneSamples(ctx.sampleRate, weight);
          buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
          buffer.getChannelData(0).set(data);
          buffers.set(weight, buffer);
        }
        const source = ctx.createBufferSource(),
          gain = ctx.createGain();
        source.buffer = buffer;
        gain.gain.value = level;
        source.connect(gain);
        gain.connect(ctx.destination);
        active.add(source);
        source.onended = () => {
          active.delete(source);
          source.disconnect();
          gain.disconnect();
        };
        source.start(ctx.currentTime + delay);
      }
      if (kind === "place") {
        strike(0, 1.22, 0.24);
        strike(0.13, 0.91, 0.12);
      } else strike(0, 0.96, 0.12);
      return true;
    } catch {
      return false;
    }
  }
  function dispose() {
    stop();
    void context?.close().catch(() => {});
    context = null;
    buffers.clear();
  }
  return { play, stop, dispose };
}
