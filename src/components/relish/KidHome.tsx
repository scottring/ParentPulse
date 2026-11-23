"use client";
import { useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Camera, Mic, Pencil } from "lucide-react";
import type { Book } from "@/lib/relish/model";
import { audienceOf } from "@/lib/relish/profiles";
import type { Nudge, NudgeAction } from "@/lib/relish/nudges";
import type { DoFilter } from "@/lib/relish/catalog";
import Illustration, { Emblem } from "./Illustration";
import PhotoPick from "./PhotoPick";
import {
  emblemFor,
  exerciseIllustration,
  gameIllustration,
  kidBannerIllustration,
  isPainted,
  illustrationSrc,
  type IllustrationName,
} from "./illustrations";
import { icons } from "./Home";
import { coverFor } from "./covers";

/** The picture beside a kid suggestion. */
function nudgeArt(action: NudgeAction): IllustrationName {
  if (action.kind === "exercise")
    return exerciseIllustration[action.id] ?? "do-something";
  if (action.kind === "game") return gameIllustration[action.game] ?? "do-something";
  if (action.kind === "reflect") return "think-it-through";
  return "jot";
}

/**
 * A child's own cloth-covered book: Scott's blank cloth cover with the
 * name drawn in code and their gold emblem. Falls back to a drawn cover.
 */
export function KidCover({ name }: { name: string }) {
  // The same cloth and emblem as this child's cover on the family shelf.
  const cover = coverFor(name);
  const emblem = cover.emblem;
  const emblemArt = `emblem-${emblem}` as IllustrationName;
  const [broken, setBroken] = useState(false);
  const cloth = { "--cloth": cover.color } as CSSProperties;
  if (isPainted("kid-cover") && !broken)
    return (
      <div
        className="rk-cover rk-cover-painted"
        aria-hidden="true"
        data-emblem={emblem}
        data-cloth={cover.cloth}
        style={cloth}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="rk-cover-photo"
          src={illustrationSrc("kid-cover")}
          alt=""
          width={900}
          height={900}
          loading="eager"
          decoding="async"
          onError={() => setBroken(true)}
        />
        {/* Re-dye the painted olive cloth (masked by kid-cover-cloth.png):
            darken it, then take the cloth's hue and saturation. The pages
            and ribbon stay as painted. */}
        <span className="rk-cover-shade" />
        <span className="rk-cover-dye" />
        <span className="rk-cover-face">
          <span className="rk-cover-name">
            {name}’s
            <br />
            journal
          </span>
          <Illustration name={emblemArt} size="56%" eager className="rk-cover-emblem" />
        </span>
      </div>
    );
  return (
    <div
      className="rk-cover"
      aria-hidden="true"
      data-emblem={emblem}
      data-cloth={cover.cloth}
      style={cloth}
    >
      <span className="rk-cover-pages" />
      <span className="rk-cover-cloth">
        <span className="rk-cover-name">
          {name}’s
          <br />
          journal
        </span>
        <svg className="rk-cover-emblem" viewBox="0 0 200 200" focusable="false">
          <Emblem kind={emblem} />
        </svg>
      </span>
      <span className="rk-cover-ribbon" />
    </div>
  );
}

/** The emblem alone, for the inside cover of a child's Your journal. */
export function KidCoverMark({ name }: { name: string }) {
  const emblem = emblemFor(name);
  return (
    <span className="rk-mark" aria-hidden="true" data-emblem={emblem}>
      <Illustration name={`emblem-${emblem}` as IllustrationName} size="100%" eager />
    </span>
  );
}

/**
 * Home for a child's book: their book, three ways to add a page, one
 * suggestion fitted to their age, and a few more things to try.
 */
export default function KidHome({
  book,
  list,
  start,
  busy,
  headingRef,
  onNudge,
  onFilter,
  onBook,
  onWrite,
  onRecord,
  onPhoto,
}: {
  book: Book;
  list: Nudge[];
  start: number;
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onNudge: (action: NudgeAction) => void;
  onFilter: (filter: DoFilter) => void;
  onBook: () => void;
  onWrite?: () => void;
  onRecord?: () => void;
  onPhoto?: (file: File) => void;
}) {
  const [i, setI] = useState(start);
  const nudge = list[i % Math.max(list.length, 1)];
  const name = book.owner.trim() || "you";
  const audience = audienceOf(book);
  // One invitation per age: a four-year-old's grown-up does the writing,
  // a teenager gets a question that doesn't talk down.
  const question =
    audience === "under-6"
      ? "What did you play today?"
      : audience === "13-17"
        ? "Anything from today worth keeping?"
        : "What did you notice today?";
  const more: { filter: DoFilter; label: string; icon: ReactNode }[] = [
    { filter: "5", label: "Try an exercise", icon: icons.exercise },
    { filter: "kids", label: "Play a game", icon: icons.game },
    { filter: "hard", label: "Think it through", icon: icons.think },
  ];
  return (
    <main className="rp-place rk-home" aria-labelledby="rk-home-title">
      <section className="rk-hero">
        <KidCover name={name} />
        <div className="rk-hello">
          <h1 id="rk-home-title" ref={headingRef} tabIndex={-1}>
            Hi, {name}.
          </h1>
          <p className="rk-question">{question}</p>
          {audience === "under-6" && (
            <p className="lb-age-cue rk-cue">
              Grown-up: read this aloud, then write down what they say, or add
              a photo of it.
            </p>
          )}
          <div className="rk-add" role="group" aria-label="Add a page">
            {onWrite && (
              <button type="button" disabled={busy} onClick={onWrite}>
                <Pencil size={26} strokeWidth={1.6} aria-hidden="true" /> Write
              </button>
            )}
            {onRecord && (
              <button type="button" disabled={busy} onClick={onRecord}>
                <Mic size={26} strokeWidth={1.6} aria-hidden="true" /> Record
              </button>
            )}
            {onPhoto && (
              <PhotoPick disabled={busy} onFile={onPhoto}>
                <Camera size={26} strokeWidth={1.6} aria-hidden="true" /> Add a
                photo
              </PhotoPick>
            )}
          </div>
          <button type="button" className="ui-link rk-open" disabled={busy} onClick={onBook}>
            Open your journal
          </button>
        </div>
      </section>
      {nudge && (
        <section className="rk-banner" aria-label="Something to try">
          <div className="rk-banner-art">
            <Illustration
              name={kidBannerIllustration[nudge.id] ?? nudgeArt(nudge.action)}
              size="100%"
            />
          </div>
          <div className="rk-banner-text">
            <h2 aria-live="polite">{nudge.title ?? nudge.text}</h2>
            <p>{nudge.title ? nudge.text : nudge.why}</p>
            <div className="rk-banner-actions">
              <button
                type="button"
                className="rk-start"
                disabled={busy}
                onClick={() => onNudge(nudge.action)}
              >
                {nudge.cta}
              </button>
              {list.length > 1 && (
                <button
                  type="button"
                  className="ui-link"
                  onClick={() => setI((n) => n + 1)}
                >
                  Show me another
                </button>
              )}
            </div>
          </div>
        </section>
      )}
      <section className="rk-more" aria-labelledby="rk-more-title">
        <h2 id="rk-more-title">More to try</h2>
        <div className="rk-more-links">
          {more.map((m) => (
            <button
              key={m.filter}
              type="button"
              className="ui-link"
              disabled={busy}
              onClick={() => onFilter(m.filter)}
            >
              <span className="rk-more-icon">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
