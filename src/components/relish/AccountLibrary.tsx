"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Cloud,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
import {
  connectAI,
  disconnectAI,
  getAIAuth,
  getParentGate,
  setParentGate,
} from "@/lib/relish/ai-auth";
import {
  verifyParent,
  parentCredentialLabel,
  ageBands,
  ageLabels,
  type Audience,
} from "@/lib/relish/profiles";
import { readBinding, type SyncedEdition } from "@/lib/relish/book-sync";
import { coverFor } from "./covers";
import type { useLocalBook } from "./useLocalBook";
import type { useBookSync } from "./useBookSync";
import { readHomeBook } from "./homeBook";
import { Dialog } from "./BookForms";
import Illustration from "./Illustration";
import { BookShelf, GhostShelf, ShelfBook } from "./BookCover";

/** Where book creation saves, verified against useBookSync.accountBook:
 *  an encrypted copy uploads to the account and opens from any signed-in
 *  device; children's books belong to this parent account (said in the
 *  child-book form, where it matters). */
export const OWN_BOOK_NOTE =
  "Encrypted and saved to your account, so it opens wherever you sign in.";
export const CHILD_BOOK_NOTE =
  "Children use this account without a separate sign-in.";

/** Account identity and Sign out, together behind one disclosure button. */
function AccountMenu({
  email,
  disabled,
  onSignOut,
}: {
  email: string;
  disabled: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="lb-acct"
      ref={wrap}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !open) return;
        // Close only the menu, not the dialog around it.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        toggle.current?.focus();
      }}
    >
      <button
        ref={toggle}
        type="button"
        className="lb-acct-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        Account <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="lb-acct-panel" id={id} role="group" aria-label="Account">
          <p>
            <span>Signed in as</span>
            <strong>{email}</strong>
          </p>
          <p className="lb-fine">Stay signed in only on a device you trust.</p>
          <button type="button" disabled={disabled} onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

type Load = "loading" | "ready" | "failed" | "waiting";

export default function AccountLibrary({
  vault,
  sync,
  onClose,
  inline = false,
  onLocal,
  onExplore,
  startAdding,
}: {
  vault: ReturnType<typeof useLocalBook>;
  sync: ReturnType<typeof useBookSync>;
  onClose: () => void;
  inline?: boolean;
  onLocal?: () => void;
  onExplore?: () => void;
  /** Opens straight onto the add-a-child form (from Family). */
  startAdding?: "child";
}) {
  const [gate] = useState(() =>
    vault.mode === "open" && vault.book.profile?.kind === "child"
      ? vault.book.profile.parentLock
      : getParentGate(),
  );
  const [parentReady, setParentReady] = useState(!gate);
  const [parentPass, setParentPass] = useState("");
  const [email, setEmail] = useState(sync.user?.email || ""),
    [password, setPassword] = useState("");
  const [create, setCreate] = useState(false),
    [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [chosen, setChosen] = useState<SyncedEdition | null>(null),
    [passphrase, setPassphrase] = useState("");
  const [adding, setAdding] = useState(!!startAdding),
    [name, setName] = useState("");
  const [audience, setAudience] = useState<Audience | "">(
      startAdding ? "" : "adult",
    ),
    [parentConfirm, setParentConfirm] = useState(false);
  // Whether the account's book list has been fetched in this view. Until it
  // has, an empty list means "not known yet", never "no books".
  // Kept per account, so a different sign-in never inherits "ready".
  const [load, setLoad] = useState<{ uid: string | null; state: Load }>(
    () => ({
      uid: sync.user?.uid ?? null,
      state: sync.books.length ? "ready" : "loading",
    }),
  );
  const [attempt, setAttempt] = useState(0);
  const user = sync.user,
    bound = readBinding(vault.editionId),
    working = busy || sync.working;
  // The signed-in adult's own book comes first; once it exists, there is no
  // second "Create my book".
  const own = readHomeBook(user?.uid);
  const hasOwnBook = sync.books.some((b) => b.id === own && b.accountManaged);
  const books = sync.books.toSorted(
    (a, b) => Number(b.id === own) - Number(a.id === own),
  );
  useEffect(() => {
    if (!user?.emailVerified || !parentReady) return;
    let alive = true;
    const uid = user.uid;
    sync.refresh().then(
      () => alive && setLoad({ uid, state: "ready" }),
      (e: unknown) => {
        if (!alive) return;
        // Another sync is mid-flight: wait for it, then ask again.
        const busyNow =
          e instanceof Error && e.message.startsWith("Sync is already running");
        setLoad({ uid, state: busyNow ? "waiting" : "failed" });
      },
    );
    return () => {
      alive = false;
    };
    // Fetch once when this view gains authorized access (and on Try again).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.emailVerified, parentReady, attempt]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- retries once the running sync finishes
    if (load.state === "waiting" && !sync.working) setAttempt((n) => n + 1);
  }, [load.state, sync.working]);
  const loaded = load.uid === (user?.uid ?? null) ? load.state : "loading";
  const view: "books" | "empty" | "failed" | "loading" = sync.books.length
    ? "books"
    : loaded === "ready"
      ? "empty"
      : loaded === "failed"
        ? "failed"
        : "loading";
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(
        code === "auth/invalid-credential" ||
          code === "auth/wrong-password" ||
          code === "auth/user-not-found"
          ? "That email and account password didn’t match. Use your Relish account password, or choose ‘Forgot account password?’ below. A book passphrase won’t sign you in."
          : e instanceof Error
            ? e.message
            : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function open(head: SyncedEdition) {
    if (!head.accountManaged) {
      setChosen(head);
      return;
    }
    await sync.open(head);
    onClose();
  }
  const signOut = () =>
    void act(async () => {
      await disconnectAI();
      vault.lock();
      sync.refreshUser();
      setParentReady(false);
    });
  const startCreating = (who: "adult" | "child") => {
    setAdding(true);
    setAudience(who === "adult" ? "adult" : "");
  };
  const Heading = inline ? "h1" : "h2";
  const libraryOpen = !!user && parentReady && user.emailVerified;
  const accountMenu = user ? (
    <AccountMenu
      email={user.email || "this account"}
      disabled={working}
      onSignOut={signOut}
    />
  ) : null;

  // First visit: "Create my book" with where it saves, and "Create a
  // child's book" (its form explains child access).
  const createActions = (
    <div className="lb-lib-create">
      {!hasOwnBook && (
        <div className="lb-lib-create-own">
          <button
            type="button"
            className="lb-primary"
            disabled={working}
            onClick={() => startCreating("adult")}
          >
            Create my book <ArrowRight size={18} aria-hidden="true" />
          </button>
          <p className="lb-fine">{OWN_BOOK_NOTE}</p>
        </div>
      )}
      <div className="lb-lib-create-child">
        <button
          type="button"
          className="lb-lib-link"
          disabled={working}
          onClick={() => startCreating("child")}
        >
          Create a child’s book
        </button>
      </div>
    </div>
  );
  // On the shelf: create beside the heading.
  const shelfActions = (
    <div className="lb-lib-top-actions">
      {!hasOwnBook && (
        <button
          type="button"
          className="lb-primary"
          disabled={working}
          onClick={() => startCreating("adult")}
        >
          Create my book <ArrowRight size={18} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        className="lb-secondary"
        disabled={working}
        onClick={() => startCreating("child")}
      >
        <Plus size={17} aria-hidden="true" />
        Create a child’s book
      </button>
    </div>
  );

  const library =
    view === "loading" ? (
      <section className="lb-lib-state lb-lib-books" aria-busy="true">
        <Heading>Who’s reading?</Heading>
        <p role="status">Loading your books…</p>
        <GhostShelf />
      </section>
    ) : view === "failed" ? (
      <section className="lb-lib-state">
        <Heading>Who’s reading?</Heading>
        <p role="alert" className="lb-error">
          Your books didn’t load.{" "}
          {sync.error || "Check your connection and try again."}
        </p>
        <div>
          <button
            type="button"
            className="lb-primary"
            disabled={working}
            onClick={() => {
              setLoad({ uid: user?.uid ?? null, state: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      </section>
    ) : view === "empty" ? (
      <section className="lb-lib-start">
        <Illustration
          name="welcome"
          size="100%"
          eager
          className="lb-lib-start-art"
        />
        <div className="lb-lib-start-words">
          <p className="lb-kicker">Relish account</p>
          <Heading>Start your book</Heading>
          <p className="lb-lib-invite">
            What’s one thing someone in your family did this week that you’d
            like to remember?
          </p>
          {createActions}
        </div>
      </section>
    ) : (
      <section className="lb-lib-books">
        <div className="lb-lib-top">
          <Heading>Who’s reading?</Heading>
          {shelfActions}
        </div>
        <BookShelf label="Books">
          {books.map((head) => {
            const mine = head.accountManaged && head.id === own;
            return (
              <ShelfBook
                key={head.id}
                name={head.label}
                cover={coverFor(head.label, mine)}
                disabled={working}
                locked={!head.accountManaged}
                note={mine ? "Your book" : undefined}
                onOpen={() => void act(() => open(head))}
              />
            );
          })}
        </BookShelf>
      </section>
    );

  const footer = libraryOpen || inline ? (
    <footer className="lb-lib-foot">
      <div className="lb-lib-foot-local">
        {onLocal && (
          <p>
            {view !== "books" && "Already have a book? "}
            <button type="button" onClick={onLocal}>
              Open a local book or restore a backup
            </button>
          </p>
        )}
        {onExplore && (
          <button type="button" onClick={onExplore}>
            Explore a sample book
          </button>
        )}
      </div>
      <a href="/privacy/" target="_blank" rel="noreferrer">
        Privacy details
      </a>
    </footer>
  ) : null;

  const signedIn = !user ? null : !parentReady && gate ? (
    <>
      <p className="lb-kicker">Switch book</p>
      <Heading>Parent sign-in</Heading>
      <p>Enter the parent password to choose another book.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            if (!(await verifyParent(gate, parentPass)))
              throw new Error(
                "That parent password didn’t match. Try again, or sign out and sign in to the parent account.",
              );
            setParentPass("");
            setParentReady(true);
            setParentGate(null);
          });
        }}
      >
        <label>
          {parentCredentialLabel(gate)}
          <input
            type="password"
            autoComplete="current-password"
            required
            value={parentPass}
            onChange={(e) => setParentPass(e.target.value)}
          />
        </label>
        <button className="lb-primary" disabled={working}>
          <ShieldCheck size={17} />
          Choose a book
        </button>
      </form>
    </>
  ) : !user.emailVerified ? (
    <>
      <p className="lb-kicker">Relish account</p>
      <Heading>Verify your email</Heading>
      <section>
        <p>
          Verify <strong>{user.email}</strong> to open your account library.
        </p>
        <button
          className="lb-primary"
          disabled={working}
          onClick={() =>
            void act(async () => {
              await user.reload();
              await user.getIdToken(true);
              sync.refreshUser();
              if (!user.emailVerified)
                throw new Error(
                  "Check your email and follow its verification link first.",
                );
              await sync.refresh();
            })
          }
        >
          I’ve verified my email
        </button>
        <button
          className="lb-lib-link"
          disabled={working}
          onClick={() =>
            void act(async () => {
              await sendEmailVerification(user);
              setNotice("Verification email sent.");
            })
          }
        >
          Resend verification email
        </button>
      </section>
    </>
  ) : (
    <>
      {vault.mode === "open" && !bound?.accountManaged && (
        <section className="lb-account-current">
          <h3>Add {vault.book.owner}’s book to your account</h3>
          <p>
            Add the entries, photos and progress in this book to your account.
            After this one-time step, sign-in opens the account copy on any
            device. Your original stays on this device.
          </p>
          <p className="lb-fine">
            Your account can recover this copy. Anyone signed in to this parent
            account can open its family books. Other accounts cannot.
          </p>
          <button
            className="lb-primary"
            disabled={working}
            onClick={() =>
              void act(async () => {
                await sync.addCurrentBook();
                onClose();
              })
            }
          >
            Add this book to my account
            <ArrowUpRight size={17} />
          </button>
        </section>
      )}
      {sync.conflict && (
        <section className="lb-account-current">
          <h3>Changes from two devices</h3>
          <p>
            Keep both versions so nothing gets overwritten. You can review the
            separate copies in your library.
          </p>
          <button
            className="lb-primary"
            disabled={working}
            onClick={() => void act(sync.keepBoth)}
          >
            Keep both versions
          </button>
        </section>
      )}
      {!adding && !chosen && library}
      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              if (!audience || (audience !== "adult" && !parentConfirm))
                throw new Error(
                  "Choose the child’s age range and confirm you are their parent or guardian.",
                );
              await sync.createBook(name, audience);
              onClose();
            });
          }}
        >
          <Heading>
            {audience === "adult" ? "Create your book" : "Create a child’s book"}
          </Heading>
          <label>
            {audience === "adult" ? "Your name" : "Child’s name"}
            <input
              autoFocus
              required
              maxLength={60}
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {audience === "adult" ? (
            <p className="lb-fine">{OWN_BOOK_NOTE}</p>
          ) : (
            <>
              <label>
                Age range
                <select
                  required
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as Audience)}
                >
                  <option value="">Choose an age range</option>
                  {ageBands.map((b) => (
                    <option key={b} value={b}>
                      {ageLabels[b]}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Their prompts and activities will match this age range.{" "}
                {CHILD_BOOK_NOTE} Their book belongs to your account: no child
                email or password. Entries and photos save under your account,
                and a parent password protects switching books and parent
                settings. AI and sharing with other accounts still need your
                permission.
              </p>
              <label className="lb-account-check">
                <input
                  type="checkbox"
                  checked={parentConfirm}
                  onChange={(e) => setParentConfirm(e.target.checked)}
                />
                I’m their parent or guardian and understand this account can
                access their book.
              </label>
            </>
          )}
          <button
            className="lb-primary"
            disabled={
              working ||
              !name.trim() ||
              !audience ||
              (audience !== "adult" && !parentConfirm)
            }
          >
            {working ? "Creating book…" : "Create & open book"}
            <ArrowUpRight size={17} />
          </button>
          <button
            type="button"
            className="lb-lib-link"
            disabled={working}
            onClick={() => setAdding(false)}
          >
            Back to library
          </button>
        </form>
      )}
      {chosen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              await sync.open(chosen, passphrase);
              setPassphrase("");
              onClose();
            });
          }}
        >
          <Heading>Open {chosen.label}’s earlier book</Heading>
          <p>
            This copy still uses its original book passphrase. Once it’s open,
            choose Switch book to add it to your account.
          </p>
          <label>
            Original book passphrase
            <input
              type="password"
              required
              autoComplete="off"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </label>
          <button className="lb-primary" disabled={working}>
            Open book
          </button>
          <button
            type="button"
            className="lb-lib-link"
            onClick={() => setChosen(null)}
          >
            Back to library
          </button>
        </form>
      )}
    </>
  );

  const alertText =
    error || (libraryOpen && view === "failed" ? "" : sync.error);
  const content: ReactNode = (
    <div className={`lb-account ${user ? "lb-lib" : ""}`}>
      {!user ? (
        <>
          <p className="lb-kicker">
            <Cloud size={17} /> Relish account
          </p>
          <Heading>{create ? "Create your account" : "Welcome to Relish."}</Heading>
          <p>
            Sign in once. Your entries and photos save to your account, ready
            wherever you open Relish.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                if (!adult) throw new Error("An adult must manage this account.");
                await connectAI(email, password, create);
                setPassword("");
                setParentReady(!gate || "accountUid" in gate);
                // A legacy local child edition still requires its separate parent passphrase.
                if (gate && !("accountUid" in gate)) setParentReady(false);
                sync.refreshUser();
                if (create)
                  setNotice(
                    "Check your email for a verification link, then come back here.",
                  );
              });
            }}
          >
            <label>
              Email
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Account password
              <input
                type="password"
                autoComplete={create ? "new-password" : "current-password"}
                minLength={create ? 12 : undefined}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="lb-account-check">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
              />
              I’m 18 or older and manage this account.
            </label>
            <button className="lb-primary" disabled={working || !adult}>
              {working ? "One moment…" : create ? "Create my account" : "Sign in"}
              <ArrowUpRight size={17} />
            </button>
            <div className="lb-account-actions">
              <button
                type="button"
                disabled={working}
                onClick={() => {
                  setCreate(!create);
                  setPassword("");
                }}
              >
                {create
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
              <button
                type="button"
                disabled={working || !email}
                onClick={() =>
                  void act(async () => {
                    await sendPasswordResetEmail(getAIAuth(), email.trim());
                    setNotice(
                      "If that email has an account, you’ll receive a password reset link.",
                    );
                  })
                }
              >
                Forgot account password?
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          {!inline && <div className="lb-lib-bar">{accountMenu}</div>}
          {signedIn}
        </>
      )}
      {alertText && (
        <p role="alert" className="lb-error">
          {alertText}
        </p>
      )}
      {working && !(libraryOpen && view === "loading") && (
        <p role="status">Working on your library…</p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!user && (
        <footer className="lb-account-footer">
          <p className="lb-fine">
            Account books save automatically online. Stay signed in only on a
            device you trust.{" "}
            <a href="/privacy/" target="_blank" rel="noreferrer">
              Privacy details
            </a>
          </p>
          {onLocal && (
            <button onClick={onLocal}>
              Open a local-only book or restore a backup
            </button>
          )}
          {onExplore && (
            <button onClick={onExplore}>Explore a sample book</button>
          )}
        </footer>
      )}
      {user && !inline && footer}
    </div>
  );
  if (!inline)
    return (
      <Dialog title="Who’s reading?" onClose={onClose} wide={user ? true : false}>
        {content}
      </Dialog>
    );
  return user ? (
    <main className="r-app lb-app lb-library-home lb-lib-home">
      <header className="lb-lib-head">
        <p className="lb-wordmark">relish</p>
        {accountMenu}
      </header>
      <section
        className={`lb-lib-sheet ${
          libraryOpen && !adding && !chosen
            ? view === "empty"
              ? "lb-lib-sheet-start"
              : view !== "failed"
                ? "lb-lib-sheet-shelf"
                : ""
            : ""
        }`}
      >
        {content}
      </section>
      {footer}
    </main>
  ) : (
    <main className="r-app lb-app lb-library-home">
      <header>
        <div>
          <p className="lb-wordmark">relish</p>
          <p>The operating manual for relationships</p>
        </div>
        <Illustration name="welcome" size={132} eager className="lb-library-sun" />
      </header>
      <section>{content}</section>
    </main>
  );
}
