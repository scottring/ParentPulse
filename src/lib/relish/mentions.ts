/**
 * @-mentions in writing (2026-11-22). Typing "@" offers the family's people;
 * choosing one writes "@Name" and files the entry under them. A mention never
 * shares anything: it only tags. Our family journal reads "@Name" (and a
 * page's `mentions`) to know whose journal a page is about.
 */

/**
 * "@Name": an @ at the start or after a space or punctuation (never an
 * email), then a name. "@Leo’s" is a mention of Leo.
 */
const MENTION = /(^|[^\p{L}\p{N}_@])@([\p{L}][\p{L}\p{M}-]*)/gu;

const key = (s: string) => s.trim().toLocaleLowerCase();
export const sameName = (a: string, b: string) => key(a) === key(b);

/** The names written as @Name in a text, in order, once each. */
export function mentionTokens(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(MENTION)) {
    const name = m[2].replace(/-+$/, "");
    if (name && !found.some((f) => sameName(f, name))) found.push(name);
  }
  return found;
}

/** Text cut into plain runs and mentions, for drawing "@Name" in the mention style. */
export function mentionSegments(text: string): { text: string; mention?: true }[] {
  const out: { text: string; mention?: true }[] = [];
  let at = 0;
  for (const m of text.matchAll(MENTION)) {
    const start = (m.index ?? 0) + m[1].length;
    const word = `@${m[2].replace(/-+$/, "")}`;
    if (start > at) out.push({ text: text.slice(at, start) });
    out.push({ text: word, mention: true });
    at = start + word.length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

/** The known names a text @-mentions (matched by whole name or first name). */
export function resolveMentions(text: string, names: string[]): string[] {
  return mentionTokens(text).flatMap((token) => {
    const hit =
      names.find((n) => sameName(n.replace(/\s+/g, ""), token)) ??
      names.find((n) => sameName(n.split(/\s+/)[0], token));
    return hit ? [hit] : [];
  }).filter((n, i, all) => all.findIndex((x) => sameName(x, n)) === i);
}

/**
 * While writing: the "@par" just before the caret, if the writer is choosing
 * someone. `start` is where the @ is.
 */
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = before.match(/(^|[^\p{L}\p{N}_@])@([\p{L}\p{M}-]{0,30})$/u);
  if (!m) return null;
  return { start: caret - m[2].length - 1, query: m[2] };
}

/** People whose name starts with the query (any word of it), best first. */
export function mentionChoices<T extends { name: string }>(people: T[], query: string, limit = 6): T[] {
  const q = key(query);
  const words = (n: string) => key(n).split(/\s+/);
  return people
    .filter((p) => !q || words(p.name).some((w) => w.startsWith(q)))
    .toSorted((a, b) => Number(!key(a.name).startsWith(q)) - Number(!key(b.name).startsWith(q)))
    .slice(0, limit);
}

/** Replaces "@par" at `start` with "@Name " and says where the caret goes. */
export function insertMention(text: string, at: { start: number; query: string }, name: string) {
  const first = name.trim();
  const before = text.slice(0, at.start);
  const after = text.slice(at.start + 1 + at.query.length);
  const insert = `@${first.replace(/\s+/g, "")}${after.startsWith(" ") ? "" : " "}`;
  return { text: `${before}${insert}${after}`, caret: before.length + insert.length };
}
