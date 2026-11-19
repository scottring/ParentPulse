"use client";
import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

/**
 * A delete or discard that asks once, in place: "Delete this page? …" with
 * "Yes, delete" and "Keep it". Nothing is removed until the yes.
 */
export default function ConfirmDelete({
  label,
  question,
  detail = "This can’t be undone.",
  yes = "Yes, delete",
  no = "Keep it",
  busy = false,
  icon = true,
  className = "",
  ariaLabel,
  onConfirm,
}: {
  label: ReactNode;
  question: string;
  detail?: string;
  yes?: string;
  no?: string;
  busy?: boolean;
  icon?: boolean;
  className?: string;
  ariaLabel?: string;
  onConfirm: () => void | Promise<unknown>;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button
        type="button"
        className={`lb-text lb-delete ${className}`}
        disabled={busy}
        aria-label={ariaLabel}
        onClick={() => setAsking(true)}
      >
        {icon && <Trash2 size={15} aria-hidden="true" />} {label}
      </button>
    );
  return (
    <span className={`rt-confirm lb-delete-confirm ${className}`} role="group" aria-label={question}>
      <span>
        <b>{question}</b> {detail}
      </span>
      <button
        type="button"
        className="lb-text lb-delete-yes"
        disabled={busy}
        onClick={() => {
          void Promise.resolve(onConfirm()).finally(() => setAsking(false));
        }}
      >
        {yes}
      </button>
      <button type="button" className="lb-text" onClick={() => setAsking(false)}>
        {no}
      </button>
    </span>
  );
}
