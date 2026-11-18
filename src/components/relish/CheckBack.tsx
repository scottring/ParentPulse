"use client";
import { useState } from "react";
import type { Book } from "@/lib/relish/model";
import { outcomes, type Outcome } from "@/lib/relish/living";
import {
  checkBackWords,
  toolById,
  type CheckBack,
  type CheckBackAnswer,
} from "@/lib/relish/tools";

/**
 * "You planned to say … Did you get a chance?" A plan from an exercise,
 * asked about in the person's own words a few days after they kept it.
 * Yes / Not yet / Let it go, as Think it through does for its plans.
 */
export default function CheckBackCard({
  book,
  item,
  busy,
  onAnswer,
  className = "",
}: {
  book: Book;
  item: CheckBack;
  busy: boolean;
  onAnswer: (answer: CheckBackAnswer) => void;
  className?: string;
}) {
  const words = checkBackWords(book, item);
  const tool = toolById(item.toolId);
  const [tried, setTried] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [note, setNote] = useState("");
  return (
    <section
      className={`rp-nudge rp-checkback ${className}`}
      aria-label={`Your plan from ${tool?.title || "an exercise"}`}
    >
      <div className="rp-nudge-text">
        <p className="rp-nudge-kicker">
          <span>Your plan</span>
          <span aria-hidden="true">·</span>
          <span>{tool?.title}</span>
        </p>
        <p className="rp-checkback-lead">{words.lead}</p>
        {words.quote && <blockquote className="rp-checkback-quote">“{words.quote}”</blockquote>}
        <p className="rp-checkback-ask">{tried ? "How did it go?" : words.ask}</p>
        {tried && (
          <>
            <div className="rp-checkback-outcomes" role="group" aria-label="How did it go?">
              {(Object.keys(outcomes) as Outcome[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="ui-chip"
                  aria-pressed={outcome === key}
                  disabled={busy}
                  onClick={() => setOutcome(key)}
                >
                  {outcomes[key]}
                </button>
              ))}
            </div>
            <label className="rp-checkback-note">
              What happened? · optional
              <textarea
                rows={2}
                maxLength={500}
                value={note}
                placeholder="They hugged me and said it was okay."
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </>
        )}
      </div>
      <div className="rp-nudge-actions">
        {tried ? (
          <>
            <button
              className="rp-btn rp-btn-sun"
              disabled={busy || !outcome}
              onClick={() =>
                onAnswer({ kind: "tried", outcome: outcome || undefined, note })
              }
            >
              Save how it went
            </button>
            <button
              className="rp-btn rp-btn-ghost"
              disabled={busy}
              onClick={() => setTried(false)}
            >
              Back
            </button>
          </>
        ) : (
          <>
            <button
              className="rp-btn rp-btn-sun"
              disabled={busy}
              onClick={() => setTried(true)}
            >
              Yes, I did
            </button>
            <button
              className="rp-btn rp-btn-ghost"
              disabled={busy}
              onClick={() => onAnswer({ kind: "later" })}
            >
              Not yet
            </button>
            <button
              className="rp-btn rp-btn-ghost"
              disabled={busy}
              onClick={() => onAnswer({ kind: "let-go" })}
            >
              Let it go
            </button>
            <p className="rp-checkback-fine">
              “Not yet” asks again in two days. “Let it go” sets it aside; the
              page stays in Your book.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
