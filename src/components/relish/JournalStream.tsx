"use client";
import ConfirmDelete from "./ConfirmDelete";
import type { Book } from "@/lib/relish/model";
import { pageKind, gameNames } from "@/lib/relish/catalog";
import type { JournalEntry } from "@/lib/relish/journal";
import type { ManualCard } from "@/lib/relish/manual";
import { bookPages } from "@/lib/relish/pages";
import { groupStream, sayingOf, type StreamItem } from "@/lib/relish/journal-stream";
import { sameName } from "@/lib/relish/mentions";
import { namesList } from "@/lib/relish/tools";
import Illustration from "./Illustration";
import MentionText from "./MentionText";
import { exerciseIllustration, gameIllustration, type IllustrationName } from "./illustrations";
import { personTones } from "./Home";
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

/** "One line shared to Our family journal · Sent to Anna": where an entry went. */
function sharedNote(i: StreamItem) {
  const s = i.shared;
  if (!s) return "";
  return [
    s.lines ? `${s.lines === 1 ? "One line" : `${s.lines} lines`} shared to Our family journal` : "",
    s.page ? "Also in our family journal" : "",
    s.sentTo.length ? `Sent to ${namesList(s.sentTo)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

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
};

/** The stream, newest first, under Today / This week / Earlier. */
export function StreamList({
  book,
  items,
  now = new Date(),
  ...actions
}: { book: Book; items: StreamItem[]; now?: Date } & StreamActions) {
  return (
    <>
      {groupStream(items, now).map((g) => (
        <section key={g.label} className="rs-group" aria-label={g.label}>
          <h3 className="rs-when">{g.label}</h3>
          <ul className="rp-entries rs-items">
            {g.items.map((item) => (
              <li key={item.key}>
                <StreamCard book={book} item={item} now={now} {...actions} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Lock() {
  return (
    <span className="rs-lock">
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      Only me
    </span>
  );
}

function StreamCard({
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
}: { book: Book; item: StreamItem; now: Date } & StreamActions) {
  const date = when(i.date, now);
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
      <article className="rp-entry rs-card rs-butter" aria-label={`${from} sent you this`}>
        <span className="rs-from">
          <Face book={book} name={from} />
          <span>
            <strong>{from} sent you this</strong>
            {i.direct ? "" : " · shared with the family"} · {date}
          </span>
          {i.offer && <span className="rs-new">New</span>}
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
          {i.direct && <span className="rs-fine">Only you and {from} see this</span>}
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
  const note = sharedNote(i);
  const familyEntry = i.shared?.page && !i.shared.lines && !i.shared.sentTo.length;
  return (
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
        {!played && !familyEntry && <Lock />}
      </span>
      {!played && <span className="rp-page-title">{page.title}</span>}
      <span className="rp-page-excerpt">
        <MentionText text={page.text.split("\n")[0] || "Photo entry"} />
      </span>
      {note && <span className="rp-entry-note">{note}</span>}
    </button>
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
        Only you see this view. Nothing from anyone’s private entries shows up
        here, only what they chose to send or share. Relish’s reflections are
        for grown-ups and can be turned off.
      </p>
    </aside>
  );
}

