"use client";
import { useEffect } from "react";
import { Lock } from "lucide-react";
import { useLocalBook } from "./useLocalBook";
import { SensoryProvider } from "./Sensory";
import { VaultForm } from "./BookForms";
import LivingBook from "./LivingBook";
import "./relish.css";
import "./experience.css";
import "./living-book.css";

export default function RelishApp() {
  return (
    <SensoryProvider>
      <BookGate />
    </SensoryProvider>
  );
}
function BookGate() {
  const vault = useLocalBook();
  useEffect(() => {
    if (["locked", "shelf", "new"].includes(vault.mode))
      window.dispatchEvent(new Event("relish:locked"));
  }, [vault.mode]);
  if (vault.mode === "loading")
    return (
      <div className="r-app lb-gate">
        <p className="lb-wordmark">relish</p>
        <p role="status">Opening a little space…</p>
      </div>
    );
  if (vault.mode === "shelf")
    return (
      <div className="r-app lb-gate lb-shelf">
        <section>
          <p className="lb-wordmark">relish</p>
          <p className="lb-kicker">A library of lives, connected by choice</p>
          <h1>
            Whose book
            <br />
            are we opening?
          </h1>
          <p>
            Every edition has its own passphrase. Family members share passages,
            never access to each other’s private pages.
          </p>
          <div className="lb-edition-grid">
            {vault.editions.map((e) => (
              <button key={e.id} onClick={() => vault.select(e.id)}>
                <Lock size={20} />
                <span>The {e.label} edition</span>
                <small>Unlock to pick up your thread</small>
              </button>
            ))}
          </div>
          <button className="lb-primary" onClick={() => vault.select()}>
            Add an edition or restore a backup
          </button>
          <p className="lb-fine">
            Edition names are visible on this device. Writing, games and private
            keys stay encrypted.
          </p>
        </section>
      </div>
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
            <Lock size={15} /> Encrypted. On this device.
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
  return <LivingBook key={`${vault.mode}:${vault.editionId}`} vault={vault} />;
}
