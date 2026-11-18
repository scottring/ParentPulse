"use client";
import { useEffect, useState } from "react";
import { Cloud, BookOpen, ArrowUpRight, Plus, ShieldCheck } from "lucide-react";
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
import type { useLocalBook } from "./useLocalBook";
import type { useBookSync } from "./useBookSync";
import { readHomeBook } from "./homeBook";

const bookTones = ["sun", "clay", "sky", "sage"] as const;
import { Dialog } from "./BookForms";
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
  const user = sync.user,
    bound = readBinding(vault.editionId),
    working = busy || sync.working;
  // The signed-in adult's own book comes first; once it exists, there is no
  // second "Add my book".
  const own = readHomeBook(user?.uid);
  const hasOwnBook = sync.books.some((b) => b.id === own && b.accountManaged);
  const books = sync.books.toSorted(
    (a, b) => Number(b.id === own) - Number(a.id === own),
  );
  useEffect(() => {
    if (user?.emailVerified && parentReady) void sync.refresh().catch(() => {});
    // Fetch once when this view gains authorized access.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.emailVerified, parentReady]);
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
  const content = (
    <div className="lb-account">
      <p className="lb-kicker">
        <Cloud size={17} /> Relish account
      </p>
      <h2>
        {user && !parentReady
          ? "Parent sign-in"
          : user
            ? "Your family library."
            : create
              ? "Create your account"
              : "Welcome to Relish."}
      </h2>
      <p>
        {user && !parentReady
          ? "Enter the parent password to return to the family library."
          : user
            ? "Choose a book to open."
            : "Sign in once. Your entries and photos save to your account, ready wherever you open Relish."}
      </p>
      {!user ? (
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
      ) : !parentReady && gate ? (
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
            Open family library
          </button>
        </form>
      ) : !user.emailVerified ? (
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
      ) : (
        <>
          <p className="lb-fine">Signed in as {user.email}</p>
          {vault.mode === "open" && !bound?.accountManaged && (
            <section className="lb-account-current">
              <h3>Add {vault.book.owner}’s book to your account</h3>
              <p>
                Add the entries, photos and progress in this book to your
                account. After this one-time step, sign-in opens the account
                copy on any device. Your original stays on this device.
              </p>
              <p className="lb-fine">
                Your account can recover this copy. Anyone signed in to this
                parent account can open its family books. Other accounts cannot.
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
                Keep both versions so nothing gets overwritten. You can review
                the separate copies in your library.
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
          {!adding && !chosen && (
            <>
              <div className="lb-account-books">
                {books.map((head, i) => (
                  <div key={head.id} data-tone={bookTones[i % bookTones.length]}>
                    <button
                      disabled={working}
                      onClick={() => void act(() => open(head))}
                    >
                      <span className="lb-book-initial" aria-hidden="true">
                        {head.label.trim().charAt(0).toUpperCase() || "R"}
                      </span>
                      <span>
                        {head.label}
                        <small>
                          {head.accountManaged
                            ? "Open book →"
                            : "Earlier book · original passphrase needed"}
                        </small>
                      </span>
                    </button>
                  </div>
                ))}
              </div>
              {!sync.books.length && (
                <section className="lb-account-empty">
                  <BookOpen size={30} />
                  <h3>Your library is empty</h3>
                  <p>
                    Start with yours, then add the kids. Their profiles belong
                    to this parent account—no child email or password needed.
                  </p>
                </section>
              )}
              <div className="lb-account-actions">
                {!hasOwnBook && (
                  <button
                    className="lb-primary"
                    disabled={working}
                    onClick={() => {
                      setAdding(true);
                      setAudience("adult");
                    }}
                  >
                    <Plus size={17} />
                    Add my book
                  </button>
                )}
                <button
                  className="lb-secondary"
                  disabled={working}
                  onClick={() => {
                    setAdding(true);
                    setAudience("");
                  }}
                >
                  <Plus size={17} />
                  Add a child
                </button>
              </div>
            </>
          )}
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
              <h3>
                {audience === "adult"
                  ? "Create your book"
                  : "Add a child’s book"}
              </h3>
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
              {audience !== "adult" && (
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
                    Their prompts and activities will match this age range.
                    Their entries and photos save under your account. A parent
                    password protects access to the family library and parent
                    settings.
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
              <h3>Open {chosen.label}’s earlier book</h3>
              <p>
                This copy still uses its original book passphrase. Once it’s
                open, choose Account to add it to your sign-in library.
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
              <button type="button" onClick={() => setChosen(null)}>
                Back to library
              </button>
            </form>
          )}
          <p className="lb-fine">
            Children’s profiles are managed by this adult account. Signing into
            the same account on another device brings the whole library with
            you. AI and sharing with other accounts still need your permission.
          </p>
        </>
      )}
      {(error || sync.error) && (
        <p role="alert" className="lb-error">
          {error || sync.error}
        </p>
      )}
      {working && <p role="status">Working on your library…</p>}
      {notice && <p role="status">{notice}</p>}
      {user && (
        <button
          disabled={working}
          onClick={() =>
            void act(async () => {
              await disconnectAI();
              vault.lock();
              sync.refreshUser();
              setParentReady(false);
            })
          }
        >
          Sign out
        </button>
      )}
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
    </div>
  );
  return inline ? (
    <main className="r-app lb-app lb-library-home">
      <header>
        <div>
          <p className="lb-wordmark">relish</p>
          <p>The operating manual for relationships</p>
        </div>
        <svg
          className="lb-library-sun"
          aria-hidden="true"
          width="120"
          height="72"
          viewBox="0 0 120 72"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="30" cy="36" r="16" fill="#f2d58a" />
          <path d="M30 10v-6M30 68v-6M4 36h6M50 36h6M12 18l4 4M44 50l4 4M12 54l4-4M44 22l4-4" />
          <path d="M70 52c6-14 18-14 24 0M84 30a6 6 0 1 0 0.1 0" fill="#e9b9a0" />
          <path d="M100 56c3-8 10-8 13 0M106 42a4 4 0 1 0 0.1 0" fill="#cfdcc4" />
        </svg>
      </header>
      <section>{content}</section>
    </main>
  ) : (
    <Dialog title="Your family library" onClose={onClose}>
      {content}
    </Dialog>
  );
}
