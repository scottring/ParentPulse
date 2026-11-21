"use client";
import { useState } from "react";
import type { Book } from "@/lib/relish/model";
import { outcomes, type Outcome } from "@/lib/relish/living";
import { idleDays } from "@/lib/relish/activities";
import "./home-acts.css";
import {
  checkBackWords,
  toolById,
  type CheckBack,
  type CheckBackAnswer,
} from "@/lib/relish/tools";

/**
 * "You planned to … Did you get to say it?" (Scott's check-back board,
 * 2026-11-21). A plan from an exercise, asked about in the person's own
 * words a few days after they kept it: I said it / Not yet / Let it go.
 * "Not yet" asks again in two days; nothing is ever sent to anyone.
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
  const days = idleDays(item.createdAt);
  const said = words.quote !== undefined;
  return (
    <section
      className={`ha-checkback ${className}`}
      aria-label={`Your plan from ${tool?.title || "an exercise"}`}
    >
      {tool && (
        <p className="ha-quiet">
          {days > 1 ? `${days} days after` : days === 1 ? "The day after" : "Today, from"} {tool.title}
        </p>
      )}
      <h2 className="ha-cb-lead">{words.lead}</h2>
      {words.quote && <blockquote className="ha-cb-quote">“{words.quote}”</blockquote>}
      <p className="ha-cb-ask">{tried ? "How did it go?" : words.ask}</p>
      {tried ? (
        <div className="ha-cb-how">
          <div className="ha-answers" role="group" aria-label="How did it go?">
            {(Object.keys(outcomes) as Outcome[]).map((key) => (
              <button
                key={key}
                type="button"
                className="ha-answer"
                aria-pressed={outcome === key}
                disabled={busy}
                onClick={() => setOutcome(key)}
              >
                {outcomes[key]}
              </button>
            ))}
          </div>
          <label>
            What happened? · optional
            <textarea
              rows={2}
              maxLength={500}
              value={note}
              placeholder="They hugged me and said it was okay."
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="ha-row-actions-inline">
            <button
              type="button"
              className="ha-btn"
              disabled={busy}
              onClick={() => onAnswer({ kind: "tried", outcome: outcome || undefined, note })}
            >
              Save how it went
            </button>
            <button type="button" className="ha-link" disabled={busy} onClick={() => setTried(false)}>
              Back
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="ha-answers" role="group" aria-label={words.ask}>
            <button type="button" className="ha-answer" disabled={busy} onClick={() => setTried(true)}>
              {said ? "I said it" : "I tried it"}
            </button>
            <button
              type="button"
              className="ha-answer"
              disabled={busy}
              onClick={() => onAnswer({ kind: "later" })}
            >
              Not yet
            </button>
            <button
              type="button"
              className="ha-answer"
              disabled={busy}
              onClick={() => onAnswer({ kind: "let-go" })}
            >
              Let it go
            </button>
          </div>
          <p className="ha-quiet ha-cb-fine">
            “Not yet” asks again in two days. “Let it go” stops asking; the page stays in your
            book. Nothing else happens.
          </p>
        </>
      )}
    </section>
  );
}
