"use client";
import {
  ArrowRight,
  BookOpen,
  Feather,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";
import type { Book } from "@/lib/relish/model";
import type { JournalDraft } from "@/lib/relish/journal";
import { livingOf, nextKind } from "@/lib/relish/living";
import { audienceOf } from "@/lib/relish/profiles";
import { guidanceFor } from "@/lib/relish/guidance";
import "./activities.css";

export default function Activities({
  book,
  busy,
  onWrite,
  onGuided,
  onPlay,
  onPages,
  onManual,
  pendingInsights = 0,
}: {
  book: Book;
  busy: boolean;
  onWrite: (voice?: boolean, draft?: JournalDraft) => void;
  onGuided: () => void;
  onPlay: () => void;
  onPages: () => void;
  onManual: () => void;
  pendingInsights?: number;
}) {
  const living = livingOf(book);
  const unfinishedVisit = living.visit && living.visit.status !== "complete";
  const plan =
    guidanceFor(book).plans[
      unfinishedVisit ? living.visit!.kind : nextKind(book)
    ];
  const game = living.game && living.game.stage !== "finished";
  const drafts = (book.journal || [])
    .filter((entry) => entry.status === "draft")
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <main className="ra-book" aria-labelledby="ra-title">
      <section className="ra-welcome">
        <p className="lb-kicker">
          The {book.owner} edition · make a little space
        </p>
        <h2 id="ra-title">What would you like to do?</h2>
        <p className="ra-intro">
          Pick what fits right now. One small activity can be your whole visit.
        </p>
      </section>
      <section className="ra-choices" aria-label="Choose an activity">
        <article className="ra-choice ra-write">
          <div className="ra-choice-heading">
            <button
              className="ra-voice"
              disabled={busy}
              onClick={() => onWrite(true)}
              aria-label="Speak a journal entry"
              title="Speak a journal entry"
            >
              <Mic size={19} />
            </button>
            <span className="lb-kicker">
              {audienceOf(book) === "under-6"
                ? "With a grown-up"
                : "Your own words"}{" "}
              · about 1–5 minutes
            </span>
          </div>
          <h3>Personal journal</h3>
          <p>
            Write, talk, or add a photo. Anything on your mind belongs here.
          </p>
          <p className="ra-end">
            <strong>Finished when</strong> you keep one page. A sentence or a
            photo is plenty.
          </p>
          <div className="ra-actions">
            <button
              className="lb-primary"
              disabled={busy}
              onClick={() => onWrite()}
            >
              Write a journal entry <ArrowRight size={17} />
            </button>
          </div>
          {drafts[0] && (
            <button
              className="lb-text ra-resume"
              disabled={busy}
              onClick={() => onWrite(false, drafts[0])}
            >
              Continue my last page <ArrowRight size={15} />
            </button>
          )}
        </article>
        <article className="ra-choice ra-guided">
          <div className="ra-choice-heading">
            <Sparkles size={24} aria-hidden="true" />
            <span className="lb-kicker">
              With prompts · {plan.time.replace(/^About /, "about ")}
            </span>
          </div>
          <h3>Guided reflection</h3>
          <p>
            {unfinishedVisit
              ? "Your words are kept. Pick up the same step."
              : "A few gentle prompts when you’re not sure where to start."}
          </p>
          <p className="ra-next">
            <strong>{unfinishedVisit ? "Continue:" : "Up next:"}</strong>{" "}
            {plan.title}
          </p>
          <p className="ra-end">
            <strong>Your stopping point:</strong> {plan.end.split(". ")[0]}.
          </p>
          <button className="lb-primary" disabled={busy} onClick={onGuided}>
            {unfinishedVisit
              ? "Continue guided reflection"
              : "Start guided reflection"}{" "}
            <ArrowRight size={17} />
          </button>
        </article>
        <article className="ra-choice ra-play">
          <div className="ra-choice-heading">
            <Users size={24} aria-hidden="true" />
            <span className="lb-kicker">Together · about 5–10 minutes</span>
          </div>
          <h3>Play together</h3>
          <p>
            {game
              ? "Your round is waiting at the same turn. Gather your players and carry on."
              : "The whole family, or a few of you. Choose your players and a game."}
          </p>
          <p className="ra-end">
            <strong>Finished when</strong> everyone has had a turn or passed.
            Keeping a shared page is optional.
          </p>
          <button className="lb-primary" disabled={busy} onClick={onPlay}>
            {game ? "Continue our game" : "Choose a game"}{" "}
            <ArrowRight size={17} />
          </button>
        </article>
      </section>
      <div className="ra-read">
        <p className="lb-kicker">Or settle in with your book</p>
        <button className="lb-text" disabled={busy} onClick={onPages}>
          <BookOpen size={18} /> Read your pages <ArrowRight size={16} />
        </button>
        <button className="lb-text" disabled={busy} onClick={onManual}>
          {pendingInsights
            ? `Review ${pendingInsights} manual ${pendingInsights === 1 ? "suggestion" : "suggestions"}`
            : "Explore your living manual"}{" "}
          <ArrowRight size={16} />
        </button>
        <p className="lb-fine">
          Your writing and guided moments live in the same story. You choose
          what to share.
        </p>
      </div>
      {!!drafts.length && (
        <section className="ra-drafts" aria-label="Unfinished journal entries">
          <div>
            <p className="lb-kicker">Right where you left it</p>
            <h3>Your unfinished {drafts.length === 1 ? "page" : "pages"}</h3>
            <p>Start something new, or pick up a page you left for later.</p>
          </div>
          <div className="ra-draft-list">
            {drafts.slice(0, 3).map((draft) => (
              <button
                key={draft.id}
                disabled={busy}
                onClick={() => onWrite(false, draft)}
              >
                <Feather size={18} />
                <span>
                  <strong>
                    {draft.title.trim() || "An unfinished journal entry"}
                  </strong>
                  <small>
                    {new Date(draft.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · Continue writing
                  </small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
            {drafts.length > 3 && (
              <button disabled={busy} onClick={onPages}>
                See all {drafts.length} unfinished pages{" "}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
