"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Pause, Sparkles } from "lucide-react";
import type { Book } from "@/lib/relish/model";
import {
  type Draft,
  type Visit,
  type ThreadId,
  threads,
  plans,
  outcomes,
  pendingPractice,
  updateDraft,
} from "@/lib/relish/living";
import { AIHelp } from "./AIHelp";
import { Dialog } from "./BookForms";

export default function VisitEditor({
  book,
  visit,
  save,
  busy,
  onThread,
  onPause,
  onFinish,
  onTried,
}: {
  book: Book;
  visit: Visit;
  save: (update: (b: Book) => Book) => Promise<void>;
  busy: boolean;
  onThread: (id: ThreadId) => void;
  onPause: (draft: Draft) => void;
  onFinish: (draft: Draft) => void;
  onTried: (draft: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(visit.draft),
    [ai, setAI] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const revision = useRef(0),
    saveRef = useRef(save),
    alive = useRef(true),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  saveRef.current = save;
  const dirty = JSON.stringify(draft) !== JSON.stringify(visit.draft);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const rev = ++revision.current;
    timer.current = setTimeout(() => {
      setStatus("Saving your place…");
      void saveRef
        .current((b) => updateDraft(b, visit.id, draft))
        .then(() => {
          if (alive.current && rev === revision.current) {
            setStatus("Your place is kept.");
            setError("");
          }
        })
        .catch(() => {
          if (alive.current && rev === revision.current) {
            setStatus("");
            setError(
              "Your latest words have not saved yet. Keep this page open and try again.",
            );
          }
        });
    }, 450);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, dirty, visit.id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const leave = (fn: (d: Draft) => void) => {
    if (timer.current) clearTimeout(timer.current);
    revision.current++;
    fn(draft);
  };
  const theme = visit.thread ? threads[visit.thread] : null,
    plan = plans[visit.kind],
    practice = pendingPractice(book);
  const step =
    visit.kind === "begin" ? `Step ${visit.step + 1} of 2` : "One small step";
  return (
    <div className="lb-editor">
      <p className="lb-kicker">
        {step} · {plan.time}
      </p>
      <div className="lb-boundary">
        <strong>Enough for this visit</strong>
        <p>{plan.end}</p>
      </div>
      {visit.kind === "begin" && visit.step === 0 ? (
        <>
          <h2>
            What matters to you
            <br />
            right now?
          </h2>
          <div className="lb-choices">
            {Object.entries(threads).map(([key, t]) => (
              <button
                key={key}
                disabled={busy}
                onClick={() => onThread(key as ThreadId)}
              >
                {t.title}
              </button>
            ))}
          </div>
        </>
      ) : visit.kind === "begin" || visit.kind === "notice" ? (
        <>
          <h2>{theme?.notice}</h2>
          <label>
            Your moment
            <textarea
              autoFocus
              maxLength={3000}
              rows={5}
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              placeholder="One small moment is enough…"
            />
          </label>
          <p className="lb-fine">
            These words stay in your private edition. Sharing is a separate
            choice.
          </p>
          {draft.perspective && (
            <div className="lb-margin">
              <p className="lb-kicker">A perspective you chose to keep</p>
              <p>{draft.perspective}</p>
              <button
                className="lb-text"
                onClick={() => setDraft({ ...draft, perspective: "" })}
              >
                Remove this perspective
              </button>
            </div>
          )}
          <div className="lb-actions">
            <button
              className="lb-primary"
              disabled={busy || !draft.text.trim()}
              onClick={() => leave(onFinish)}
            >
              Keep this moment · finish here <Check size={15} />
            </button>
            <button
              className="lb-text"
              disabled={!draft.text.trim()}
              onClick={() => setAI(true)}
            >
              <Sparkles size={15} /> Invite AI to help
            </button>
          </div>
        </>
      ) : visit.kind === "practice" ? (
        <>
          <h2>{theme?.practice}</h2>
          <p>{theme?.instruction}</p>
          <label>
            A moment when I could try
            <select
              value={draft.opportunity}
              onChange={(e) =>
                setDraft({ ...draft, opportunity: e.target.value })
              }
            >
              <option value="">Choose an ordinary opportunity</option>
              <option>the next conversation</option>
              <option>a meal together</option>
              <option>a quiet moment side by side</option>
              <option>when I have a little room</option>
            </select>
          </label>
          <button
            className="lb-primary"
            disabled={busy || !draft.opportunity}
            onClick={() => leave(onFinish)}
          >
            Take this into my day · finish here
          </button>
          <p className="lb-fine">
            This keeps a plan. Mark it tried only after it happens.
          </p>
        </>
      ) : (
        <>
          <h2>
            What happened
            <br />
            when you tried?
          </h2>
          {practice && (
            <div className="lb-margin">
              <p>{theme?.practice}</p>
              <p className="lb-fine">Your opportunity: {practice.text}.</p>
            </div>
          )}
          {!practice?.triedAt ? (
            <>
              <p>
                Life does not need to follow a schedule. If you have not had a
                chance, leave this for another day.
              </p>
              <button
                className="lb-primary"
                disabled={busy || !practice}
                onClick={() => leave(onTried)}
              >
                I have tried it · reflect
              </button>
            </>
          ) : (
            <>
              <label>
                What fits this experience?
                <select
                  value={draft.outcome}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      outcome: e.target.value as Draft["outcome"],
                    })
                  }
                >
                  <option value="">Choose what fits</option>
                  {Object.entries(outcomes).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                A sentence to remember · optional
                <textarea
                  value={draft.text}
                  rows={4}
                  maxLength={3000}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  placeholder="Next time, I might…"
                />
              </label>
              <button
                className="lb-primary"
                disabled={busy || !draft.outcome}
                onClick={() => leave(onFinish)}
              >
                Keep this lesson · finish here <Check size={15} />
              </button>
            </>
          )}
        </>
      )}
      <div className="lb-editor-foot">
        <button
          className="lb-text"
          disabled={busy}
          onClick={() => leave(onPause)}
        >
          <Pause size={14} /> Pause here
        </button>
        <span className="lb-fine" role="status">
          {dirty ? "Keeping your place…" : status}
        </span>
      </div>
      {error && (
        <p role="alert" className="lb-error">
          {error}
          <button
            className="lb-text"
            onClick={() =>
              void save((b) => updateDraft(b, visit.id, draft))
                .then(() => setError(""))
                .catch(() => {})
            }
          >
            Try saving again
          </button>
        </p>
      )}
      {ai && (
        <Dialog title="Invite AI to help" onClose={() => setAI(false)}>
          <AIHelp
            observation={draft.text}
            onUse={(text) => {
              setDraft({ ...draft, perspective: text });
              setAI(false);
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
