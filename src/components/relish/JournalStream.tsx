"use client";
import { useId } from "react";
import ConfirmDelete from "./ConfirmDelete";
import type { Book } from "@/lib/relish/model";
import { pageKind, gameNames } from "@/lib/relish/catalog";
import type { JournalEntry } from "@/lib/relish/journal";
import type { ManualCard } from "@/lib/relish/manual";
import { bookPages } from "@/lib/relish/pages";
import { groupStream, sayingOf, sharedNote, type StreamItem } from "@/lib/relish/journal-stream";
import { EVERYONE, seenLabel, type Lane, type TimelineItem } from "@/lib/relish/journal-timeline";
import { Share2, Users } from "lucide-react";
import { sameName } from "@/lib/relish/mentions";
import { namesList } from "@/lib/relish/tools";
import Illustration from "./Illustration";
import MentionText from "./MentionText";
import { exerciseIllustration, gameIllustration, type IllustrationName } from "./illustrations";
import { personTones } from "./Home";
import type { Shown } from "./Family";
import "./journal-stream.css";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const isToday = (iso: string, now: Date) => new Date(iso).toDateString() === now.toDateString();
/** "8:40 PM" today, "Nov 19" before. */
const when = (iso: string, now: Date) => (isToday(iso, now) ? clock(iso) : shortDate(iso));

/** A person's colored initial, matched by name to the people in this journal. */
export function Face({ book, name, small = false }: { book: Book; name: string; small?: boolean }) {
  const i = book.people.findIndex((p) => sameName(p.name, name));
  let n = i;
  if (i < 0) for (const ch of name) n = (Math.max(n, 0) * 31 + ch.charCodeAt(0)) % 997;
  const tone = sameName(name, book.owner) ? "sun" : personTones[Math.max(0, n) % personTones.length];
  return (
    <span className={`rs-face rp-tone-${tone} ${small ? "rs-face-small" : ""}`} aria-hidden="true">
      {name.trim().charAt(0).toLocaleUpperCase()}
    </span>
  );
}

function Tile({ name }: { name: IllustrationName }) {
  return <Illustration name={name} size={46} className="rs-tile" />;
}
const artFor = (i: StreamItem): IllustrationName =>
  (i.game && gameIllustration[i.game]) ||
  (i.toolId && exerciseIllustration[i.toolId]) ||
  "jot";

export type StreamActions = {
  busy: boolean;
  onOpenPage: (id: string) => void;
  onDraft: (draft: JournalEntry) => void;
  onDiscardDraft?: (draft: JournalEntry) => void;
  /** Keep it / Set aside for a line that's waiting. */
  onKeep?: (item: StreamItem) => void;
  onSetAside?: (item: StreamItem) => void;
  /** Write back, when the sender can be sent to. */
  canWriteBack?: (item: StreamItem) => boolean;
  onWriteBack?: (item: StreamItem) => void;
  onOpenFamily?: (pageId: string) => void;
  /** Share a saved private entry (its journal id): whole, or a passage of it. */
  onShare?: (journalId: string) => void;
};

/**
 * The one journal (2026-11-22): Our family journal runs down the spine; what
 * only some people can see branches off it at the moment it happened, saying
 * who can see it. Newest first, under Today / This week / Earlier.
 */
export function TimelineList({
  book,
  items,
  now = new Date(),
  onOpenSpine,
  ownLabel,
  ...actions
}: {
  book: Book;
  items: TimelineItem<Shown>[];
  now?: Date;
  /** Opens a page of Our family journal to read. */
  onOpenSpine: (page: Shown) => void;
  /**
   * How a page of your own is labelled, instead of "Only you": a child's
   * journal can be opened by their grown-up, so it never claims that.
   */
  ownLabel?: string;
} & StreamActions) {
  return (
    <div className="rt-timeline">
      {groupStream(items, now).map((g) => (
        <section key={g.label} className="rs-group rt-group" aria-label={g.label}>
          <h3 className="rs-when rt-when">{g.label}</h3>
          <ul className="rt-items">
            {g.items.map((t) => (
              <li key={t.key} className={`rt-item rt-${t.lane}`}>
                {t.page ? (
                  <SpineCard book={book} t={t} page={t.page} now={now} onOpen={onOpenSpine} {...actions} />
                ) : (
                  <StreamCard
                    book={book}
                    item={t.item!}
                    now={now}
                    lane={t.lane}
                    seenWith={t.seenWith}
                    ownLabel={ownLabel}
                    {...actions}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Who can see a branch: "Only you", or "You and Anna" with their faces. */
function Seen({ book, names, own }: { book: Book; names: string[]; own?: string }) {
  if (!names.length && own) return <span className="rs-lock rt-seen">{own}</span>;
  const label = seenLabel(names);
  return (
    <span className="rs-lock rt-seen" title={`Who can see this: ${label}`}>
      {names.length ? (
        <span className="rt-seen-faces" aria-hidden="true">
          {names.slice(0, 3).map((n) => (
            <Face key={n} book={book} name={n} small />
          ))}
        </span>
      ) : (
        <LockIcon />
      )}
      {label}
    </span>
  );
}
function LockIcon() {
  return (
    <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
/** On the spine: everyone in the family can read it. */
function Everyone() {
  return (
    <span className="rt-everyone">
      <Users size={14} aria-hidden="true" /> {EVERYONE}
    </span>
  );
}

/** What a page of Our family journal is to this writer, when it's more than a page. */
function tagOf(i: StreamItem | undefined, page: Shown) {
  if (!i) return "";
  if (i.kind === "mention") return `${i.from || page.byName} mentioned you`;
  if (i.kind === "sent") return `${i.from || page.byName} sent you this`;
  if (i.kind === "played") return i.familyPage ? `${i.from} played with you` : "";
  // Your own entry, shared whole from its private page: the page is still yours alone.
  if (i.kind === "wrote" && i.shared?.whole) return "Shared from your private page";
  return "";
}

/** A page of Our family journal on the spine: on butter paper, for everyone. */
function SpineCard({
  book,
  page: p,
  t,
  now,
  busy,
  onOpen,
  onKeep,
  onSetAside,
  canWriteBack,
  onWriteBack,
}: { book: Book; t: TimelineItem<Shown>; page: Shown; now: Date; onOpen: (page: Shown) => void } & StreamActions) {
  const i = t.item;
  const date = when(p.date, now);
  const tag = tagOf(i, p);
  const quote = p.kind === "passage" && !p.title;
  const what = p.kind === "highlights" || (p.kind === "game" && !p.playNote) ? ` · ${p.label}` : "";
  const head = (
    <span className="rs-from">
      {p.art ? (
        <Tile name={p.art} />
      ) : (
        <Face book={book} name={p.mine ? book.owner : p.byName.split(" + ")[0]} />
      )}
      <span>
        <strong>{p.mine ? "You" : p.byName}</strong>
        {what} · {date}
      </span>
      <span className="rt-marks">
        {i?.offer && <span className="rs-new">New</span>}
        <Everyone />
      </span>
    </span>
  );
  const body = (
    <>
      {tag && <span className="rt-tag">{tag}</span>}
      {quote ? (
        <>
          <span className="rs-quote rt-quote">“{p.text.trim()}”</span>
          {p.caption && <span className="rs-caption">{p.caption}</span>}
        </>
      ) : p.playNote ? (
        <span className="rp-page-title rt-note-title">{p.text.trim().replace(/\.$/, "")}</span>
      ) : (
        <>
          {p.title && <span className="rp-page-title">{p.title}</span>}
          <span className="rp-page-excerpt rs-body">
            <MentionText text={p.text} />
          </span>
        </>
      )}
    </>
  );
  // A page passed on from a partner, waiting: keep it or set it aside here.
  if (i?.offer) {
    const from = i.from || p.byName;
    const reply = !!onWriteBack && !!canWriteBack?.(i);
    return (
      <article className="rp-entry rs-card rs-butter rt-card" aria-label={`${from} sent you this`}>
        {head}
        {body}
        <span className="rp-entry-actions">
          {reply && (
            <button className="rp-link" disabled={busy} onClick={() => onWriteBack!(i)}>
              Write back
            </button>
          )}
          {onKeep && (
            <button className="rp-link" disabled={busy} onClick={() => onKeep(i)}>
              Keep it
            </button>
          )}
          {onSetAside && (
            <button className="rp-link rp-link-quiet" disabled={busy} onClick={() => onSetAside(i)}>
              Set aside
            </button>
          )}
          <button className="rp-link" disabled={busy} data-page-id={p.id} onClick={() => onOpen(p)}>
            Read the whole entry
          </button>
        </span>
      </article>
    );
  }
  return (
    <button
      className="rp-page rp-entry rs-card rs-butter rt-card"
      data-page-id={p.id}
      disabled={busy}
      onClick={() => onOpen(p)}
    >
      {head}
      {body}
    </button>
  );
}

export function StreamCard({
  book,
  item: i,
  now,
  busy,
  onOpenPage,
  onDraft,
  onDiscardDraft,
  onKeep,
  onSetAside,
  canWriteBack,
  onWriteBack,
  onOpenFamily,
  lane = "branch",
  seenWith = [],
  ownLabel,
  onShare,
}: {
  book: Book;
  item: StreamItem;
  now: Date;
  lane?: Lane;
  seenWith?: string[];
  ownLabel?: string;
} & StreamActions) {
  const titleId = useId();
  const date = when(i.date, now);
  // A branch says who can see it; the odd stream item on the spine, everyone.
  const seen = (
    <span className="rt-marks">
      {i.offer && <span className="rs-new">New</span>}
      {lane === "branch" ? <Seen book={book} names={seenWith} own={ownLabel} /> : <Everyone />}
    </span>
  );
  if (i.draft) {
    const d = i.draft;
    const title = d.title.trim() || d.text.trim().split("\n")[0].slice(0, 60) || "An unfinished page";
    return (
      <article className="rp-entry rp-entry-draft rs-card">
        <span className="rs-from">
          <Tile name={artFor(i)} />
          <span>
            <strong>{d.audience === "family" ? "Draft for our family journal" : "Your draft"}</strong> · {date}
          </span>
          {seen}
        </span>
        <span className="rp-page-title">{title}</span>
        {d.text.trim() && (
          <span className="rp-page-excerpt">
            <MentionText text={d.text.split("\n")[0]} />
          </span>
        )}
        <span className="rp-entry-actions">
          <button className="rp-link" disabled={busy} onClick={() => onDraft(d)}>
            <span className="ui-sr-only">{d.title.trim() || "Your draft"}: </span>
            Keep writing
          </button>
          {onDiscardDraft && (
            <ConfirmDelete
              label="Discard"
              icon={false}
              ariaLabel={`Discard ${d.title.trim() || "this draft"}`}
              question="Discard this draft?"
              yes="Yes, discard"
              busy={busy}
              className="rp-link rp-link-quiet"
              onConfirm={() => onDiscardDraft(d)}
            />
          )}
        </span>
      </article>
    );
  }
  if (i.kind === "sent") {
    const from = i.from || "Someone";
    const reply = !!onWriteBack && !!canWriteBack?.(i);
    return (
      <article
        className={`rp-entry rs-card ${lane === "spine" ? "rs-butter" : ""}`}
        aria-label={`${from} sent you this`}
      >
        <span className="rs-from">
          <Face book={book} name={from} />
          <span>
            <strong>{from} sent you this</strong>
            {i.direct ? "" : " · shared with the family"} · {date}
          </span>
          {seen}
        </span>
        <blockquote className="rs-quote">“{i.text.trim()}”</blockquote>
        {(i.caption || i.direct) && (
          <span className="rs-caption">
            {[i.caption, `from ${from}’s journal`].filter(Boolean).join(" · ")}
          </span>
        )}
        {i.note && <p className="rs-note">{i.note}</p>}
        <span className="rp-entry-actions">
          {reply && (
            <button className="rp-link" disabled={busy} onClick={() => onWriteBack!(i)}>
              Write back
            </button>
          )}
          {i.offer ? (
            <>
              {onKeep && (
                <button className="rp-link" disabled={busy} onClick={() => onKeep(i)}>
                  Keep it
                </button>
              )}
              {onSetAside && (
                <button className="rp-link rp-link-quiet" disabled={busy} onClick={() => onSetAside(i)}>
                  Set aside
                </button>
              )}
            </>
          ) : (
            i.page && (
              <button className="rp-link" disabled={busy} data-page-id={i.page.id} onClick={() => onOpenPage(i.page!.id)}>
                Open
              </button>
            )
          )}
        </span>
      </article>
    );
  }
  if (i.kind === "mention") {
    const from = i.from || "Someone";
    return (
      <article className="rp-entry rs-card rs-butter" aria-label={`${from} mentioned you`}>
        <span className="rs-from">
          <Face book={book} name={from} />
          <span>
            <strong>{from} mentioned you</strong> · in Our family journal · {date}
          </span>
          {seen}
        </span>
        {i.title && <span className="rp-page-title">{i.title}</span>}
        <span className="rp-page-excerpt rs-body">
          <MentionText text={i.text} />
        </span>
        {onOpenFamily && i.familyPage && (
          <span className="rp-entry-actions">
            <button className="rp-link" disabled={busy} onClick={() => onOpenFamily(i.familyPage!.id)}>
              Read the whole entry
            </button>
          </span>
        )}
      </article>
    );
  }
  if (i.kind === "you-sent") {
    const to = i.to?.length ? namesList(i.to) : "your partner";
    return (
      <article className="rp-entry rs-card" aria-label={`You sent ${to}`}>
        <span className="rs-from">
          <Tile name={artFor(i)} />
          <span>
            <strong>You sent {to}</strong>
            {i.title ? ` · from ${i.title}` : ""} · {date}
          </span>
          {seen}
        </span>
        <span className="rs-sent">“{i.text.trim()}”</span>
        {i.note && <p className="rs-note">{i.note}</p>}
      </article>
    );
  }
  if (i.kind === "played" && i.familyPage) {
    const game = (i.game && gameNames[i.game]) || i.title;
    return (
      <article className="rp-entry rs-card">
        <span className="rs-from">
          <Tile name={artFor(i)} />
          <span>
            <strong>
              {i.from} played {game} with you
            </strong>{" "}
            · in Our family journal · {date}
          </span>
          {seen}
        </span>
        {onOpenFamily && (
          <span className="rp-entry-actions">
            <button className="rp-link" disabled={busy} onClick={() => onOpenFamily(i.familyPage!.id)}>
              See it in Our family journal
            </button>
          </span>
        )}
      </article>
    );
  }
  // Something in this journal: a page you wrote, or a game you played.
  const page = i.page!;
  const kind = pageKind(page);
  const played = i.kind === "played";
  const label = played
    ? `You played ${page.title}`
    : kind.label === "Journal"
      ? "You wrote"
      : `${kind.label}${page.exercise && !page.title.includes(page.exercise) ? ` · ${page.exercise}` : ""}`;
  const note = sharedNote(i.shared);
  const card = (
    <button
      className={`rp-page rp-entry rs-card rp-edge-${kind.tone}`}
      data-page-id={page.id}
      disabled={busy}
      onClick={() => onOpenPage(page.id)}
    >
      <span className="rs-from">
        <Tile name={artFor(i)} />
        <span>
          <strong>{label}</strong> · {date}
        </span>
        {seen}
      </span>
      {!played && (
        <span className="rp-page-title" id={titleId}>
          {page.title}
        </span>
      )}
      <span className="rp-page-excerpt">
        <MentionText text={page.text.split("\n")[0] || "Photo entry"} />
      </span>
      {note && <span className="rp-entry-note">{note}</span>}
    </button>
  );
  // A page you wrote can be shared from here: whole, or a passage of it.
  if (!onShare || played || !page.journalId) return card;
  return (
    <div className="rt-shareable">
      {card}
      <button
        type="button"
        className="rp-link rt-share"
        disabled={busy}
        aria-describedby={titleId}
        onClick={() => onShare(page.journalId!)}
      >
        <Share2 size={15} aria-hidden="true" /> Share
      </button>
    </div>
  );
}

/**
 * The side column: Relish noticed (a reflection for grown-ups, when there is
 * one), what the family says about you, and what this view can and can't see.
 */
export function StreamSide({
  book,
  busy,
  suggestion,
  about,
  sayings,
  onReview,
  onSeeAll,
}: {
  book: Book;
  busy: boolean;
  suggestion?: ManualCard;
  /** Who the suggestion is about, in words ("Anna", "You"). */
  about: string;
  sayings: StreamItem[];
  onReview: (card: ManualCard, status: "kept" | "dismissed") => void;
  onSeeAll: () => void;
}) {
  const pages = bookPages(book);
  const dateOf = (id: string) => pages.find((p) => p.id === id)?.date;
  return (
    <aside className="rs-side" aria-label="About you">
      {suggestion && (
        <section className="rs-panel" aria-labelledby="rs-noticed">
          <div className="rs-panel-head">
            <Illustration name="guided-listen" size={58} className="rs-panel-art" />
            <div>
              <h2 id="rs-noticed">Relish noticed</h2>
              <p className="rs-fine">About {about}</p>
            </div>
          </div>
          <p className="rs-noticed-title">{suggestion.title}</p>
          <p className="rs-noticed-why">{suggestion.observation}</p>
          {suggestion.sources.length > 0 && (
            <div className="rs-sources">
              <span className="rs-sources-head">Drawn from</span>
              {suggestion.sources.map((s) => {
                const d = dateOf(s.id);
                return (
                  <span key={s.id}>
                    <Face book={book} name={book.owner} small />
                    Your {s.title.toLocaleLowerCase()}
                    {d ? ` · ${shortDate(d)}` : ""}
                  </span>
                );
              })}
            </div>
          )}
          <div className="rs-panel-actions">
            <button className="rs-ghost" disabled={busy} onClick={() => onReview(suggestion, "kept")}>
              Keep it
            </button>
            <button className="rs-ghost rs-ghost-quiet" disabled={busy} onClick={() => onReview(suggestion, "dismissed")}>
              Not quite
            </button>
          </div>
        </section>
      )}
      {sayings.length > 0 && (
        <section className="rs-panel rs-says" aria-labelledby="rs-says">
          <h2 id="rs-says">What your family says about you</h2>
          <p className="rs-fine">Lines others chose to send or share, kept together.</p>
          <ul>
            {sayings.slice(0, 3).map((s) => (
              <li key={s.key}>
                <Face book={book} name={s.from || ""} small />
                <span>
                  “<MentionText text={sayingOf(s, book.owner)} />” · {shortDate(s.date)}
                </span>
              </li>
            ))}
          </ul>
          <button className="rp-link" disabled={busy} onClick={onSeeAll}>
            See all {sayings.length}
          </button>
        </section>
      )}
      <p className="rs-privacy">
        The middle is the same for everyone in the family. Each branch says who
        can see it, and nobody else does. Nothing from anyone’s private entries
        shows up here, only what they chose to send or share. Relish’s
        reflections are for grown-ups and can be turned off.
      </p>
    </aside>
  );
}

