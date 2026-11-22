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
import { useAccountFamily } from "./useFamilyBook";
import Illustration from "./Illustration";
import { PaperCard, PrivateNote } from "./ui";
import type { ReactNode } from "react";
import { readBinding, type SyncedEdition } from "@/lib/relish/book-sync";
import { disconnectAI, getParentGate, setParentGate } from "@/lib/relish/ai-auth";
import { postToNative, widgetMessage } from "@/lib/relish/native-bridge";
import "./relish.css";
import "./experience.css";
import "./living-book.css";
import "./account.css";
// Loaded last: the one set of tokens and shared pieces every screen uses.
import "./ui.css";
// Home · Journal ▾ · Activities (2026-11-21), over the screens it reorganizes.
import "./journal-nav.css";

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
        <p>The journal your family keeps together</p>
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
  // An older synced book chosen on Family: opens on its passphrase form.
  const [opening, setOpening] = useState<SyncedEdition | null>(null);
  // After the parent unlock from a child's book, the adult's own book opens
  // on Family.
  const [startOn, setStartOn] = useState<string | null>(null);
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
  // Our family book lives in the account while a signed-in account book is
  // open, the adult's or a child's; otherwise inside the open book.
  const accountFamily = useAccountFamily(
    vault.mode === "open" &&
      managed &&
      !unauthorized &&
      !!sync.user?.emailVerified &&
      binding?.uid === sync.user.uid &&
      (vault.book.profile?.kind === "adult" ||
        vault.book.profile?.kind === "child")
      ? sync.family
      : null,
    binding?.remoteId ?? vault.editionId,
  );
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
    setOpening(null);
    setLocalMode(false);
  };
  const library = (inline = false) => (
    <AccountLibrary
      vault={vault}
      sync={sync}
      onClose={closeAccount}
      inline={inline}
      startAdding={!inline && addChild ? "child" : undefined}
      opening={!inline && opening ? opening : undefined}
      onSwitchHome={(head) => setStartOn(head.id)}
      onLocal={() => {
        // From the dialog, close it first; the open book locks on the shelf.
        if (!inline) closeAccount();
        setLocalMode(true);
        vault.shelf();
      }}
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
  // Land on that book's Home; books are chosen on Family, not a library.
  // While that's under way, show the quiet opening screen, not a library
  // that flashes "empty" and then a list before the book opens.
  const signedIn = useRef<string | null | undefined>(undefined);
  const openHome = useRef(false);
  const fetched = useRef(false);
  const [landing, setLanding] = useState(false);
  // Until the effect below has looked at this sign-in, assume we'll land so
  // the library never shows for a frame first.
  const [decided, setDecided] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- landing follows auth and sync state as it arrives */
  useEffect(() => {
    if (!sync.authReady) return;
    const uid = sync.user?.uid ?? null;
    // Open your own book after signing in and whenever Relish first loads
    // signed in (a reload, a new tab, the iPhone app). Not after Lock, and
    // never past a parent gate left by a child's book.
    if ((signedIn.current === null || signedIn.current === undefined) && uid) {
      openHome.current = true;
      fetched.current = false;
      const canLand =
        !!readHomeBook(uid) && !getParentGate() && vault.mode !== "open";
      setLanding(canLand);
      setDecided(true);
    }
    if (!uid) {
      openHome.current = false;
      setLanding(false);
      setDecided(true);
    }
    signedIn.current = uid;
    if (!openHome.current || sync.working) return;
    if (vault.mode === "open") {
      openHome.current = false;
      setLanding(false);
      return;
    }
    if (!sync.user?.emailVerified) {
      setLanding(false);
      return;
    }
    if (!sync.books.length) {
      if (landing && !fetched.current) {
        fetched.current = true;
        void sync.refresh().catch(() => setLanding(false));
      } else if (fetched.current) setLanding(false);
      return;
    }
    openHome.current = false;
    const home = readHomeBook(sync.user.uid);
    const head = sync.books.find((b) => b.id === home && b.accountManaged);
    if (head && !getParentGate())
      void sync.open(head).catch(() => setLanding(false));
    else setLanding(false);
    // Acts once per sign-in; sync.open/refresh are recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync.authReady, sync.user, sync.working, sync.books, vault.mode, landing]);
  /* eslint-enable react-hooks/set-state-in-effect */
  // When the book locks by itself (left idle, or the tab or app put away),
  // open your own book again as soon as you come back, the same as a
  // reload: no library in between. Lock, Sign out and a child's parent gate
  // still stop here.
  const [resting, setResting] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- follows the vault's lock state */
  useEffect(() => {
    const user = sync.user;
    if (
      !vault.autoLocked ||
      vault.mode !== "locked" ||
      !user?.emailVerified ||
      !readHomeBook(user.uid) ||
      getParentGate()
    ) {
      setResting(false);
      return;
    }
    setResting(true);
    const events = ["pointerdown", "pointermove", "keydown", "touchstart", "focus"];
    const stop = () => {
      events.forEach((e) => window.removeEventListener(e, back));
      document.removeEventListener("visibilitychange", back);
    };
    function back() {
      if (document.hidden) return;
      stop();
      openHome.current = true;
      fetched.current = false;
      setLanding(true);
      setResting(false);
    }
    events.forEach((e) => window.addEventListener(e, back));
    document.addEventListener("visibilitychange", back);
    return stop;
  }, [vault.autoLocked, vault.mode, sync.user]);
  /* eslint-enable react-hooks/set-state-in-effect */
  // Never strand someone on the opening screen: after 8 s, show the library.
  useEffect(() => {
    if (!landing) return;
    const t = window.setTimeout(() => setLanding(false), 8000);
    return () => window.clearTimeout(t);
  }, [landing]);
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
    if (
      vault.mode === "loading" ||
      !sync.authReady ||
      ((landing ||
        resting ||
        (!decided &&
          !!sync.user &&
          !!readHomeBook(sync.user.uid) &&
          !getParentGate())) &&
        vault.mode !== "open")
    )
      return (
        <main className="r-app lb-gate lb-gate-one lb-gate-loading">
          <header className="lb-gate-head">
            <p className="lb-wordmark">relish</p>
            <p role="status">
              {resting ? "Your journal is resting. Tap to open it." : "Opening Relish…"}
            </p>
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
                Local journals
              </p>
              <h1>Choose a journal</h1>
              <p className="lb-shelf-intro">
                These journals are stored on this device. Open one with its
                original passphrase, then choose Account to add it to your
                account.
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
                      {e.label}’s journal
                    </span>
                    <small>Enter its passphrase to open</small>
                  </button>
                ))}
            </div>
            <footer className="lb-shelf-footer">
              <button className="lb-primary" onClick={() => vault.select()}>
                <Plus size={16} aria-hidden="true" /> Add a journal or restore a
                backup
              </button>
              <p className="lb-fine">
                Journal names are visible on this device. Writing, games and
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
            cancelLabel="Back to journals on this device"
          />
          <p className="lb-fine lb-gate-note">
            Choose your own passphrase. Other journals on this device aren’t changed.
          </p>
        </Gate>
      );
    if (vault.mode === "locked")
      return (
        <Gate className="lb-gate-form">
          <Illustration name="locked" size={120} eager className="lb-gate-art-img" />
          <p className="lb-kicker">Unlock your local journal</p>
          <PrivateNote>Encrypted. Yours to unlock.</PrivateNote>
          <VaultForm
            locked
            busy={vault.busy}
            error={vault.error}
            onSubmit={vault.open}
            onCancel={vault.shelf}
            cancelLabel="Choose another journal"
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
    // The other books in this parent account, shown as covers on Family in
    // an adult book: account books first, then older synced copies that
    // still need their original passphrase. A child's book never lists or
    // opens its siblings' books.
    const family: FamilyPerson[] =
      vault.book.profile?.kind === "adult" &&
      managed &&
      sync.user?.emailVerified &&
      binding?.uid === sync.user.uid
        ? sync.books
            .filter(
              (h) =>
                h.id !== binding.remoteId && !h.label.endsWith("— device copy"),
            )
            .toSorted((a, b) => Number(!a.accountManaged) - Number(!b.accountManaged))
            .map((h) => ({
              id: h.id,
              name: h.label,
              note: "Journal in your account",
              locked: !h.accountManaged,
              onOpen: h.accountManaged
                ? () => void sync.open(h).catch(() => setAccountOpen(true))
                : () => {
                    setOpening(h);
                    setAccountOpen(true);
                  },
            }))
        : vault.mode === "sample" && vault.book.profile?.kind === "adult"
          ? // The sample's child, so Kids' journals can be explored too.
            [{ id: "sample-leo", name: "Leo", onOpen: vault.openSampleChild }]
          : [];
    return (
      <LivingBook
        key={`${vault.mode}:${vault.editionId}:${vault.book.profile?.kind ?? ""}`}
        family={family}
        onBackHome={
          vault.book.profile?.kind !== "child"
            ? undefined
            : vault.mode === "sample"
              ? vault.closeSampleChild
              : sync.user
                ? () => setAccountOpen(true)
                : undefined
        }
        familyBook={accountFamily}
        startView={startOn && binding?.remoteId === startOn ? "family" : undefined}
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
            // The iPhone app's widgets forget this family until it opens again.
            postToNative(widgetMessage(null, null));
            // Signs out too; tell sync so the sign-in screen shows at once.
            void disconnectAI().finally(() =>
              window.dispatchEvent(new Event("relish:account")),
            );
            vault.lock();
            setLocalMode(false);
          },
          backup: async () => {
            if (managed) setExportOpen(true);
            else await vault.backup();
          },
        }}
        onAccount={() => setAccountOpen(true)}
        accountLabel={
          !sync.user
            ? "Sign in"
            : vault.book.profile?.kind === "child"
              ? "Switch journal"
              : "Account"
        }
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
              ? "Account & synced journals"
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
