"use client";
import { useEffect, useRef, useState } from "react";
import { Cloud, Lock, ArrowUpRight } from "lucide-react";
import { sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
import { connectAI, disconnectAI, getAIAuth } from "@/lib/relish/ai-auth";
import { verifyParent } from "@/lib/relish/profiles";
import { readBinding, type SyncedEdition } from "@/lib/relish/book-sync";
import type { useLocalBook } from "./useLocalBook";
import type { useBookSync } from "./useBookSync";
import { Dialog } from "./BookForms";
export default function AccountLibrary({
  vault,
  sync,
  onClose,
}: {
  vault: ReturnType<typeof useLocalBook>;
  sync: ReturnType<typeof useBookSync>;
  onClose: () => void;
}) {
  const passInput = useRef<HTMLInputElement>(null);
  const child = vault.mode === "open" && vault.book.profile?.kind === "child";
  const [parentReady, setParentReady] = useState(!child);
  const [parentPass, setParentPass] = useState("");
  const [email, setEmail] = useState(child ? sync.user?.email || "" : ""),
    [password, setPassword] = useState(""),
    [create, setCreate] = useState(false),
    [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [consent, setConsent] = useState(false);
  const [chosen, setChosen] = useState<SyncedEdition | null>(null),
    [passphrase, setPassphrase] = useState(""),
    [removing, setRemoving] = useState<string | null>(null);
  useEffect(() => {
    if (chosen) passInput.current?.focus();
  }, [chosen]);
  const user = sync.user,
    bound = readBinding(vault.editionId),
    working = busy || sync.working;
  useEffect(() => {
    if (user?.emailVerified && parentReady) void sync.refresh().catch(() => {});
    // Refresh only when this dialog acquires an authorized account, not on render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.emailVerified, parentReady]);
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Account and synced books" onClose={onClose}>
      <div className="lb-account">
        <p className="lb-kicker">
          <Cloud size={16} /> Your books, wherever you are
        </p>
        <h2>
          {child && !parentReady
            ? "A parent’s turn."
            : user && parentReady
              ? "Your Relish library."
              : "Welcome back."}
        </h2>
        <p>
          One adult account, across your devices. Each edition keeps its own
          book passphrase. Children’s books can sync through a parent’s account.
        </p>
        {!user || !parentReady ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                if (!adult)
                  throw new Error(
                    "Confirm you are the adult managing this account.",
                  );
                if (
                  vault.book.profile?.kind === "child" &&
                  !(await verifyParent(
                    vault.book.profile.parentLock,
                    parentPass,
                  ))
                )
                  throw new Error("That parent passphrase did not match.");
                await connectAI(email, password, create);
                setParentPass("");
                setPassword("");
                setParentReady(true);
                sync.refreshUser();
                if (create)
                  setNotice(
                    "Check your email for a verification link, then return here.",
                  );
              });
            }}
          >
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
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
            {child && (
              <label>
                Parent passphrase
                <input
                  type="password"
                  autoComplete="off"
                  required
                  value={parentPass}
                  onChange={(e) => setParentPass(e.target.value)}
                />
              </label>
            )}
            <label className="lb-account-check">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
              />
              I’m 18 or older and manage this account
              {child ? " as a parent or guardian" : ""}.
            </label>
            <button className="lb-primary" disabled={working || !adult}>
              {create
                ? "Create adult account"
                : child
                  ? "Parent sign in"
                  : "Sign in"}
              <ArrowUpRight size={16} />
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
                      "If that email has an account, you’ll receive a reset link.",
                    );
                  })
                }
              >
                Forgot account password?
              </button>
            </div>
          </form>
        ) : !user.emailVerified ? (
          <section>
            <p>
              Verify <strong>{user.email}</strong> before syncing books.
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
                      "The email is not verified yet. Check its link and try again.",
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
            {vault.mode === "open" && (
              <section className="lb-account-current">
                <h3>{vault.book.owner}’s book</h3>
                {bound ? (
                  <>
                    <p role="status">{sync.status}</p>
                    <button
                      className="lb-primary"
                      disabled={working}
                      onClick={() => void act(sync.syncNow)}
                    >
                      Sync now
                    </button>
                  </>
                ) : (
                  <>
                    <p>
                      Keep an encrypted copy of this book, its photos and
                      private passages in your account. Only devices with its
                      passphrase can read it. Its edition name is visible in
                      your signed-in library.
                    </p>
                    <label className="lb-account-check">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      {child
                        ? "As a parent or guardian, I authorize encrypted sync for this child’s book."
                        : "Keep this book synced across my devices."}
                    </label>
                    <button
                      className="lb-primary"
                      disabled={working || !consent}
                      onClick={() => void act(sync.enable)}
                    >
                      Enable encrypted sync
                    </button>
                    <p className="lb-fine">
                      Leave this off to keep the book local only.
                    </p>
                  </>
                )}
                {sync.conflict && (
                  <div className="lb-account-conflict">
                    <h3>Both devices have new pages.</h3>
                    <p>
                      We’ll keep this device’s complete version as a separate
                      book on your bookshelf, then open the latest synced
                      version. You can bring passages across deliberately.
                    </p>
                    <button
                      className="lb-primary"
                      disabled={working}
                      onClick={() => void act(sync.keepBoth)}
                    >
                      Keep both & open latest
                    </button>
                  </div>
                )}
              </section>
            )}
            <section>
              <h3>Your synced editions</h3>
              <p className="lb-fine">
                Adult and children’s editions live in the same library. Syncing
                does not share private pages with other family accounts or with
                AI.
              </p>
              {!sync.books.length && (
                <p>
                  No books synced yet. Open a book on the device where it lives,
                  then enable encrypted sync here.
                </p>
              )}
              {!chosen && (
                <div className="lb-account-books">
                  {sync.books.map((head) => (
                    <div key={head.id}>
                      <button
                        disabled={working}
                        onClick={() => {
                          setChosen(head);
                          setPassphrase("");
                          setRemoving(null);
                        }}
                      >
                        <Lock size={17} />
                        <span>
                          {head.label}
                          <small>
                            Updated {new Date(head.updatedAt).toLocaleString()}
                          </small>
                        </span>
                        <ArrowUpRight size={16} />
                      </button>
                      {removing === head.id ? (
                        <div>
                          <p>
                            Remove this synced copy? Books already saved on your
                            devices stay there.
                          </p>
                          <button
                            disabled={working}
                            onClick={() =>
                              void act(async () => {
                                await sync.remove(head);
                                setRemoving(null);
                                setChosen(null);
                              })
                            }
                          >
                            Remove synced copy
                          </button>
                          <button
                            disabled={working}
                            onClick={() => setRemoving(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="lb-fine"
                          disabled={working}
                          onClick={() => setRemoving(head.id)}
                        >
                          Remove synced copy…
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => {
                      setChosen(null);
                      setPassphrase("");
                    }}
                  >
                    ← Back to your library
                  </button>
                  <h3>Open {chosen.label}’s book</h3>
                  <label>
                    Book passphrase
                    <input
                      type="password"
                      autoComplete="off"
                      ref={passInput}
                      required
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                    />
                  </label>
                  <p className="lb-fine">
                    This is the passphrase chosen for this book, separate from
                    your account password. Relish cannot recover a forgotten
                    book passphrase.
                  </p>
                  <button className="lb-primary" disabled={working}>
                    Unlock on this device
                  </button>
                </form>
              )}
              <button disabled={working} onClick={() => void act(sync.refresh)}>
                Refresh library
              </button>
            </section>
          </>
        )}
        {(error || sync.error) && (
          <p role="alert" className="lb-error">
            {error || sync.error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {user && parentReady && (
          <button
            disabled={working}
            onClick={() =>
              void act(async () => {
                await disconnectAI();
                sync.refreshUser();
                setChosen(null);
                setParentReady(!child);
              })
            }
          >
            Sign out
          </button>
        )}
        <p className="lb-fine">
          Book passphrases stay on your device. Account access ends when you
          reload or lock Relish.{" "}
          <a href="/privacy/" target="_blank" rel="noreferrer">
            Privacy details
          </a>
        </p>
      </div>
    </Dialog>
  );
}
