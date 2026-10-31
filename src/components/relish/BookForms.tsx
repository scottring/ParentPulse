"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Leaf,
  Lock,
  Upload,
  LoaderCircle,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import type { Person } from "@/lib/relish/model";
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      className={`r-dialog ${wide ? "r-wide" : ""}`}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <button
        className="r-icon r-close"
        onClick={onClose}
        aria-label="Close dialog"
      >
        <X size={20} />
      </button>
      {children}
    </dialog>
  );
}
function Mark({ size = 26 }: { size?: number }) {
  return (
    <span className="r-mark">
      <Leaf size={size} strokeWidth={1.1} />
    </span>
  );
}
export function VaultForm({
  locked,
  busy,
  error,
  onSubmit,
  onCancel,
  cancelLabel = "Keep exploring the sample book",
}: {
  locked: boolean;
  busy: boolean;
  error: string;
  onSubmit: (pass: string, name?: string, raw?: string) => Promise<void>;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [name, setName] = useState(""),
    [pass, setPass] = useState(""),
    [confirm, setConfirm] = useState(""),
    [raw, setRaw] = useState(""),
    [fileError, setFileError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const restoring = !!raw;
  return (
    <form
      className="r-vault-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(pass, name, raw || undefined);
      }}
    >
      <Mark size={38} />
      <p className="r-eyebrow">YOUR WORDS. YOUR WORLD.</p>
      <h1>
        {locked
          ? "Welcome back."
          : restoring
            ? "Bring your book home."
            : "A little space, just for you."}
      </h1>
      <p>
        {locked
          ? "Unlock your book to pick up where you left off."
          : "Your relationships belong to you. Your book is encrypted and kept in this browser, on this computer."}
      </p>
      {!locked && !restoring && (
        <label>
          What should we call you?
          <input
            required
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Your first name"
          />
        </label>
      )}
      <label>
        Your passphrase
        <input
          required
          autoComplete={
            locked || restoring ? "current-password" : "new-password"
          }
          type="password"
          minLength={locked || restoring ? 1 : 12}
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder={
            locked ? "Unlock your private book" : "At least 12 characters"
          }
        />
      </label>
      {!locked && !restoring && (
        <label>
          Once more, to be sure
          <input
            required
            autoComplete="new-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your passphrase"
          />
        </label>
      )}
      <p className="r-small">
        {locked
          ? "Your passphrase stays on this computer."
          : "Keep your passphrase somewhere safe. Relish cannot recover it. Export encrypted backups regularly; clearing browser data removes your local book."}
      </p>
      {(error || fileError) && (
        <p role="alert" className="r-error">
          {error || fileError}
        </p>
      )}
      <button
        className="r-primary"
        disabled={busy || (!locked && !restoring && pass !== confirm)}
      >
        {busy ? (
          <LoaderCircle className="r-spin" size={17} />
        ) : (
          <Lock size={15} />
        )}{" "}
        {busy
          ? "Opening your book…"
          : locked
            ? "Unlock my book"
            : restoring
              ? "Restore encrypted book"
              : "Create my private book"}
      </button>
      {!locked && (
        <>
          <input
            ref={input}
            hidden
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 120_000_000) {
                setFileError("Choose a Relish backup smaller than 120 MB.");
                return;
              }
              setRaw(await file.text());
              setFileError("");
            }}
          />
          <button
            className="r-text-button"
            type="button"
            onClick={() => input.current?.click()}
          >
            <Upload size={14} />{" "}
            {restoring
              ? "Choose a different backup"
              : "Restore an encrypted backup"}
          </button>
        </>
      )}
      {onCancel && (
        <button type="button" className="r-text-button" onClick={onCancel}>
          {cancelLabel}
        </button>
      )}
    </form>
  );
}
export function PersonForm({
  busy,
  onSave,
}: {
  busy: boolean;
  onSave: (p: Person) => Promise<void>;
}) {
  const [name, setName] = useState(""),
    [role, setRole] = useState("Partner"),
    [note, setNote] = useState(""),
    [err, setErr] = useState("");
  return (
    <form
      className="r-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave({
            id: crypto.randomUUID(),
            name: name.trim(),
            role,
            color: ["rose", "ochre", "sage"][Math.floor(Math.random() * 3)],
            note: note.trim(),
            lessons: [],
          });
        } catch {
          setErr("Could not save. Please try again.");
        }
      }}
    >
      <p className="r-eyebrow">A NEW CHAPTER</p>
      <h2>
        Who makes
        <br />
        <em>your life, yours?</em>
      </h2>
      <label>
        Their name
        <input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Someone you love"
        />
      </label>
      <label>
        Your relationship
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {[
            "Partner",
            "Child",
            "Parent",
            "Sibling",
            "Friend",
            "Colleague",
            "Someone important",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        A little about them <span>optional</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="What makes them, them?"
          rows={3}
        />
      </label>
      {err && (
        <p className="r-error" role="alert">
          {err}
        </p>
      )}
      <button className="r-primary" disabled={busy || !name.trim()}>
        Open their chapter <ArrowRight size={16} />
      </button>
    </form>
  );
}
export function EditPerson({
  person,
  busy,
  onSave,
}: {
  person: Person;
  busy: boolean;
  onSave: (p: Person) => Promise<void>;
}) {
  const [note, setNote] = useState(person.note),
    [lessons, setLessons] = useState(person.lessons.join("\n")),
    [err, setErr] = useState("");
  return (
    <form
      className="r-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave({
            ...person,
            note,
            lessons: lessons
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
          });
        } catch {
          setErr("Could not save. Please try again.");
        }
      }}
    >
      <p className="r-eyebrow">YOUR UNDERSTANDING CAN CHANGE</p>
      <h2>
        What you know
        <br />
        <em>about {person.name}.</em>
      </h2>
      <label>
        Their chapter introduction
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </label>
      <label>
        What you’re learning <span>One thought per line</span>
        <textarea
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          rows={7}
          maxLength={10000}
        />
      </label>
      {err && (
        <p role="alert" className="r-error">
          {err}
        </p>
      )}
      <button className="r-primary" disabled={busy}>
        Keep these thoughts <Check size={16} />
      </button>
    </form>
  );
}
