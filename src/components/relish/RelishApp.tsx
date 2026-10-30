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
    if (vault.mode === "locked")
      window.dispatchEvent(new Event("relish:locked"));
  }, [vault.mode]);
  if (vault.mode === "loading")
    return (
      <div className="r-app lb-gate">
        <p className="lb-wordmark">relish</p>
        <p role="status">Opening a little space…</p>
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
        />
      </div>
    );
  return <LivingBook key={vault.mode} vault={vault} />;
}
