"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Pause, Sparkles } from "lucide-react";
import type { Book } from "@/lib/relish/model";
import {
  type Draft,
  type Visit,
  type ThreadId,
  pendingPractice,
  updateDraft,
} from "@/lib/relish/living";
import { guidanceFor } from "@/lib/relish/guidance";
import { canUseOnline } from "@/lib/relish/profiles";
import Illustration from "./Illustration";
import { topicIllustration } from "./illustrations";
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
  onNewMoment,
}: {
  book: Book;
  visit: Visit;
  save: (update: (b: Book) => Book) => Promise<void>;
  busy: boolean;
  onThread: (id: ThreadId) => void;
  onPause: (draft: Draft) => void;
  onFinish: (draft: Draft) => void;
  onTried: (draft: Draft) => void;
  /** Sets aside an untried plan and starts a new moment. */
  onNewMoment?: (draft: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(visit.draft),
    [ai, setAI] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const revision = useRef(0),
    saveRef = useRef(save),
    alive = useRef(true),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
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
      setStatus("Saving…");
      void saveRef
        .current((b) => updateDraft(b, visit.id, draft))
        .then(() => {
          if (alive.current && rev === revision.current) {
            setStatus("Saved");
            setError("");
          }
        })
        .catch(() => {
          if (alive.current && rev === revision.current) {
            setStatus("");
            setError(
              "Your latest words haven’t saved yet. Keep this page open and try again.",
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
  const {
    threads,
    plans,
    outcomes,
    words,
    cue,
    choices,
    opportunities,
    placeholder,
    maxLength,
  } = guidanceFor(book);
  const online = canUseOnline(book);
  const theme = visit.thread ? threads[visit.thread] : null,
    plan = plans[visit.kind],
    practice = pendingPractice(book);
  const kicker =
    visit.kind === "begin"
      ? `${visit.step === 0 ? "Step 1 of 2" : "Step 2 of 2"} · ${plan.time}`
      : plan.time;
  /** Adds a "when" to the plan, or starts it when the field is empty. */
  const addWhen = (when: string) => {
    const now = draft.opportunity.trim().replace(/[.\s]+$/, "");
    setDraft({
      ...draft,
      opportunity: (now ? `${now} ${when}` : when).slice(0, 500),
    });
  };
  return (
    <div className="lb-editor">
      <p className="lb-kicker">{kicker}</p>
      {cue && <p className="lb-age-cue">{cue}</p>}
      {visit.kind === "begin" && visit.step === 0 ? (
        <>
          <h2>{words.choose}</h2>
          <p className="lb-fine">{words.chooseHint}</p>
          <div className="lb-topics">
            {Object.entries(threads).map(([key, t]) => (
              <button
                key={key}
                className="lb-topic"
                disabled={busy}
                onClick={() => onThread(key as ThreadId)}
              >
                <Illustration
                  name={topicIllustration[key] ?? "think-it-through"}
                  size={88}
                />
                <span className="lb-topic-title">{t.title}</span>
                <span className="lb-topic-lead">{t.lead}</span>
              </button>
            ))}
          </div>
        </>
      ) : visit.kind === "begin" || visit.kind === "notice" ? (
        <>
          <h2>{theme?.notice}</h2>
          {choices.length > 0 && (
            <div
              className="lb-feeling-choices"
              aria-label="A feeling to start with"
            >
              {choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className="ui-chip"
                  disabled={busy}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      text: (draft.text
                        ? draft.text + " " + choice
                        : choice
                      ).slice(0, maxLength),
                    })
                  }
                >
                  {choice}
                </button>
              ))}
            </div>
          )}
          <label>
            Your moment
            <textarea
              autoFocus
              maxLength={maxLength}
              rows={5}
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              placeholder={placeholder}
            />
          </label>
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
              {words.saveMoment} <Check size={15} />
            </button>
            {online && (
              <button
                className="lb-text"
                disabled={!draft.text.trim()}
                onClick={() => setAI(true)}
              >
                <Sparkles size={15} /> Get another perspective on these words
              </button>
            )}
          </div>
        </>
      ) : visit.kind === "practice" ? (
        <>
          <h2>{theme?.practice}</h2>
          <p>{theme?.instruction}</p>
          <label>
            {words.planLabel}
            <textarea
              autoFocus
              rows={2}
              maxLength={500}
              value={draft.opportunity}
              placeholder={theme?.planExample}
              onChange={(e) =>
                setDraft({ ...draft, opportunity: e.target.value })
              }
            />
          </label>
          <div className="lb-feeling-choices" role="group" aria-label="Add when">
            {opportunities.map((option) => (
              <button
                key={option}
                type="button"
                className="ui-chip"
                disabled={busy}
                onClick={() => addWhen(option)}
              >
                + {option}
              </button>
            ))}
          </div>
          <button
            className="lb-primary"
            disabled={busy || !draft.opportunity.trim()}
            onClick={() => leave(onFinish)}
          >
            {words.savePlan} <Check size={15} />
          </button>
        </>
      ) : !practice?.triedAt ? (
        <>
          <h2>{words.askTried}</h2>
          {practice && (
            <div className="lb-margin lb-recall">
              <p className="lb-kicker">Your plan · {theme?.title}</p>
              <p className="lb-recall-plan">“{practice.text}”</p>
            </div>
          )}
          <div className="lb-actions">
            <button
              className="lb-primary"
              disabled={busy || !practice}
              onClick={() => leave(onTried)}
            >
              {words.tried} <Check size={15} />
            </button>
            <button
              className="lb-secondary"
              disabled={busy}
              onClick={() => leave(onPause)}
            >
              {words.notYet}
            </button>
          </div>
          <p className="lb-fine lb-after-actions">
            “Not yet” keeps the plan. It will ask again next time.
          </p>
          {onNewMoment && (
            <button
              className="lb-text"
              disabled={busy}
              onClick={() => leave(onNewMoment)}
            >
              Write about a different moment instead
            </button>
          )}
        </>
      ) : (
        <>
          <h2>{words.howWent}</h2>
          {practice && (
            <p className="lb-fine lb-recall-line">
              Your plan: “{practice.text}”
            </p>
          )}
          <fieldset className="lb-outcomes">
            <legend className="ui-sr-only">{words.howWent}</legend>
            {Object.entries(outcomes).map(([key, value]) => (
              <button
                key={key}
                type="button"
                className="ui-chip"
                aria-pressed={draft.outcome === key}
                disabled={busy}
                onClick={() =>
                  setDraft({ ...draft, outcome: key as Draft["outcome"] })
                }
              >
                {value}
              </button>
            ))}
          </fieldset>
          <label>
            Anything to remember? · optional
            <textarea
              value={draft.text}
              rows={3}
              maxLength={maxLength}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              placeholder="Next time, I might…"
            />
          </label>
          <button
            className="lb-primary"
            disabled={busy || !draft.outcome}
            onClick={() => leave(onFinish)}
          >
            {words.saveHow} <Check size={15} />
          </button>
        </>
      )}
      <div className="lb-editor-foot">
        {/* "Not yet" already pauses a plan nobody has tried. */}
        {!(visit.kind === "reflect" && !practice?.triedAt) && (
          <button
            className="lb-text"
            disabled={busy}
            onClick={() => leave(onPause)}
          >
            <Pause size={14} /> Pause here
          </button>
        )}
        <span className="lb-fine" role="status">
          {dirty ? "Saving…" : status}
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
      {ai && online && (
        <Dialog
          title="Get another perspective"
          onClose={() => setAI(false)}
        >
          <AIHelp
            profile={book.profile}
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
