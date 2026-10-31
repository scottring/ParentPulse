"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { Check, Sparkles, BookOpen, X, RefreshCw } from "lucide-react";
import type { Book } from "@/lib/relish/model";
import { audienceOf, verifyParent } from "@/lib/relish/profiles";
import {
  addManualIdeas,
  manualOf,
  manualSources,
  reviewManualIdea,
  sourceFingerprint,
  sourceSignature,
  type ManualCard,
  type ManualScope,
} from "@/lib/relish/manual";
type Save = (change: (book: Book) => Book) => Promise<void>;
export function useManualGuide(
  book: Book,
  save: Save,
  active: boolean,
  paused: boolean,
  sample: boolean,
) {
  const [config, setConfig] = useState<{
    enabled: boolean;
    privacyReady: boolean;
  } | null>(null);
  const [account, setAccount] = useState<User | null>(null),
    [authorized, setAuthorized] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const alive = useRef(true),
    running = useRef<AbortController | null>(null),
    latest = useRef(book),
    saveRef = useRef(save),
    attempts = useRef(new Set<string>());
  const manual = manualOf(book),
    personal = sourceSignature(manualSources(book, "personal")),
    family = sourceSignature(manualSources(book, "family"));
  useEffect(() => {
    latest.current = book;
    saveRef.current = save;
  }, [book, save]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; running.current?.abort(); };
  }, []);
  const interested =
    active || manual.automatic.personal || manual.automatic.family;
  useEffect(() => {
    if (!interested || sample) return;
    const abort = new AbortController();
    fetch("/api/relish/manual/", { signal: abort.signal, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((c) => { if (!abort.signal.aborted) setConfig(c); })
      .catch(() => {
        if (!abort.signal.aborted)
          setError("The guide couldn’t connect. Your book is still here.");
      });
    return () => abort.abort();
  }, [interested, sample]);
  const connect = useCallback(
    async (email: string, password: string, parentPass: string) => {
      if (!config?.enabled || sample || !alive.current)
        throw new Error("The guide is waiting for its privacy setup.");
      const b = latest.current;
      if (!b.profile) throw new Error("Choose an edition age range first.");
      if (
        b.profile.kind === "child" &&
        !(await verifyParent(b.profile.parentLock, parentPass))
      )
        throw new Error("That parent passphrase didn’t match.");
      if (!alive.current) return;
      const auth = await import("@/lib/relish/ai-auth");
      if (!alive.current) return;
      const user =
        auth.currentAIUser() || (await auth.connectAI(email, password, false));
      await user.reload();
      if (!alive.current || auth.currentAIUser()?.uid !== user.uid) return;
      if (!user.emailVerified)
        throw new Error("Verify the adult account’s email first.");
      setAccount(user);
      setAuthorized(true);
      setError("");
      attempts.current.clear();
    },
    [config?.enabled, sample],
  );
  useEffect(() => {
    if (!authorized || !account) return;
    let closed = false;
    let unsubscribe: (() => void) | undefined;
    Promise.all([import("@/lib/relish/ai-auth"), import("firebase/auth")]).then(([auth, firebase]) => {
      if (closed) return;
      unsubscribe = firebase.onAuthStateChanged(auth.getAIAuth(), (user) => {
        if (user?.uid === account.uid) return;
        running.current?.abort();
        setAuthorized(false);
        setAccount(null);
        setStatus("");
      });
    }).catch(() => {
      if (!closed) { running.current?.abort(); setAuthorized(false); }
    });
    return () => { closed = true; unsubscribe?.(); };
  }, [authorized, account]);
  useEffect(() => {
    if (!authorized || !account || !config?.enabled || paused || sample) return;
    const abort = new AbortController();
    running.current = abort;
    const tried = attempts.current;
    let inFlight = "";
    const timer = setTimeout(async () => {
      for (const scope of ["personal", "family"] as ManualScope[]) {
        const b = latest.current,
          m = manualOf(b);
        if (!m.automatic[scope]) continue;
        const sources = manualSources(b, scope);
        if (!sources.length) continue;
        const fingerprint = await sourceFingerprint(sources);
        if (abort.signal.aborted) return;
        const attempt = `${scope}:${fingerprint}:${retry}`;
        if (
          m.fingerprints[scope] === fingerprint ||
          attempts.current.has(attempt)
        )
          continue;
        attempts.current.add(attempt);
        inFlight = attempt;
        setError("");
        setStatus(
          scope === "family"
            ? "Finding threads in your approved Family pages…"
            : "Finding threads in your recent pages…",
        );
        try {
          const auth = await import("@/lib/relish/ai-auth");
          if (auth.currentAIUser()?.uid !== account.uid) return;
          const token = await account.getIdToken();
          if (abort.signal.aborted) return;
          const response = await fetch("/api/relish/manual/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "x-relish-consent": "automatic-manual-suggestions",
              "x-relish-edition":
                b.profile?.kind === "child" ? "parent-assisted-child" : "adult",
            },
            body: JSON.stringify({ scope, audience: audienceOf(b), sources }),
            signal: AbortSignal.any([
              abort.signal,
              AbortSignal.timeout(55_000),
            ]),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error || "The guide couldn’t finish. Try again later.",
            );
          if (abort.signal.aborted || auth.currentAIUser()?.uid !== account.uid) return;
          await saveRef.current((current) =>
            addManualIdeas(current, scope, sources, result.ideas, fingerprint),
          );
          if (!abort.signal.aborted)
            setStatus(
              result.ideas.length
                ? "A few possibilities are ready to consider."
                : "Your pages are kept. No new conclusion needed yet.",
            );
        } catch (e) {
          if (abort.signal.aborted) {
            attempts.current.delete(attempt);
            return;
          }
          setError(
            e instanceof Error
              ? e.message
              : "The guide couldn’t finish. Try again later.",
          );
          setStatus("");
        }
      }
    }, 1800);
    return () => {
      clearTimeout(timer);
      abort.abort();
      if (inFlight) tried.delete(inFlight);
    };
  }, [
    personal,
    family,
    manual.automatic.personal,
    manual.automatic.family,
    authorized,
    account,
    config?.enabled,
    paused,
    retry,
    sample,
  ]);
  return {
    config,
    authorized,
    connect,
    status,
    error,
    retry: () => {
      setError("");
      setRetry((n) => n + 1);
    },
  };
}
export function ManualCardView({
  card,
  onReview,
}: {
  card: ManualCard;
  onReview?: (status: "kept" | "dismissed") => void;
}) {
  return (
    <article className={`rm-card ${card.status === "kept" ? "rm-kept" : ""}`}>
      <p className="lb-kicker">
        {card.status === "kept"
          ? "A thought you chose to keep"
          : "A possibility, not a verdict"}
      </p>
      <h3>{card.title}</h3>
      <p>{card.observation}</p>
      {card.tryThis && (
        <div className="rm-try">
          <span className="lb-kicker">A little thing to try</span>
          <p>{card.tryThis}</p>
        </div>
      )}
      <details>
        <summary>
          Where this came from · {card.sources.length}{" "}
          {card.sources.length === 1 ? "page" : "pages"}
        </summary>
        {card.sources.map((source) => (
          <blockquote key={source.id}>
            <strong>{source.title}</strong>
            <p>{source.text}</p>
          </blockquote>
        ))}
      </details>
      {onReview && (
        <div className="rj-capture-actions">
          {card.status !== "kept" && (
            <button className="lb-primary" onClick={() => onReview("kept")}>
              <Check size={16} /> Keep in{" "}
              {card.scope === "family" ? "our Family" : "my"} manual
            </button>
          )}
          <button className="lb-text" onClick={() => onReview("dismissed")}>
            <X size={16} />
            {card.status === "kept" ? "Put this thought away" : "Doesn’t fit"}
          </button>
        </div>
      )}
    </article>
  );
}
export default function Manual({
  book,
  save,
  guide,
  sample,
  onPages,
}: {
  book: Book;
  save: Save;
  guide: ReturnType<typeof useManualGuide>;
  sample: boolean;
  onPages: () => void;
}) {
  const m = manualOf(book),
    [scope, setScope] = useState<ManualScope>("personal");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [parentPass, setParentPass] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    import("@/lib/relish/ai-auth")
      .then((a) => setSignedIn(!!a.currentAIUser()))
      .catch(() => {});
  }, []);
  async function connect() {
    setBusy(true);
    setError("");
    try {
      await guide.connect(email, password, parentPass);
      setPassword("");
      setParentPass("");
    } catch (e) {
      setError(
        e instanceof Error && /passphrase|Verify|age range/.test(e.message)
          ? e.message
          : "That sign-in didn’t work. Use a verified adult Relish account.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function update(work: (b: Book) => Book) {
    setBusy(true);
    setError("");
    try {
      await save(work);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "This change couldn’t be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  const cards = m.cards
    .filter((c) => c.scope === scope && c.status !== "dismissed")
    .toReversed();
  return (
    <main className="rj-workspace rm-workspace">
      <header className="rm-intro">
        <p className="lb-kicker">A living manual · always a work in becoming</p>
        <h2>
          What we’re
          <br />
          <em>learning about us.</em>
        </h2>
        <p>
          Your pages hold the moments. Your manual gathers the things that might
          help. Keep what rings true. Leave room to change your mind.
        </p>
      </header>
      <div className="rm-tabs" role="group" aria-label="Choose a manual">
        <button
          className={scope === "personal" ? "lb-primary" : "lb-secondary"}
          aria-pressed={scope === "personal"}
          onClick={() => setScope("personal")}
        >
          <BookOpen size={18} /> My manual
        </button>
        <button
          className={scope === "family" ? "lb-primary" : "lb-secondary"}
          aria-pressed={scope === "family"}
          onClick={() => setScope("family")}
        >
          Our Family manual
        </button>
      </div>
      <section className="rm-connection">
        <Sparkles size={24} />
        <div>
          <h3>A guide that grows with your pages.</h3>
          <p>
            {scope === "personal"
              ? "With your permission, the guide reflects on your six most recent kept pages as you add to them. Drafts, photos and private people tags stay out."
              : "Family reflections use only chosen Family album passages and approved game pages. Nobody’s private notebook is included."}
          </p>
          {sample ? (
            <p className="lb-fine">
              The thought below is a fictional example. Automatic reflection is available in a private edition once its cloud privacy setup is complete.
            </p>
          ) : !guide.config ? (
            <p className="lb-fine">Checking the guide connection…</p>
          ) : !guide.config.enabled ? (
            <p className="lb-fine">
              Automatic reflection is waiting for Relish’s private-data setup.
              Your writing stays on this device in the meantime.
            </p>
          ) : !guide.authorized ? (
            <details>
              <summary>Connect the guide for this visit</summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void connect();
                }}
              >
                {!signedIn && (
                  <>
                    <label className="rj-field">
                      Adult account email
                      <input
                        type="email"
                        required
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </label>
                    <label className="rj-field">
                      Account password
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </label>
                  </>
                )}
                {book.profile?.kind === "child" && (
                  <label className="rj-field">
                    Parent passphrase
                    <input
                      type="password"
                      required
                      autoComplete="off"
                      value={parentPass}
                      onChange={(e) => setParentPass(e.target.value)}
                    />
                  </label>
                )}
                <label className="rj-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    {book.profile?.kind === "child"
                      ? "I’m the parent or guardian and allow this guide session. "
                      : "I’m 18 or older. "}
                    I understand that turning on a manual’s guide sends its
                    recent kept text to OpenAI automatically while this edition
                    is open. I can turn it off below.
                  </span>
                </label>
                <button className="lb-primary" disabled={busy || !consent}>
                  {busy ? "Connecting…" : "Connect guide"}
                </button>
              </form>
            </details>
          ) : (
            <label className="rj-consent">
              <input
                type="checkbox"
                checked={m.automatic[scope]}
                disabled={busy}
                onChange={(e) => {
                  const checked = e.target.checked;
                  void update((b) => ({
                    ...b,
                    manual: {
                      ...manualOf(b),
                      automatic: { ...manualOf(b).automatic, [scope]: checked },
                    },
                  }));
                }}
              />
              <span>
                Automatically suggest insights for{" "}
                {scope === "family" ? "our Family manual" : "my manual"}
              </span>
            </label>
          )}
          {m.automatic[scope] && !guide.authorized && (
            <p className="lb-fine">
              Your automatic guide is paused until an adult reconnects this
              visit.
            </p>
          )}
          {m.automatic[scope] && !guide.authorized && (
            <button
              className="lb-text"
              disabled={busy}
              onClick={() =>
                void update((b) => ({
                  ...b,
                  manual: {
                    ...manualOf(b),
                    automatic: { ...manualOf(b).automatic, [scope]: false },
                  },
                }))
              }
            >
              Turn off automatic reflection
            </button>
          )}
          {guide.status && <p role="status">{guide.status}</p>}
          {guide.error && (
            <>
              <p className="lb-error" role="alert">
                {guide.error}
              </p>
              <button className="lb-text" onClick={guide.retry}>
                <RefreshCw size={16} /> Try the guide again
              </button>
            </>
          )}
        </div>
      </section>
      {error && (
        <p className="lb-error" role="alert">
          {error}
        </p>
      )}
      <section
        aria-label={
          scope === "family"
            ? "Family manual insights"
            : "Personal manual insights"
        }
      >
        {cards.length ? (
          cards.map((card) => (
            <ManualCardView
              key={card.id}
              card={card}
              onReview={
                busy
                  ? undefined
                  : (status) =>
                      void update((b) => reviewManualIdea(b, card.id, status))
              }
            />
          ))
        ) : (
          <div className="rm-empty">
            <h3>Understanding starts small.</h3>
            <p>
              Keep a moment, a story, or a reflection. When the guide is
              connected, possibilities will appear here for you to consider.
              Nothing becomes a rule about you.
            </p>
            <button className="lb-text" onClick={onPages}>
              Back to my pages <BookOpen size={16} />
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
