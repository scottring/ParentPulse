"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Book } from "@/lib/relish/model";
import {
  gameText,
  livingOf,
  reflectionSections,
  type GameKind,
} from "@/lib/relish/living";
import type { PhotoAccess } from "@/lib/relish/photos";
import type { Tone } from "@/lib/relish/catalog";
import Illustration from "./Illustration";
import { KidCoverMark } from "./KidHome";
import { PhotoGallery } from "./Photos";
import { personTones, type FamilyPerson } from "./Home";

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

/** Everything in this book that is shared: never a private page. */
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

export function passedBetween(book: Book) {
  const c = book.connections;
  return [
    ...(c?.received || []).map((p) => ({
      id: `in:${p.id}`,
      who: `From ${p.fromName}`,
      tone: "sage" as Tone,
      title: p.title,
      text: p.text,
      date: p.acceptedAt,
    })),
    ...(c?.outgoing || [])
      .filter((o) => o.sent)
      .map((o) => ({
        id: `out:${o.id}`,
        who: "You sent",
        tone: "sun" as Tone,
        title: o.title,
        text: o.text,
        date: o.createdAt,
      })),
  ].toSorted((a, b) => b.date.localeCompare(a.date));
}

export default function Family({
  book,
  people,
  busy,
  headingRef,
  photos,
  canShare,
  onInvite,
  onAddChild,
  onShare,
  onPlay,
  onResumeGame,
  onCloseFinished,
}: {
  book: Book;
  people: FamilyPerson[];
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  photos?: PhotoAccess;
  /** Adult books can pass pages to a partner's book. */
  canShare: boolean;
  onInvite?: () => void;
  onAddChild?: () => void;
  onShare: () => void;
  onPlay: () => void;
  onResumeGame: () => void;
  onCloseFinished: (again: boolean) => void;
}) {
  const [inviting, setInviting] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const l = livingOf(book);
  const active = l.game && l.game.stage !== "finished" ? l.game : undefined;
  const finished = l.game?.stage === "finished" ? l.game : undefined;
  const album = albumOf(book);
  const passed = passedBetween(book);
  const open = album.find((a) => a.id === reading);
  return (
    <main className="rp-place rp-family" aria-labelledby="rp-family-title">
      <section className="rp-stack-tight">
        <div className="rp-place-head">
          <div>
            <h1 id="rp-family-title" ref={headingRef} tabIndex={-1}>
              Your family
            </h1>
            <p className="rp-lede">
              {book.profile?.kind === "child"
                ? "What your family has made together."
                : "Everyone’s book, and what you’ve chosen to share. Nothing private leaves a book unless you send it."}
            </p>
          </div>
          <Illustration name="family" size={120} eager className="rp-place-art" />
        </div>
      </section>

      {finished && (
        <section className="rp-finished" aria-label="Game finished">
          <p>
            <strong>A good place to stop.</strong>{" "}
            {finished.savedPageId
              ? "You finished a round and kept a page everyone approved."
              : !gameText(finished)
                ? "Everyone passed. No shared page was saved."
                : finished.contentVersion === 2
                  ? "You finished a round together. Its answers are in Your book; no shared page was kept."
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

      <section aria-label="People" className="rp-people">
        {people.map((p, i) => (
          <button
            key={p.id}
            className={`rp-person rp-tone-${personTones[i % personTones.length]}`}
            disabled={busy}
            onClick={p.onOpen}
            aria-label={
              !p.hasBook
                ? undefined
                : p.locked
                  ? `Open ${p.name}’s book, an earlier copy that needs its original passphrase`
                  : `Open ${p.name}’s book`
            }
          >
            {p.hasBook ? (
              <span className="rp-person-dot rp-person-emblem">
                <KidCoverMark name={p.name} />
              </span>
            ) : (
              <span className="rp-person-dot" aria-hidden="true">
                {p.name.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="rp-person-words">
              <span className="rp-person-name">{p.name}</span>
              <span>
                {p.locked
                  ? "Earlier copy · needs its original passphrase"
                  : p.note || "Book in your account"}
              </span>
              <span className="rp-person-open">
                {p.hasBook ? `Open ${p.name}’s book →` : `See my pages about ${p.name} →`}
              </span>
            </span>
          </button>
        ))}
        {onInvite && (
          <button
            className="rp-person rp-person-invite"
            disabled={busy}
            onClick={() => setInviting(true)}
          >
            <span className="rp-person-dot rp-tone-sun" aria-hidden="true">
              +
            </span>
            <span className="rp-person-words">
              <span className="rp-person-name">Invite a partner</span>
              <span>They get their own private book. You each choose what to share.</span>
            </span>
          </button>
        )}
        {onAddChild && (
          <button className="rp-person rp-person-add" disabled={busy} onClick={onAddChild}>
            <span className="rp-person-add-title">+ Add a child</span>
            <span className="rp-quiet">Their book lives in your account. No login needed.</span>
          </button>
        )}
        {!people.length && !onInvite && !onAddChild && (
          <p className="rp-quiet">
            {book.profile?.kind === "child"
              ? "A grown-up can switch books from the menu."
              : "Sign in from the menu to keep your family’s books together."}
          </p>
        )}
      </section>

      <div className="rp-pair">
        {canShare && (
          <section className="rp-panel rp-passed" aria-labelledby="rp-passed-title">
            <div className="rp-panel-head">
              <h2 id="rp-passed-title">Passed between you</h2>
              <button className="rp-link" disabled={busy} onClick={onShare}>
                Choose a page to share
              </button>
            </div>
            {passed.length ? (
              <div className="rp-passed-list">
                {passed.slice(0, 8).map((p) => (
                  <div key={p.id} className="rp-passed-item">
                    <span className={`rp-pill rp-tone-${p.tone}`}>{p.who}</span>
                    <span className="rp-stack-tight">
                      <span className="rp-going-title">{p.title}</span>
                      <span className="rp-row-date">
                        {p.text.split("\n")[0].slice(0, 120)} · {shortDate(p.date)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rp-quiet">
                Shows up once a partner joins. Until then, this is where their
                shared pages will land.
              </p>
            )}
          </section>
        )}

        <section className="rp-panel rp-album" aria-labelledby="rp-album-title">
          <div className="rp-panel-head">
            <h2 id="rp-album-title">Family album</h2>
            <button className="rp-link" disabled={busy} onClick={onPlay}>
              Play a game
            </button>
          </div>
          {(active || album.length > 0) && (
            <div className="rp-album-grid">
              {active && (
                <button
                  className="rp-album-tile rp-album-resume"
                  disabled={busy}
                  onClick={onResumeGame}
                >
                  <span className="rp-album-label">Unfinished game</span>
                  <span className="rp-album-title">
                    Resume {gameNames[active.kind]}
                  </span>
                </button>
              )}
              {album.map((a) => (
                <button
                  key={a.id}
                  className={`rp-album-tile rp-tone-${a.tone}`}
                  aria-expanded={reading === a.id}
                  onClick={() => setReading(reading === a.id ? null : a.id)}
                >
                  <span className="rp-album-label">{a.label}</span>
                  <span className="rp-album-title">{a.title}</span>
                </button>
              ))}
            </div>
          )}
          {open && (
            <article className="rp-album-open">
              <p className="rp-eyebrow">{shortDate(open.date)} · {open.label}</p>
              <h3>{open.title}</h3>
              {open.text && <blockquote>{open.text}</blockquote>}
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
            </article>
          )}
          {!active && !album.length && (
            <p className="rp-quiet">
              No shared pages yet. A game can be enough on its own; keeping a
              page is always optional.
            </p>
          )}
        </section>
      </div>

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

function InviteSheet({
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
            They make their own Relish account and enter the code. Their book
            stays private, just like yours.
          </li>
          <li>Either of you can share a page with the other, one page at a time.</li>
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
