// Keyboard sound. Real keystrokes recorded on an HHKB (CC0, see
// public/sounds/keyboard/README.md), loaded from this app's own origin.
// Until they load (or if they can't), a synthesized click stands in.
export type KeyStroke = "key" | "space" | "enter" | "delete" | "up";

const VARIANTS = 8;

function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** One stroke's samples. Deterministic for a given (kind, variant). */
export function keySamples(
  rate: number,
  kind: KeyStroke,
  variant = 0,
): Float32Array {
  const r = rng(7919 * (variant + 1) + kind.length * 104729);
  const big = kind === "space" || kind === "enter";
  const up = kind === "up";
  const length = up ? 0.045 : big ? 0.11 : 0.075;
  const out = new Float32Array(Math.ceil(rate * length));
  // Per-variant character so repeated keys never sound identical.
  const body = (big ? 118 : 196) * (0.9 + r() * 0.2);
  const ring = (big ? 980 : 1450) * (0.88 + r() * 0.24);
  const bottom = (big ? 0.009 : 0.0055) + r() * 0.002;
  const rattle = kind === "space" ? 0.016 + r() * 0.004 : -1;
  const level = up ? 0.32 : kind === "delete" ? 0.85 : 1;
  let hp = 0,
    last = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    const n = r() * 2 - 1;
    // Crude high-pass so the click sounds like plastic, not hiss.
    hp = 0.86 * (hp + n - last);
    last = n;
    const click = hp * Math.exp(-t / (up ? 0.0012 : 0.0018)) * (up ? 0.6 : 0.75);
    let plate = 0;
    if (!up && t >= bottom)
      plate = hp * Math.exp(-(t - bottom) / 0.0013) * 0.55;
    let rat = 0;
    if (rattle > 0 && t >= rattle)
      rat = hp * Math.exp(-(t - rattle) / 0.0016) * 0.22;
    const tone =
      up
        ? Math.sin(2 * Math.PI * ring * 1.3 * t) * Math.exp(-t / 0.006) * 0.18
        : Math.sin(2 * Math.PI * body * t) *
            Math.exp(-Math.max(0, t - bottom) / (big ? 0.034 : 0.022)) *
            (t >= bottom ? 0.42 : 0.05) +
          Math.sin(2 * Math.PI * ring * t) * Math.exp(-t / 0.011) * 0.16;
    const attack = 1 - Math.exp(-t / 0.00015);
    out[i] = attack * level * (click + plate + rat + tone);
  }
  // Normalize so every variant peaks at the same loudness.
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < out.length; i++) out[i] *= (0.9 * level) / peak;
  return out;
}

export function strokeFor(key: string): KeyStroke | null {
  if (key === " " || key === "Spacebar") return "space";
  if (key === "Enter") return "enter";
  if (key === "Backspace" || key === "Delete") return "delete";
  // Characters and dead keys (accents); not Shift, arrows, Cmd shortcuts.
  if (key.length === 1 || key === "Dead" || key === "Process" || key === "Unidentified")
    return "key";
  return null;
}

/** Finds strokes in a file of strokes separated by silence: [start, end) sample ranges. */
export function splitStrokes(
  data: Float32Array,
  rate: number,
  threshold = 0.004,
): [number, number][] {
  const quiet = Math.round(rate * 0.03);
  const out: [number, number][] = [];
  let start = -1,
    lastLoud = -1;
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) > threshold) {
      if (start < 0) start = Math.max(0, i - Math.round(rate * 0.0005));
      lastLoud = i;
    } else if (start >= 0 && i - lastLoud > quiet) {
      out.push([start, lastLoud + 1]);
      start = -1;
    }
  }
  if (start >= 0) out.push([start, lastLoud + 1]);
  return out.filter(([a, b]) => b - a > rate * 0.01);
}

// Space and Enter use the same strokes as every other key (Scott, 2026-11-18).
const FILES = { key: "keys", up: "up" } as const;
type Group = keyof typeof FILES;
const groupOf = (kind: KeyStroke): Group => (kind === "up" ? "up" : "key");

export function createKeyboardEngine(base = "/sounds/keyboard/") {
  const recorded: Partial<Record<Group, AudioBuffer[]>> = {};
  let loading: Promise<void> | null = null;
  const lastPick: Partial<Record<Group, number>> = {};
  let context: AudioContext | null = null;
  const buffers = new Map<string, AudioBuffer>();
  let lastVariant = -1;
  function ctx() {
    if (typeof window === "undefined") return null;
    const Audio =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Audio) return null;
    context ??= new Audio({ latencyHint: "interactive" });
    return context;
  }
  function buffer(c: AudioContext, kind: KeyStroke, variant: number) {
    const id = `${kind}:${variant}`;
    let b = buffers.get(id);
    if (!b) {
      const data = keySamples(c.sampleRate, kind, variant);
      b = c.createBuffer(1, data.length, c.sampleRate);
      b.getChannelData(0).set(data);
      buffers.set(id, b);
    }
    return b;
  }
  function load(c: AudioContext) {
    loading ??= Promise.all(
      (Object.keys(FILES) as Group[]).map(async (g) => {
        const res = await fetch(`${base}${FILES[g]}.mp3`);
        if (!res.ok) throw new Error("missing");
        const audio = await c.decodeAudioData(await res.arrayBuffer());
        const data = audio.getChannelData(0);
        recorded[g] = splitStrokes(data, audio.sampleRate).map(([a, b]) => {
          const part = c.createBuffer(1, b - a, audio.sampleRate);
          part.getChannelData(0).set(data.subarray(a, b));
          return part;
        });
      }),
    )
      .then(() => {})
      .catch(() => {
        loading = null; // fall back to the synthesized click; retry next focus
      });
    return loading;
  }
  /** Wake the audio context and fetch the recordings before the first key lands. */
  function warm() {
    const c = ctx();
    if (!c) return;
    if (c.state !== "running") void c.resume().catch(() => {});
    void load(c);
    for (let v = 0; v < VARIANTS; v++) buffer(c, "key", v);
    (["space", "enter", "delete", "up"] as const).forEach((k) => buffer(c, k, 0));
  }
  function strike(kind: KeyStroke, volume: number) {
    const c = ctx();
    if (!c || document.hidden) return;
    if (c.state !== "running") void c.resume().catch(() => {});
    const source = c.createBufferSource();
    const gain = c.createGain();
    const group = groupOf(kind);
    const real = recorded[group];
    if (real?.length) {
      let pick = Math.floor(Math.random() * real.length);
      if (pick === lastPick[group] && real.length > 1)
        pick = (pick + 1) % real.length;
      lastPick[group] = pick;
      source.buffer = real[pick];
      source.playbackRate.value = 0.98 + Math.random() * 0.04;
      gain.gain.value =
        volume * (kind === "up" ? 0.5 : 1) * (0.88 + Math.random() * 0.12);
    } else {
      if (!loading) void load(c);
      let variant = 0;
      if (kind !== "up" && kind !== "delete") {
        variant = Math.floor(Math.random() * VARIANTS);
        if (variant === lastVariant) variant = (variant + 1) % VARIANTS;
        lastVariant = variant;
      }
      const same = kind === "space" || kind === "enter" ? "key" : kind;
      source.buffer = buffer(c, same, variant);
      source.playbackRate.value = 0.97 + Math.random() * 0.06;
      gain.gain.value = volume * (0.85 + Math.random() * 0.15);
    }
    source.connect(gain);
    gain.connect(c.destination);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    // Start now: the sound lands with the key, not on a scheduler tick.
    source.start();
  }
  function dispose() {
    void context?.close().catch(() => {});
    context = null;
    buffers.clear();
  }
  return { warm, strike, dispose };
}
