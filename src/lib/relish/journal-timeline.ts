/**
 * One journal (Scott, 2026-11-22): "a family journal running through
 * everything as the main 'spine', and individual contributions/mentions/etc.
 * are little branches off the main spine with permissions/restrictions as
 * appropriate."
 *
 * The spine is Our family journal: what everyone in the family can read, in
 * time order. Branches are what only some people can see, set in at the
 * moment they happened: your own entries and drafts, a line sent to one
 * person, a round you played with someone. Each branch says who can see it.
 *
 * This only arranges what the writer's stream (journal-stream.ts) and Our
 * family journal already hold. Nothing is shared by it, and nobody's private
 * entries can be in either.
 */
import type { Book } from "./model";
import { livingOf } from "./living";
import type { StreamItem } from "./journal-stream";
import { sameName } from "./mentions";

/** A page in Our family journal, as Family.tsx shows it. */
export type SpinePage = {
  id: string;
  date: string;
  kind: string;
  title: string;
  text: string;
  caption?: string;
  byName: string;
  /** This writer added it (or sent it on). */
  mine: boolean;
};
export type Lane = "spine" | "branch";
export type TimelineItem<P extends SpinePage = SpinePage> = {
  key: string;
  date: string;
  lane: Lane;
  /** A branch: who else can see it, by name. None means only you. (The spine is everyone.) */
  seenWith: string[];
  /** What it is to this writer, from their stream (a mention, a line sent to them, their own page…). */
  item?: StreamItem;
  /** Its page in Our family journal, for a spine item. */
  page?: P;
};
/**
 * Everything; Family (the spine only); Just me (only my branches); then the
 * stream's kinds; "said" is What your family says about you, from the side.
 */
export type TimelineFilter = "all" | "family" | "mine" | "sent" | "mentions" | "played" | "said";

const time = (iso: string) => Date.parse(iso) || 0;
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

/** The family page a stream item already is, when it is one. */
function spineIdOf(i: StreamItem): string | undefined {
  // A mention, or another player's game note: a page in Our family journal.
  if (i.familyPage) return i.familyPage.id;
  // A page passed on from a partner's family journal (not a line sent to you alone).
  if (i.kind === "sent" && !i.direct)
    return i.offer?.id ?? (i.key.startsWith("passage:") ? i.key.slice("passage:".length) : undefined);
  // A page everyone in a game approved ("Made together").
  if (i.kind === "played" && i.key.startsWith("game:")) return i.key;
  return undefined;
}

/** The others in a round this writer played, by name. */
function playedWith(book: Book, i: StreamItem): string[] {
  if (!i.key.startsWith("play:")) return [];
  const round = (livingOf(book).plays || []).find((r) => `play:${r.id}` === i.key);
  if (!round) return i.people.map((id) => book.people.find((p) => p.id === id)?.name || "").filter(Boolean);
  return round.players
    .filter((p) => p.id !== "owner" && !sameName(p.name, book.owner))
    .map((p) => p.name);
}

/** Who else can see a branch, by name. */
function seenWithOf(book: Book, i: StreamItem): string[] {
  if (i.kind === "sent") return i.from ? [i.from] : [];
  if (i.kind === "you-sent") return i.to || [];
  if (i.kind === "played") return playedWith(book, i);
  return [];
}

/**
 * The one journal: Our family journal's pages on the spine, the writer's own
 * stream set in beside them, newest first. Anything that is both (a mention,
 * a page passed on, a game everyone approved, an entry written for the
 * family) shows once, on the spine, carrying what it is to the writer.
 */
export function journalTimeline<P extends SpinePage>(
  book: Book,
  stream: StreamItem[],
  spine: P[],
): TimelineItem<P>[] {
  const pages = new Map(spine.map((p) => [p.id, p]));
  const onSpine = new Map<string, StreamItem>();
  const items: TimelineItem<P>[] = [];
  for (const i of stream) {
    let id = spineIdOf(i);
    // An entry written for the family: its whole page is in Our family journal.
    if (!id && i.kind === "wrote" && i.page && i.shared?.page) {
      const words = flat(i.page.text);
      id = spine.find((p) => p.mine && !!words && flat(p.text) === words)?.id;
    }
    if (id && pages.has(id)) {
      if (!onSpine.has(id)) onSpine.set(id, i);
      continue;
    }
    if (id)
      // Passed on to the family but not in this copy of the family pages yet.
      items.push({ key: i.key, date: i.date, lane: "spine", seenWith: [], item: i });
    else items.push({ key: i.key, date: i.date, lane: "branch", seenWith: seenWithOf(book, i), item: i });
  }
  for (const p of spine)
    items.push({ key: `spine:${p.id}`, date: p.date, lane: "spine", seenWith: [], item: onSpine.get(p.id), page: p });
  return items.toSorted((a, b) => time(b.date) - time(a.date) || a.key.localeCompare(b.key));
}

/** "Only you", "You and Anna", "You, Anna and Leo". */
export function seenLabel(seenWith: string[]) {
  const names = seenWith.filter((n, i, all) => !!n.trim() && all.findIndex((m) => sameName(m, n)) === i);
  if (!names.length) return "Only you";
  return names.length === 1
    ? `You and ${names[0]}`
    : `You, ${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

const wholeWord = (text: string, name: string) =>
  !!name.trim() &&
  new RegExp(`(^|[^\\p{L}])@?${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "iu").test(text);

/**
 * The timeline narrowed: by Family / Just me / a kind, by a person in this
 * journal (their id) or anyone by name ("name:June"), and by a search.
 */
export function filterTimeline<P extends SpinePage>(
  book: Book,
  items: TimelineItem<P>[],
  filter: TimelineFilter = "all",
  who = "all",
  query = "",
): TimelineItem<P>[] {
  const person = who.startsWith("name:")
    ? { id: "", name: who.slice("name:".length) }
    : book.people.find((p) => p.id === who);
  const q = query.trim().toLocaleLowerCase();
  const nameOf = (id: string) => book.people.find((p) => p.id === id)?.name || "";
  const kind = (t: TimelineItem<P>) => t.item?.kind;
  const shows = (t: TimelineItem<P>) => {
    switch (filter) {
      case "family":
        return t.lane === "spine";
      case "mine":
        return t.lane === "branch";
      case "sent":
        return kind(t) === "sent";
      case "mentions":
        return kind(t) === "mention";
      case "played":
        return kind(t) === "played";
      case "said":
        return kind(t) === "sent" || kind(t) === "mention";
      default:
        return true;
    }
  };
  const about = (t: TimelineItem<P>) => {
    if (who === "all") return true;
    if (!person) return false;
    const i = t.item;
    if (i && (i.people.includes(person.id) || [i.from, ...(i.to || [])].some((n) => !!n && sameName(n, person.name))))
      return true;
    if (t.seenWith.some((n) => sameName(n, person.name))) return true;
    const p = t.page;
    return (
      !!p &&
      (p.byName.split(" + ").some((n) => sameName(n, person.name)) ||
        wholeWord(`${p.title}\n${p.text}\n${p.caption || ""}`, person.name))
    );
  };
  const words = (t: TimelineItem<P>) => {
    const i = t.item;
    const p = t.page;
    return [
      i?.title,
      i?.text,
      i?.caption,
      i?.note,
      i?.from,
      ...(i?.to || []),
      ...(i?.people || []).map(nameOf),
      p?.title,
      p?.text,
      p?.caption,
      p?.byName,
    ]
      .filter(Boolean)
      .join("\n")
      .toLocaleLowerCase();
  };
  return items.filter((t) => shows(t) && about(t) && (!q || words(t).includes(q)));
}
