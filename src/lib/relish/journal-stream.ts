/**
 * My journal as one stream (2026-11-22, Scott: "i like it, ship it"): the
 * writer's filtered view of everything in the family's Relish that is theirs.
 * What they wrote, what someone sent them, family-journal pages that mention
 * them, and games they played, each saying where it came from. Our family
 * journal stays the view of everything shared with everyone.
 *
 * Nothing from anyone's private entries can reach this stream: only what they
 * chose to send (connections.received, or waiting to be kept) or to add to
 * Our family journal.
 */
import type { Book } from "./model";
import { bookPages, PLAY_RECORD, type BookPage } from "./pages";
import { livingOf, type GameKind } from "./living";
import type { JournalEntry } from "./journal";
import type { FamilyPage } from "./family-pages";
import type { Incoming } from "./partner-share";
import type { Passage } from "./sharing";
import { resolveMentions, sameName } from "./mentions";

export type StreamKind = "wrote" | "sent" | "mention" | "played" | "you-sent";
export type StreamFilter = "all" | "sent" | "mentions" | "wrote" | "played" | "said";
export type StreamItem = {
  key: string;
  kind: StreamKind;
  date: string;
  title: string;
  text: string;
  /** People in this journal it involves (ids), for the person chips. */
  people: string[];
  /** Who it came from, by name: a sender, a family page's writer, another player. */
  from?: string;
  /** The sender's account, when a line can be written back to them. */
  fromUid?: string;
  /** "You sent Anna": who it went to. */
  to?: string[];
  /** A page in this journal, to open. */
  page?: BookPage;
  draft?: JournalEntry;
  /** A page in Our family journal (a mention, or another player's game note). */
  familyPage?: FamilyPage;
  /** Waiting to be kept: New, with Keep it and Set aside. */
  offer?: Incoming;
  note?: string;
  caption?: string;
  /** Sent to this writer alone (not a family page passed on). */
  direct?: boolean;
  /** Where this writer's own entry went: lines and pages in Our family journal, and who it was sent to. */
  shared?: { lines: number; page: boolean; sentTo: string[] };
  game?: GameKind;
  /** The exercise a page came from (its tool id), for its painting. */
  toolId?: string;
};

const time = (iso: string) => Date.parse(iso) || 0;
const named = (book: Book, name: string) =>
  book.people.filter((p) => sameName(p.name, name)).map((p) => p.id);
/** Whole-word name, for a game note ("Played Same page? with Alex."). */
const namesIn = (text: string, name: string) =>
  !!name.trim() &&
  new RegExp(`(^|[^\\p{L}])${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "iu").test(text);

/** Whether a family page @-mentions the writer (or lists them in its mentions). */
export function mentionsOwner(page: Pick<FamilyPage, "text" | "title" | "caption" | "mentions">, owner: string) {
  if (!owner.trim()) return false;
  if (page.mentions?.some((n) => sameName(n, owner))) return true;
  return resolveMentions(`${page.title || ""}\n${page.text}\n${page.caption || ""}`, [owner]).length > 0;
}

/**
 * Whether an outgoing passage was a line sent to chosen people, not a family
 * page passed on to a partner. Older ones say neither: a family page carries
 * the same id as the page it was sent with.
 */
export const isDirectSend = (o: { id: string; audience?: string }, familyPages: { id: string }[]) =>
  o.audience ? o.audience === "direct" : !familyPages.some((p) => p.id === o.id);
/** A received passage that was sent to this writer alone. */
export const isDirectPassage = (p: Pick<Passage, "audience">) => p.audience === "direct";

export function journalStream(
  book: Book,
  {
    familyPages = [],
    myBookId = "",
    incoming = [],
  }: { familyPages?: FamilyPage[]; myBookId?: string; incoming?: Incoming[] } = {},
): StreamItem[] {
  const owner = book.owner;
  const l = livingOf(book);
  const received = book.connections?.received || [];
  const outgoing = (book.connections?.outgoing || []).filter((o) => o.sent);
  const fromFamily = (id: string) =>
    familyPages.filter((p) => p.sourceId === id && (p.byBookId === myBookId || sameName(p.byName, owner)));
  const shared = (journalId?: string, family = false) => {
    if (!journalId) return undefined;
    const pages = fromFamily(journalId);
    const sentTo = outgoing
      .filter((o) => o.sourceId === journalId && isDirectSend(o, familyPages))
      .flatMap((o) => o.recipientNames || []);
    const lines = pages.filter((p) => p.kind === "passage").length;
    const page = family || pages.some((p) => p.kind === "page");
    return lines || page || sentTo.length ? { lines, page, sentTo: [...new Set(sentTo)] } : undefined;
  };
  const entryOf = (id?: string) => (book.journal || []).find((e) => e.id === id);
  const items: StreamItem[] = [];
  for (const d of book.journal || [])
    if (d.status === "draft")
      items.push({
        key: `draft:${d.id}`,
        kind: "wrote",
        date: d.updatedAt,
        title: d.title,
        text: d.text,
        people: d.people || [],
        draft: d,
        shared: shared(d.id),
      });
  for (const page of bookPages(book)) {
    if (page.kind === "Received passage") {
      const p = received.find((r) => `passage:${r.id}` === page.id);
      items.push({
        key: page.id,
        kind: "sent",
        date: p?.createdAt || page.date,
        title: page.title,
        text: page.text,
        people: p ? named(book, p.fromName) : [],
        from: p?.fromName || page.from,
        fromUid: p?.from,
        page,
        note: p?.note,
        caption: p?.caption,
        direct: !!p && isDirectPassage(p),
      });
    } else if (page.kind === PLAY_RECORD || page.kind === "Made together") {
      const id = page.id.slice(page.id.indexOf(":") + 1);
      const game =
        page.kind === PLAY_RECORD
          ? (l.plays || []).find((r) => r.id === id)?.kind
          : l.sharedPages.find((p) => p.id === id)?.kind;
      items.push({ key: page.id, kind: "played", date: page.date, title: page.title, text: page.text, people: page.people, page, game });
    } else {
      const entry = entryOf(page.journalId);
      items.push({
        key: page.id,
        kind: "wrote",
        date: page.date,
        title: page.title,
        text: page.text,
        people: page.people,
        page,
        shared: shared(page.journalId, entry?.audience === "family"),
        toolId: entry?.source?.toolId,
      });
    }
  }
  const keptIds = new Set(received.map((r) => r.id));
  for (const offer of incoming)
    if (!keptIds.has(offer.id))
      items.push({
        key: `offer:${offer.id}`,
        kind: "sent",
        date: offer.createdAt,
        title: offer.title,
        text: offer.text,
        people: named(book, offer.senderName),
        from: offer.senderName,
        fromUid: offer.sender,
        offer,
        note: offer.note,
        caption: offer.caption,
        direct: offer.audience === "direct",
      });
  const passedOn = new Set([...keptIds, ...incoming.map((o) => o.id)]);
  for (const p of familyPages) {
    const mine = p.byBookId === myBookId || sameName(p.byName, owner);
    // A family page that also arrived as a passage shows once, as Sent to me.
    if (mine || passedOn.has(p.id)) continue;
    if (p.kind === "game") {
      if (namesIn(p.text, owner))
        items.push({
          key: `family:${p.id}`,
          kind: "played",
          date: p.createdAt,
          title: p.title || "A game",
          text: p.text,
          people: named(book, p.byName),
          from: p.byName,
          familyPage: p,
          game: p.activity as GameKind | undefined,
        });
    } else if (mentionsOwner(p, owner))
      items.push({
        key: `family:${p.id}`,
        kind: "mention",
        date: p.createdAt,
        title: p.title || "",
        text: p.text,
        people: named(book, p.byName),
        from: p.byName,
        familyPage: p,
        caption: p.caption,
      });
  }
  for (const o of outgoing)
    if (isDirectSend(o, familyPages)) {
      const names = o.recipientNames?.length ? o.recipientNames : [];
      items.push({
        key: `sent:${o.id}`,
        kind: "you-sent",
        date: o.createdAt,
        // "from Notice the unseen work"; a line written back has no source to name.
        title: o.sourceId || !o.title.startsWith("A line from ") ? o.title : "",
        text: o.text,
        people: names.flatMap((n) => named(book, n)),
        to: names,
        note: o.note,
        caption: o.caption,
        toolId: entryOf(o.sourceId)?.source?.toolId,
      });
    }
  return items.toSorted((a, b) => time(b.date) - time(a.date) || a.key.localeCompare(b.key));
}

const kinds: Record<Exclude<StreamFilter, "all">, StreamKind[]> = {
  sent: ["sent"],
  mentions: ["mention"],
  wrote: ["wrote"],
  played: ["played"],
  said: ["sent", "mention"],
};
/** The stream narrowed by kind, by a person in this journal and by a search. */
export function filterStream(
  book: Book,
  items: StreamItem[],
  filter: StreamFilter = "all",
  who = "all",
  query = "",
): StreamItem[] {
  const person = book.people.find((p) => p.id === who);
  const q = query.trim().toLocaleLowerCase();
  const nameOf = (id: string) => book.people.find((p) => p.id === id)?.name || "";
  return items.filter(
    (i) =>
      (filter === "all" || kinds[filter].includes(i.kind)) &&
      (who === "all" ||
        i.people.includes(who) ||
        (!!person &&
          [i.from, ...(i.to || [])].some((n) => !!n && sameName(n, person.name)))) &&
      (!q ||
        `${i.title}\n${i.text}\n${i.caption || ""}\n${i.note || ""}\n${i.from || ""}\n${(i.to || []).join(" ")}\n${i.people.map(nameOf).join(" ")}`
          .toLocaleLowerCase()
          .includes(q)),
  );
}

export type StreamGroup = { label: "Today" | "This week" | "Earlier"; items: StreamItem[] };
const DAY = 86_400_000;
/** Today, This week (the six days before) and Earlier, by the writer's own calendar. */
export function groupStream(items: StreamItem[], now = new Date()): StreamGroup[] {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const label = (iso: string): StreamGroup["label"] => {
    const t = time(iso);
    if (t >= midnight) return "Today";
    if (t >= midnight - 6 * DAY) return "This week";
    return "Earlier";
  };
  const groups: StreamGroup[] = [];
  for (const item of items) {
    const l = label(item.date);
    const last = groups.at(-1);
    if (last?.label === l) last.items.push(item);
    else groups.push({ label: l, items: [item] });
  }
  return groups;
}

/** A short line from what someone sent or wrote about the writer, for "What your family says about you". */
export function sayingOf(item: StreamItem, owner: string, max = 56) {
  const text = item.text.replace(/\s+/g, " ").trim();
  const sentences = text.split(/(?<=[.!?])\s+/);
  const about =
    item.kind === "mention"
      ? sentences.find((s) => resolveMentions(s, [owner]).length) ??
        sentences.find((s) => /@\p{L}/u.test(s)) ??
        sentences[0]
      : sentences[0];
  const line = (about || text).replace(/^[“"]|[”"]$/g, "").replace(/[.!?]+$/, "");
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
