"use client";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import type { Book } from "@/lib/relish/model";
import {
  ageBands,
  ageLabels,
  configureProfile,
  parentCredentialLabel,
  type Audience,
} from "@/lib/relish/profiles";

export default function EditionSetup({
  book,
  save,
  onDone,
  onCancel,
  accountUid,
}: {
  book: Book;
  accountUid?: string;
  save: (change: (b: Book) => Book) => Promise<void>;
  onDone?: () => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<"adult" | "child" | "">(
    book.profile?.kind || "",
  );
  const [band, setBand] = useState<Audience | "">(
    book.profile?.kind === "child" ? book.profile.ageBand : "",
  );
  const [parentPass, setParentPass] = useState(""),
    [confirm, setConfirm] = useState("");
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const protectedEdition = book.profile?.kind === "child";
  const newLock = kind === "child" && !protectedEdition && !accountUid;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !confirmed || !kind || (kind === "child" && !band)) return;
    setBusy(true);
    setError("");
    try {
      if (newLock && parentPass !== confirm)
        throw new Error("The parent passphrases need to match.");
      const before = JSON.stringify(book.profile);
      const profile = await configureProfile(
        book,
        kind === "adult" ? "adult" : (band as Audience),
        parentPass,
        accountUid,
      );
      if (!alive.current) return;
      await save((b) => {
        if (JSON.stringify(b.profile) !== before)
          throw new Error(
            "The edition settings changed. Reopen them and try again.",
          );
        return { ...b, profile };
      });
      window.dispatchEvent(new Event("relish:locked"));
      if (!alive.current) return;
      setParentPass("");
      setConfirm("");
      onDone?.();
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "These settings could not be saved. Please try again.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <form className="r-form lb-edition-setup" onSubmit={submit}>
      <p className="lb-kicker">
        <ShieldCheck size={17} /> Made for the person opening it
      </p>
      <h2>
        {book.profile ? "Edition & parent settings" : "Who is this book for?"}
      </h2>
      <p>
        The {book.owner} edition can meet its reader where they are. Choose
        explicitly; Relish never guesses from a name.
      </p>
      <fieldset disabled={busy}>
        <legend>This edition belongs to</legend>
        <div className="lb-profile-choices">
          <button
            type="button"
            aria-pressed={kind === "adult"}
            onClick={() => {
              setKind("adult");
              setConfirmed(false);
            }}
          >
            <strong>An adult</strong>
            <span>My own book · 18 or older</span>
          </button>
          <button
            type="button"
            aria-pressed={kind === "child"}
            onClick={() => {
              setKind("child");
              setConfirmed(false);
            }}
          >
            <strong>A child or teen</strong>
            <span>Set up by a parent or guardian</span>
          </button>
        </div>
        {kind === "child" && (
          <>
            <label>
              Age range
              <select
                required
                value={band}
                onChange={(e) => setBand(e.target.value as Audience)}
              >
                <option value="">Choose an age range</option>
                {ageBands.map((b) => (
                  <option key={b} value={b}>
                    {ageLabels[b]}
                  </option>
                ))}
              </select>
            </label>
            <div className="lb-boundary">
              <strong>A private book, with guidance for their age.</strong>
              <p>
                Prompts, small practices and session length follow this range.
                Under 6, read and choose together. Children and teens can always
                pause or pass.
              </p>
              <p>
                {accountUid
                  ? "This profile belongs to your parent account. Its entries and photos save automatically online and can be opened from that account on any device."
                  : "Children have no independent online account. This local edition can stay on the device or be added to a parent’s account."}{" "}
                Assisted voice writing has its own parent permission; saving
                online never authorizes AI analysis or online passage sharing.
              </p>
            </div>
          </>
        )}
        {(newLock || protectedEdition || !!accountUid) && (
          <>
            <label>
              {protectedEdition
                ? parentCredentialLabel(
                    book.profile!.kind === "child"
                      ? book.profile!.parentLock
                      : { accountUid: accountUid! },
                  )
                : accountUid
                  ? "Parent account password"
                  : "Choose a parent passphrase"}
              <input
                type="password"
                required
                minLength={newLock ? 12 : 1}
                maxLength={256}
                autoComplete={newLock ? "new-password" : "current-password"}
                value={parentPass}
                onChange={(e) => setParentPass(e.target.value)}
              />
            </label>
            {newLock && (
              <label>
                Repeat parent passphrase
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={256}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
            )}
            <p className="lb-fine">
              {accountUid ||
              (book.profile?.kind === "child" &&
                "accountUid" in book.profile.parentLock)
                ? "Your parent account password protects these changes. Children do not need their own account password."
                : "A separate parent passphrase protects this local edition’s age changes. Keep it privately; Relish cannot recover it."}
            </p>
          </>
        )}
        <p className="lb-fine">
          The age range and parent settings stay inside the encrypted book and
          its backups. These settings shape future guidance; existing writing
          and saved games are kept as they are.
        </p>
        {kind && (
          <label className="lb-consent-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            {kind === "child"
              ? "I’m the parent or guardian choosing this range and have reviewed any existing content for this child."
              : protectedEdition
                ? "As the parent or guardian, I confirm this edition’s reader is now 18 or older."
                : "This is my own edition and I’m 18 or older."}
          </label>
        )}
      </fieldset>
      {error && (
        <p className="lb-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="lb-primary"
        disabled={busy || !kind || !confirmed || (kind === "child" && !band)}
      >
        {busy
          ? "Keeping these settings…"
          : book.profile
            ? "Save edition settings"
            : "Open this edition"}
        <ArrowRight size={16} />
      </button>
      <button
        type="button"
        className="lb-text"
        disabled={busy}
        onClick={onCancel}
      >
        {book.profile ? "Cancel" : "Back to the bookshelf"}
      </button>
    </form>
  );
}
