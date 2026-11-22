"use client";
import ConfirmDelete from "./ConfirmDelete";
import { inviteFriend, inviteNotice } from "@/lib/relish/invite";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { Search, Users, X } from "lucide-react";
import type { Book } from "@/lib/relish/model";
import {
  gameText,
  livingOf,
  reflectionSections,
  type GameKind,
} from "@/lib/relish/living";
import type { PhotoAccess } from "@/lib/relish/photos";
import type { Tone } from "@/lib/relish/catalog";
import type { FamilyPage, FamilyPageKind } from "@/lib/relish/family-pages";
import { Dialog } from "./BookForms";
import { KidCoverMark } from "./KidHome";
import { PhotoGallery } from "./Photos";
import { personTones } from "./Home";
import Illustration from "./Illustration";
import Sprig from "./Sprig";
import MentionText from "./MentionText";
import {
  exerciseIllustration,
  gameIllustration,
  type IllustrationName,
} from "./illustrations";
import type { FamilyAccess } from "./useFamilyBook";
import "./family.css";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const gameLabel: Record<GameKind, { label: string; tone: Tone }> = {
  match: { label: "Same page?", tone: "clay" },
  joy: { label: "Small joy", tone: "sun" },
  story: { label: "Story", tone: "sage" },
  spot: { label: "Spot it!", tone: "sky" },
};
const gameNames: Record<GameKind, string> = {
  joy: "Guess my small joy",
  story: "One story, many voices",
  match: "Same page?",
  spot: "Spot it!",
};
type AlbumItem = {
  id: string;
  label: string;
  tone: Tone;
  title: string;
  text: string;
  note: string;
  date: string;
  photos?: Parameters<typeof PhotoGallery>[0]["photos"];
  /** Players' own lines about a game round, each under their name. */
  lines?: { label: string; text: string }[];
};

/** Everything in this journal that is shared: never a private page. */
export function albumOf(book: Book): AlbumItem[] {
  const l = livingOf(book);
  return [
    ...l.sharedPages.map((p) => {
      const round = (l.plays || []).find((r) => r.pageId === p.id);
      return {
        id: `game:${p.id}`,
        label: gameLabel[p.kind].label,
        tone: gameLabel[p.kind].tone,
        title: p.title,
        text: p.text,
        note: `${p.players.map((x) => x.name).join(" + ")} · everyone approved these words`,
        date: p.createdAt,
        lines: round ? reflectionSections(round) : [],
      };
    }),
    ...(book.album || []).map((p) => ({
      id: `album:${p.id}`,
      label: p.photos?.length ? "Photo" : "Passage",
      tone: (p.photos?.length ? "sky" : "lilac") as Tone,
      title: p.title,
      text: p.text,
      note: `Chosen by ${p.fromName} from ${shortDate(p.sourceDate)}. The original page stays private.`,
      date: p.createdAt,
      photos: p.photos,
    })),
  ].toSorted((a, b) => b.date.localeCompare(a.date));
}

/**
 * Pages passed between partners' journals that belong in Our family journal.
 * A line sent to one person ("Send a line") stays out: it's in their My
 * journal under Sent to me, and in yours under You sent.
 */
export function passedBetween(book: Book) {
  const c = book.connections;
  return [
    ...(c?.received || []).filter((p) => p.audience !== "direct").map((p) => ({
      id: p.id,
      who: `From ${p.fromName}’s journal`,
      byName: p.fromName,
      tone: "sage" as Tone,
      title: p.title,
      text: p.text,
      date: p.acceptedAt,
    })),
    ...(c?.outgoing || [])
      .filter((o) => o.sent && o.audience !== "direct")
      .map((o) => ({
        id: o.id,
        who: "You sent",
        byName: book.owner,
        tone: "sun" as Tone,
        title: o.title,
        text: o.text,
        date: o.createdAt,
      })),
  ].toSorted((a, b) => b.date.localeCompare(a.date));
}

/** Someone in the family, as Family members lists them. */
export type FamilyMember = {
  id: string;
  name: string;
  /** Opens their own journal in this account. */
  onOpen?: () => void;
  /** An older copy that still needs its original passphrase. */
  locked?: boolean;
};

/** One page of Our family journal as it is shown, from wherever it is kept. */
type Shown = {
  id: string;
  kind: FamilyPageKind;
  label: string;
  title: string;
  text: string;
  caption?: string;
  byName: string;
  date: string;
  note: string;
  art?: IllustrationName;
  mine: boolean;
  /** This writer added it to the family journal, so they can take it out. */
  removable: boolean;
  /** Kept in this journal (a game page, an album passage, a page passed between
   *  partners): deleting it removes this journal's copy, by its page id. */
  deleteId?: string;
  lines?: { label: string; text: string }[];
  photos?: AlbumItem["photos"];
  /** "Played Spot it! with Kaleb and Ella.": a round's one-line note. */
  playNote?: boolean;
};
const kindLabel: Record<FamilyPageKind, string> = {
  passage: "Passage",
  page: "Page",
  game: "Game",
  highlights: "Day’s highlights",
};
const artFor = (activity?: string): IllustrationName | undefined =>
  activity ? gameIllustration[activity] ?? exerciseIllustration[activity] : undefined;
const same = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export function familyPagesOf(
  book: Book,
  pages: FamilyPage[],
  me: { name: string; bookId: string },
): Shown[] {
  const l = livingOf(book);
  const shown: Shown[] = [
    ...pages.map((p) => {
      const mine = p.byBookId === me.bookId;
      return {
        id: p.id,
        kind: p.kind,
        label: kindLabel[p.kind],
        title: p.title || "",
        text: p.text,
        caption: p.caption,
        byName: p.byName,
        date: p.createdAt,
        note: mine
          ? "You added this to Our family journal."
          : `${p.byName} added this to Our family journal.`,
        art: artFor(p.activity),
        mine,
        removable: mine,
        playNote: p.kind === "game" && p.id.startsWith("play-"),
      };
    }),
    ...l.sharedPages.map((p) => {
      const round = (l.plays || []).find((r) => r.pageId === p.id);
      return {
        id: `game:${p.id}`,
        kind: "game" as const,
        label: gameLabel[p.kind].label,
        title: p.title,
        text: p.text,
        byName: p.players.map((x) => x.name).join(" + "),
        date: p.createdAt,
        note: `${p.players.map((x) => x.name).join(" + ")} · everyone approved these words`,
        art: gameIllustration[p.kind],
        mine: true,
        removable: false,
        deleteId: `game:${p.id}`,
        lines: round ? reflectionSections(round) : [],
      };
    }),
    ...(book.album || []).map((p) => ({
      id: `album:${p.id}`,
      kind: "passage" as const,
      label: p.photos?.length ? "Photo" : "Passage",
      title: p.title,
      text: p.text,
      caption: `${p.fromName} · ${shortDate(p.sourceDate)}`,
      byName: p.fromName,
      date: p.createdAt,
      note: `Chosen by ${p.fromName} from ${shortDate(p.sourceDate)}. The original page stays private.`,
      mine: same(p.fromName, me.name),
      removable: false,
      deleteId: `album:${p.id}`,
      photos: p.photos,
    })),
    ...passedBetween(book).map((p) => ({
      id: p.id,
      kind: "page" as const,
      label: p.who,
      title: p.title,
      text: p.text,
      byName: p.byName,
      date: p.date,
      note:
        p.who === "You sent"
          ? "You sent this to your partner’s journal."
          : `${p.who}. It’s kept in your journal too.`,
      mine: p.who === "You sent",
      removable: false,
      deleteId: `${p.who === "You sent" ? "sent" : "passage"}:${p.id}`,
    })),
  ];
  const seen = new Set<string>();
  return shown
    .filter((p) => !seen.has(p.id) && !!seen.add(p.id))
    .toSorted((a, b) => b.date.localeCompare(a.date));
}

const mentions = (p: Shown, name: string) => {
  const word = new RegExp(`\\b${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return (
    same(p.byName, name) ||
    p.byName.split(" + ").some((n) => same(n, name)) ||
    word.test(`${p.caption || ""}\n${p.title}\n${p.text}`)
  );
};

export default function OurFamily({
  book,
  access,
  me,
  members,
  busy,
  headingRef,
  photos,
  onOpenMine,
  onInvite,
  onAddChild,
  onPlay,
  onResumeGame,
  onCloseFinished,
  onRemoved,
  onDelete,
  onWrite,
  initialMembers = false,
  initialReading,
  phoneTop,
  phoneFoot,
}: {
  book: Book;
  access: FamilyAccess;
  /** Opens with one page showing (Read the whole entry, from My journal). */
  initialReading?: string;
  /** Add to our family journal: a page written for everyone. */
  onWrite?: () => void;
  /** Opens with Who's in our family showing (from the avatar menu). */
  initialMembers?: boolean;
  /** Phones: Mine / Family and kids' journals, drawn above and below. */
  phoneTop?: ReactNode;
  phoneFoot?: ReactNode;
  /** The writer of this journal, and the id their family pages carry. */
  me: { name: string; bookId: string };
  members: FamilyMember[];
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  photos?: PhotoAccess;
  /** Back to this journal's own pages (My journal). */
  onOpenMine: () => void;
  onInvite?: () => void;
  onAddChild?: () => void;
  onPlay: () => void;
  onResumeGame: () => void;
  onCloseFinished: (again: boolean) => void;
  onRemoved?: (error?: string) => void;
  /** Deletes this journal's copy of a page (see Shown.deleteId). */
  onDelete?: (pageId: string) => Promise<boolean>;
}) {
  const [who, setWho] = useState("all");
  const [query, setQuery] = useState("");
  const [reading, setReading] = useState<string | null>(initialReading ?? null);
  const [membersOpen, setMembersOpen] = useState(initialMembers);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const refresh = access.refresh;
  useEffect(() => {
    refresh();
  }, [refresh]);
  const l = livingOf(book);
  const active = l.game && l.game.stage !== "finished" ? l.game : undefined;
  const finished = l.game?.stage === "finished" ? l.game : undefined;
  const all = familyPagesOf(book, access.pages, me);
  const chips = [
    { id: "all", label: "Everyone" },
    ...members
      .filter((m) => !same(m.name, me.name))
      .map((m) => ({ id: `name:${m.name}`, label: m.name })),
    { id: "me", label: "Me" },
  ];
  const q = query.trim().toLocaleLowerCase();
  const shown = all.filter(
    (p) =>
      (who === "all" ||
        (who === "me" ? p.mine || same(p.byName, me.name) : mentions(p, who.slice(5)))) &&
      (!q || `${p.title}\n${p.text}\n${p.caption || ""}`.toLocaleLowerCase().includes(q)),
  );
  const featured = shown.find((p) => p.art);
  const quote = shown.find((p) => p.kind === "passage" && p !== featured);
  // The newest passage leads on butter paper, beside the newest entry with a
  // painting; then everything else, newest first.
  const ordered = [
    ...(quote ? [quote] : []),
    ...(featured ? [featured] : []),
    ...shown.filter((p) => p !== featured && p !== quote),
  ];
  const first = all.at(-1);
  const open = all.find((p) => p.id === reading);
  const count = all.length;
  async function takeOut(page: Shown) {
    setRemoving(true);
    try {
      await access.remove(page.id);
      setReading(null);
      onRemoved?.();
    } catch (e) {
      onRemoved?.(
        e instanceof Error ? e.message : "This page couldn’t be taken out. Try again.",
      );
    } finally {
      setRemoving(false);
    }
  }
  return (
    <main className="rp-place rp-family rp-fb" aria-labelledby="rp-family-title">
      {phoneTop}
      <header className="rp-fb-cover">
        <div className="rp-fb-cover-words">
          <h1 id="rp-family-title" ref={headingRef} tabIndex={-1}>
            Our family journal
          </h1>
          <p>
            Everyone in the family reads the same pages{" "}
            <span aria-hidden="true">·</span>{" "}
            {count ? `${count} ${count === 1 ? "entry" : "entries"}` : "No entries yet"}
            {first && (
              <>
                {" "}
                since {new Date(first.date).toLocaleDateString(undefined, { month: "long" })}
              </>
            )}
          </p>
        </div>
        <Sprig className="rp-fb-cover-sprig" tone="gold" />
        {onWrite && (
          <button type="button" className="rp-fb-write" disabled={busy} onClick={onWrite}>
            Add to our family journal
          </button>
        )}
      </header>

      {finished && (
        <section className="rp-finished" aria-label="Game finished">
          <p>
            <strong>A good place to stop.</strong>{" "}
            {finished.savedPageId
              ? "You finished a round and kept a page everyone approved."
              : !gameText(finished)
                ? "Everyone passed. No shared page was saved."
                : finished.contentVersion === 2
                  ? "You finished a round together. Its answers are in your journal; no shared page was kept."
                  : "You finished a round together. No shared page was saved."}
          </p>
          <div className="rp-finished-actions">
            <button className="rp-btn rp-btn-olive" disabled={busy} onClick={() => onCloseFinished(true)}>
              Play another game
            </button>
            <button className="rp-link" disabled={busy} onClick={() => onCloseFinished(false)}>
              Done for now
            </button>
          </div>
        </section>
      )}

      <div className="rp-fb-bar">
        <div className="rp-fb-chips" role="group" aria-label="Show pages from">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={who === c.id}
              onClick={() => setWho(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="rp-fb-tools">
          <label className="rp-fb-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Find something you kept"
              placeholder="Find something you kept"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      </div>

      {active && (
        <button className="rp-fb-resume" disabled={busy} onClick={onResumeGame}>
          <span className="rp-fb-kind">Unfinished game</span>
          <span className="rp-fb-resume-title">Resume {gameNames[active.kind]}</span>
          <span aria-hidden="true">→</span>
        </button>
      )}

      {access.error && (
        <p className="rp-fb-error" role="alert">
          {access.error}{" "}
          <button className="rp-link" onClick={access.refresh}>
            Try again
          </button>
        </p>
      )}

      {ordered.length > 0 ? (
        <ul className="rp-fb-grid" aria-label="Entries in Our family journal">
          {ordered.map((p) => (
            <li
              key={p.id}
              className={
                p === featured ? "rp-fb-featured" : p === quote ? "rp-fb-quote-cell" : undefined
              }
            >
              <PageCard
                page={p}
                featured={p === featured}
                quote={p.kind === "passage"}
                onOpen={() => setReading(p.id)}
              />
            </li>
          ))}
        </ul>
      ) : all.length > 0 ? (
        <p className="rp-quiet rp-fb-none">
          Nothing matches.{" "}
          <button
            className="rp-link"
            onClick={() => {
              setWho("all");
              setQuery("");
            }}
          >
            Show everything
          </button>
        </p>
      ) : access.loading ? (
        <p className="rp-quiet rp-fb-none" role="status">
          Opening Our family journal…
        </p>
      ) : (
        <section className="rp-fb-empty" aria-label="No pages yet">
          <Illustration name="family" size={120} className="rp-fb-empty-art" />
          <div>
            <h2>The first entry is waiting</h2>
            <p>
              Entries get here three ways: Add to our family journal, share a
              passage from My journal, or play a game together.
            </p>
            {access.kind === "local" && (
              <p className="rp-quiet">
                This journal isn’t in an account, so family entries are kept
                on this device. Sign in to share one family journal with
                everyone in your family.
              </p>
            )}
          </div>
        </section>
      )}

      <footer className="rp-fb-foot">
        <p className="rp-quiet">
          Whoever added an entry can take it out.{" "}
        </p>
        <MembersLink
          open={membersOpen}
          onToggle={setMembersOpen}
          me={me}
          members={members}
          busy={busy}
          onOpenMine={onOpenMine}
          onSee={(name) => {
            setWho(`name:${name}`);
            setMembersOpen(false);
          }}
          onAddChild={onAddChild}
          onInvite={onInvite ? () => setInviting(true) : undefined}
        />
        <button className="rp-link" disabled={busy} onClick={onPlay}>
          Play a game
        </button>
      </footer>
      {phoneFoot}

      {open && (
        <Dialog title={open.title || open.label} onClose={() => !removing && setReading(null)}>
          <article className="rp-album-open rp-fb-reader">
            <p className="rp-eyebrow">
              {shortDate(open.date)} · {open.label}
            </p>
            {open.title && <h3>{open.title}</h3>}
            {open.text && (
              <blockquote>
                <MentionText text={open.text} />
              </blockquote>
            )}
            {open.caption && <p className="rp-fb-caption">{open.caption}</p>}
            {!!open.lines?.length && (
              <div className="rp-album-lines">
                {open.lines.map((line, i) => (
                  <p key={i}>
                    <strong>{line.label}:</strong> {line.text}
                  </p>
                ))}
              </div>
            )}
            {open.photos && <PhotoGallery photos={open.photos} access={photos} />}
            <p className="rp-quiet">{open.note}</p>
            {open.removable && (
              <button
                className="rp-link rp-fb-takeout"
                disabled={removing}
                onClick={() => void takeOut(open)}
              >
                {removing ? "Taking it out…" : "Take out of the family journal"}
              </button>
            )}
            {open.deleteId && onDelete && (
              <ConfirmDelete
                label="Delete from my journal"
                question="Delete this from your journal?"
                detail={
                  open.deleteId.startsWith("sent:") || open.deleteId.startsWith("passage:")
                    ? "Only your copy goes; the other journal keeps its own. This can’t be undone."
                    : "It’s removed from this journal on every device. This can’t be undone."
                }
                busy={busy}
                onConfirm={async () => {
                  if (await onDelete(open.deleteId!)) setReading(null);
                }}
              />
            )}
          </article>
        </Dialog>
      )}

      {inviting && onInvite && (
        <InviteSheet
          onClose={() => setInviting(false)}
          onStart={() => {
            setInviting(false);
            onInvite();
          }}
        />
      )}
    </main>
  );
}

function PageCard({
  page,
  featured,
  quote,
  onOpen,
}: {
  page: Shown;
  featured: boolean;
  quote: boolean;
  onOpen: () => void;
}) {
  if (quote && !featured)
    return (
      <button className="rp-fb-card rp-fb-quote" data-page-id={page.id} onClick={onOpen}>
        <span className="ui-sr-only">{page.label}: </span>
        <span className="rp-fb-quote-text">“{page.text.trim()}”</span>
        <span className="rp-fb-caption">
          {page.caption || page.byName} <span aria-hidden="true">·</span> {shortDate(page.date)}
        </span>
        <Sprig className="rp-fb-quote-sprig" berries />
      </button>
    );
  const note = page.playNote;
  const who =
    page.kind === "game"
      ? `Game · ${page.title || page.label}`
      : page.kind === "highlights"
        ? page.label
        : page.mine
          ? "You"
          : page.byName;
  return (
    <button
      className={`rp-fb-card ${featured ? "rp-fb-card-featured" : ""}`}
      data-page-id={page.id}
      onClick={onOpen}
    >
      {featured && page.art && (
        <span className="rp-fb-tile" aria-hidden="true">
          <Illustration name={page.art} size={64} />
        </span>
      )}
      <span className="rp-fb-meta">
        <span>{who}</span>
        <span className="rp-fb-date">{shortDate(page.date)}</span>
      </span>
      <span className="rp-fb-title">
        {note ? page.text.trim().replace(/\.$/, "") : page.title || page.label}
      </span>
      {!note && (
        <span className="rp-fb-text">
          <MentionText text={page.text} />
        </span>
      )}
    </button>
  );
}

function MembersLink({
  open,
  onToggle,
  me,
  members,
  busy,
  onOpenMine,
  onSee,
  onAddChild,
  onInvite,
}: {
  open: boolean;
  onToggle: (open: boolean) => void;
  me: { name: string };
  members: FamilyMember[];
  busy: boolean;
  onOpenMine: () => void;
  onSee: (name: string) => void;
  onAddChild?: () => void;
  onInvite?: () => void;
}) {
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [inviteStatus, setInviteStatus] = useState("");
  const link = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const close = () => {
      onToggle(false);
      link.current?.focus();
    };
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) onToggle(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open, onToggle]);
  const others = members.filter((m) => !same(m.name, me.name));
  const row = (
    key: string,
    name: string,
    index: number,
    action: { label: string; onClick: () => void; aria?: string } | null,
    note?: string,
  ) => (
    <li key={key} className="rp-fb-member">
      <span className={`rp-fb-emblem rp-tone-${personTones[index % personTones.length]}`}>
        <KidCoverMark name={name} />
      </span>
      <span className="rp-fb-member-words">
        <span className="rp-fb-member-name">{name}</span>
        {action && (
          <>
            <span aria-hidden="true"> · </span>
            <button
              type="button"
              className="rp-fb-member-link"
              disabled={busy}
              aria-label={action.aria}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          </>
        )}
        {note && <span className="rp-fb-member-note">{note}</span>}
      </span>
    </li>
  );
  return (
    <div className="rp-fb-members-wrap" ref={wrap}>
      <button
        ref={link}
        type="button"
        className="rp-fb-members-link"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onToggle(!open)}
      >
        <Users size={18} aria-hidden="true" /> <span>Who’s in our family</span>
      </button>
      {open && (
        <>
          <div className="rp-fb-members-backdrop" aria-hidden="true" />
          <div
            ref={panel}
            id={id}
            className="rp-fb-members"
            role="dialog"
            aria-label="Who’s in our family"
            tabIndex={-1}
          >
            <span className="rp-fb-grab" aria-hidden="true" />
            <div className="rp-fb-members-head">
              <h2>Who’s in our family</h2>
              <button
                type="button"
                className="rp-fb-x"
                aria-label="Close who’s in our family"
                onClick={() => {
                  onToggle(false);
                  link.current?.focus();
                }}
              >
                <X size={18} />
              </button>
            </div>
            <ul>
              {row("me", `${me.name} (you)`, 0, {
                label: "Open my journal",
                onClick: () => {
                  onToggle(false);
                  onOpenMine();
                },
              })}
              {others.map((m, i) =>
                row(
                  m.id,
                  m.name,
                  i + 1,
                  m.onOpen
                    ? {
                        label: `Open ${m.name}’s journal`,
                        aria: m.locked
                          ? `Open ${m.name}’s journal, an earlier copy that needs its original passphrase`
                          : `Open ${m.name}’s journal`,
                        onClick: () => {
                          onToggle(false);
                          m.onOpen!();
                        },
                      }
                    : { label: "See what they shared", onClick: () => onSee(m.name) },
                  m.locked ? "Earlier copy · needs its original passphrase" : undefined,
                ),
              )}
            </ul>
            {
              <div className="rp-fb-members-add">
                {onAddChild && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onToggle(false);
                      onAddChild();
                    }}
                  >
                    <span aria-hidden="true">+</span> Add a child
                  </button>
                )}
                {onInvite && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onToggle(false);
                      onInvite();
                    }}
                  >
                    <span aria-hidden="true">+</span> Invite a partner
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    void inviteFriend().then((r) => setInviteStatus(inviteNotice[r]))
                  }
                >
                  <span aria-hidden="true">+</span> Invite a friend
                </button>
                {inviteStatus && (
                  <p className="rp-fb-invite-status" role="status">
                    {inviteStatus}
                  </p>
                )}
              </div>
            }
          </div>
        </>
      )}
    </div>
  );
}

export function InviteSheet({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.focus();
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  return (
    <div className="rp-sheet-backdrop" onClick={onClose}>
      <div
        ref={dialog}
        className="rp-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rp-invite-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rp-sheet-head">
          <h2 id="rp-invite-title">Invite a partner</h2>
          <button className="rp-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <ol className="rp-steps">
          <li>Make an invitation code here and send it to them privately.</li>
          <li>
            They make their own Relish account and enter the code. Their
            journal stays private, just like yours.
          </li>
          <li>Either of you can share an entry with the other, one at a time.</li>
        </ol>
        <button className="rp-btn rp-btn-olive rp-sheet-start" onClick={onStart}>
          Make an invitation code
        </button>
        <p className="rp-quiet">
          A code works once and expires after 24 hours. You can cancel it any
          time.
        </p>
      </div>
    </div>
  );
}
