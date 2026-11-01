"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Lock, Plus, Cloud } from "lucide-react";
import { useLocalBook } from "./useLocalBook";
import { SensoryProvider } from "./Sensory";
import { Dialog, VaultForm } from "./BookForms";
import LivingBook from "./LivingBook";
import EditionSetup from "./EditionSetup";
import AccountLibrary from "./AccountLibrary";
import { useBookSync } from "./useBookSync";
import { readBinding } from "@/lib/relish/book-sync";
import { disconnectAI, setParentGate } from "@/lib/relish/ai-auth";
import "./relish.css";
import "./experience.css";
import "./living-book.css";
import "./account.css";

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
    if (vault.mode === "open" && vault.book.profile?.kind === "child")
      setParentGate(vault.book.profile.parentLock);
  }, [vault.mode, vault.book.profile]);
  const closeAccount = () => {
    sync.cancel();
    setAccountOpen(false);
    setLocalMode(false);
  };
  const library = (inline = false) => (
    <AccountLibrary
      vault={vault}
      sync={sync}
      onClose={closeAccount}
      inline={inline}
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
        <div className="r-app lb-gate">
          <p className="lb-wordmark">relish</p>
          <p role="status">Opening a little space…</p>
        </div>
      );
    if (unauthorized || (!localMode && vault.mode !== "open"))
      return library(true);
    if (vault.mode === "shelf")
      return (
        <main className="r-app lb-app lb-gate lb-shelf">
          <section>
            <p className="lb-wordmark">relish</p>
            <header className="lb-shelf-heading">
              <p className="lb-kicker">
                A library of lives, connected by choice
              </p>
              <h1>Whose book are we opening?</h1>
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
                      The {e.label} edition
                    </span>
                    <small>Unlock to pick up your thread</small>
                  </button>
                ))}
            </div>
            <footer className="lb-shelf-footer">
              <button className="lb-primary" onClick={() => vault.select()}>
                <Plus size={16} aria-hidden="true" /> Add an edition or restore
                a backup
              </button>
              <p className="lb-fine">
                Edition names are visible on this device. Writing, games and
                private keys stay encrypted.
              </p>
            </footer>
          </section>
        </main>
      );
    if (vault.mode === "new")
      return (
        <div className="r-app lb-gate">
          <section>
            <p className="lb-wordmark">relish</p>
            <h1>A book of your own.</h1>
            <p>
              Choose your own passphrase. Nobody else’s edition will be changed.
            </p>
          </section>
          <VaultForm
            locked={false}
            busy={vault.busy}
            error={vault.error}
            onSubmit={vault.open}
            onCancel={vault.shelf}
            cancelLabel="Back to the bookshelf"
          />
        </div>
      );
    if (vault.mode === "locked")
      return (
        <div className="r-app lb-gate">
          <div className="lb-gate-art">
            <p className="lb-wordmark">relish</p>
            <p className="lb-kicker">The operating manual for relationships</p>
            <h1>
              Some things
              <br />
              are yours
              <br />
              to keep.
            </h1>
            <p>
              <Lock size={15} /> Encrypted. Yours to unlock.
            </p>
          </div>
          <VaultForm
            locked
            busy={vault.busy}
            error={vault.error}
            onSubmit={vault.open}
            onCancel={vault.shelf}
            cancelLabel="Choose another edition"
          />
        </div>
      );
    if (vault.mode === "open" && !vault.book.profile)
      return (
        <div className="r-app lb-app lb-gate lb-profile-gate">
          <section>
            <p className="lb-wordmark">relish</p>
            <EditionSetup
              book={vault.book}
              save={vault.save}
              onCancel={vault.shelf}
            />
          </section>
        </div>
      );
    return (
      <LivingBook
        key={`${vault.mode}:${vault.editionId}`}
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
              <h2>A copy you can keep.</h2>
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
