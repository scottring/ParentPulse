"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Lock, Plus, Cloud } from "lucide-react";
import { useLocalBook } from "./useLocalBook";
import { SensoryProvider } from "./Sensory";
import { Dialog, VaultForm } from "./BookForms";
import LivingBook from "./LivingBook";
import type { FamilyPerson } from "./Home";
import { readHomeBook, writeHomeBook } from "./homeBook";
import EditionSetup from "./EditionSetup";
import AccountLibrary from "./AccountLibrary";
import { useBookSync } from "./useBookSync";
import Illustration from "./Illustration";
import { PaperCard, PrivateNote } from "./ui";
import type { ReactNode } from "react";
import { readBinding } from "@/lib/relish/book-sync";
import { disconnectAI, setParentGate } from "@/lib/relish/ai-auth";
import "./relish.css";
import "./experience.css";
import "./living-book.css";
import "./account.css";
// Loaded last: the one set of tokens and shared pieces every screen uses.
import "./ui.css";

/** Before a book is open: the wordmark, then one sheet of paper. */
function Gate({
  children,
  className = "",
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <main className={`r-app lb-gate lb-gate-one ${wide ? "lb-gate-wide" : ""} ${className}`}>
      <header className="lb-gate-head">
        <p className="lb-wordmark">relish</p>
        <p>The operating manual for relationships</p>
      </header>
      <PaperCard className="lb-gate-paper">{children}</PaperCard>
    </main>
  );
}

export default function RelishApp() {
  return (
    <SensoryProvider>
      <BookGate />
    </SensoryProvider>
  );
}
function BookGate() {
  const vault = useLocalBook();
  const sync = useBookSync(vault);
  const [accountOpen, setAccountOpen] = useState(false);
  const [addChild, setAddChild] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [exportOpen, setExportOpen] = useState(false),
    [exportPass, setExportPass] = useState("");
  const binding = readBinding(vault.editionId);
  const managed = !!binding?.accountManaged;
  const unauthorized =
    managed &&
    vault.mode === "open" &&
    sync.authReady &&
    binding?.uid !== sync.user?.uid;
  useEffect(() => {
    if (unauthorized) {
      vault.lock();
      // Account changes clear the view before any other account may render it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unauthorized]);
  useEffect(() => {
    if (vault.mode === "open")
      setParentGate(
        vault.book.profile?.kind === "child"
          ? vault.book.profile.parentLock
          : null,
      );
  }, [vault.mode, vault.book.profile, accountOpen]);
  const closeAccount = () => {
    sync.cancel();
    setAccountOpen(false);
    setAddChild(false);
    setLocalMode(false);
  };
  const library = (inline = false) => (
    <AccountLibrary
      vault={vault}
      sync={sync}
      onClose={closeAccount}
      inline={inline}
      startAdding={!inline && addChild ? "child" : undefined}
      onLocal={
        inline
          ? () => {
              setLocalMode(true);
              vault.shelf();
            }
          : undefined
      }
      onExplore={
        inline && vault.mode === "sample" ? () => setLocalMode(true) : undefined
      }
    />
  );

  // Remember the signed-in adult's own book whenever it is open.
  const ownBook =
    vault.mode === "open" &&
    managed &&
    vault.book.profile?.kind === "adult" &&
    !!sync.user &&
    binding?.uid === sync.user.uid
      ? binding.remoteId
      : null;
  useEffect(() => {
    if (ownBook && sync.user) writeHomeBook(sync.user.uid, ownBook);
  }, [ownBook, sync.user]);
  // Land on that book's Home instead of stopping at the family library.
  const signedIn = useRef<string | null | undefined>(undefined);
  const openHome = useRef(false);
  useEffect(() => {
    if (!sync.authReady) return;
    const uid = sync.user?.uid ?? null;
    // Open your own book after signing in and whenever Relish first loads
    // signed in (a reload, a new tab, the iPhone app). Not after Lock.
    if ((signedIn.current === null || signedIn.current === undefined) && uid)
      openHome.current = true;
    signedIn.current = uid;
    if (!openHome.current || sync.working) return;
    if (vault.mode === "open") {
      openHome.current = false;
      return;
    }
    if (!sync.user?.emailVerified || !sync.books.length) return;
    openHome.current = false;
    const home = readHomeBook(sync.user.uid);
    const head = sync.books.find((b) => b.id === home && b.accountManaged);
    if (head) void sync.open(head).catch(() => {});
    // Acts once per sign-in; sync.open is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync.authReady, sync.user, sync.working, sync.books, vault.mode]);
  useEffect(() => {
    const close = () => setAccountOpen(false);
    window.addEventListener("relish:locked", close);
    return () => window.removeEventListener("relish:locked", close);
  }, []);
  useEffect(() => {
    if (["locked", "shelf", "new"].includes(vault.mode))
      window.dispatchEvent(new Event("relish:locked"));
  }, [vault.mode]);
  function content() {
    if (vault.mode === "loading" || !sync.authReady)
      return (
        <main className="r-app lb-gate lb-gate-one lb-gate-loading">
          <header className="lb-gate-head">
            <p className="lb-wordmark">relish</p>
            <p role="status">Opening Relish…</p>
          </header>
        </main>
      );
    if (unauthorized || (!localMode && vault.mode !== "open"))
      return library(true);
    if (vault.mode === "shelf")
      return (
        <Gate className="lb-app lb-shelf" wide>
          <section>
            <header className="lb-shelf-heading">
              <p className="lb-kicker">
                Local books
              </p>
              <h1>Choose a book</h1>
              <p className="lb-shelf-intro">
                These books are stored on this device. Open one with its
                original passphrase, then choose Account to add it to your
                online library.
              </p>
            </header>
            <div className="lb-edition-grid">
              {vault.editions
                .filter((e) => !readBinding(e.id)?.accountManaged)
                .map((e) => (
                  <button key={e.id} onClick={() => vault.select(e.id)}>
                    <span className="lb-edition-icons" aria-hidden="true">
                      <Lock size={20} />
                      <ArrowUpRight size={18} />
                    </span>
                    <span className="lb-edition-title">
                      {e.label}’s book
                    </span>
                    <small>Enter its passphrase to open</small>
                  </button>
                ))}
            </div>
            <footer className="lb-shelf-footer">
              <button className="lb-primary" onClick={() => vault.select()}>
                <Plus size={16} aria-hidden="true" /> Add a book or restore a
                backup
              </button>
              <p className="lb-fine">
                Book names are visible on this device. Writing, games and
                private keys stay encrypted.
              </p>
            </footer>
          </section>
        </Gate>
      );
    if (vault.mode === "new")
      return (
        <Gate className="lb-gate-form">
          <Illustration name="your-book" size={120} eager className="lb-gate-art-img" />
          <VaultForm
            locked={false}
            busy={vault.busy}
            error={vault.error}
            onSubmit={vault.open}
            onCancel={vault.shelf}
            cancelLabel="Back to the bookshelf"
          />
          <p className="lb-fine lb-gate-note">
            Choose your own passphrase. Other books on this device aren’t changed.
          </p>
        </Gate>
      );
    if (vault.mode === "locked")
      return (
        <Gate className="lb-gate-form">
          <Illustration name="locked" size={120} eager className="lb-gate-art-img" />
          <p className="lb-kicker">Unlock your local book</p>
          <PrivateNote>Encrypted. Yours to unlock.</PrivateNote>
          <VaultForm
            locked
            busy={vault.busy}
            error={vault.error}
            onSubmit={vault.open}
            onCancel={vault.shelf}
            cancelLabel="Choose another book"
          />
        </Gate>
      );
    if (vault.mode === "open" && !vault.book.profile)
      return (
        <Gate className="lb-app lb-profile-gate" wide>
          <EditionSetup
            book={vault.book}
            save={vault.save}
            onCancel={vault.shelf}
          />
        </Gate>
      );
    // The other books in this parent account, shown as people in an adult
    // book. A child's book never lists or opens its siblings' books.
    const family: FamilyPerson[] =
      vault.book.profile?.kind === "adult" &&
      managed &&
      sync.user?.emailVerified &&
      binding?.uid === sync.user.uid
        ? sync.books
            .filter(
              (h) =>
                h.accountManaged &&
                h.id !== binding.remoteId &&
                !h.label.endsWith("— device copy"),
            )
            .map((h) => ({
              id: h.id,
              name: h.label,
              note: "Book in your account",
              onOpen: () =>
                void sync.open(h).catch(() => setAccountOpen(true)),
            }))
        : [];
    return (
      <LivingBook
        key={`${vault.mode}:${vault.editionId}`}
        family={family}
        onAddChild={() => {
          setAddChild(true);
          setAccountOpen(true);
        }}
        vault={{
          ...vault,
          shelf: () => {
            if (sync.user) setAccountOpen(true);
            else vault.shelf();
          },
          lock: () => {
            void disconnectAI();
            vault.lock();
            setLocalMode(false);
          },
          backup: async () => {
            if (managed) setExportOpen(true);
            else await vault.backup();
          },
        }}
        onAccount={() => setAccountOpen(true)}
        accountLabel={sync.user ? "Family library" : "Sign in"}
        syncStatus={sync.status}
        onInteraction={(value) => sync.setPaused(value || accountOpen)}
      />
    );
  }
  return (
    <>
      {content()}
      <div className="lb-app lb-account-host">
        {localMode && ["shelf", "new", "locked"].includes(vault.mode) && (
          <button
            className="lb-gate-account"
            onClick={() => setLocalMode(false)}
          >
            <Cloud size={16} />
            {sync.user
              ? "Account & synced books"
              : "Already use Relish? Sign in"}
          </button>
        )}
        {accountOpen && library()}
        {exportOpen && (
          <Dialog
            title="Export a backup"
            onClose={() => {
              setExportOpen(false);
              setExportPass("");
            }}
          >
            <form
              className="lb-account"
              onSubmit={(e) => {
                e.preventDefault();
                void vault.backup(exportPass).then(() => {
                  setExportOpen(false);
                  setExportPass("");
                });
              }}
            >
              <h2>Export a backup</h2>
              <p>
                Choose a passphrase for this backup. You’ll need it to restore
                the file. For a child’s backup, it also becomes the restored
                book’s parent passphrase.
              </p>
              <label>
                Backup passphrase
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={exportPass}
                  onChange={(e) => setExportPass(e.target.value)}
                />
              </label>
              <button className="lb-primary">Export encrypted backup</button>
            </form>
          </Dialog>
        )}
      </div>
    </>
  );
}
