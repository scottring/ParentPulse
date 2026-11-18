"use client";
/**
 * The shared pieces every Relish screen is built from. Styles live in
 * ui.css; nothing here holds state beyond what a control needs.
 */
import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";
import { ArrowLeft, Lock } from "lucide-react";

const cx = (...names: (string | false | undefined | null)[]) =>
  names.filter(Boolean).join(" ");

/** A sheet of cream paper with a soft shadow; optionally torn or tilted. */
export function PaperCard({
  as: Tag = "section",
  torn = false,
  tilt,
  white = false,
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  torn?: boolean;
  tilt?: "left" | "right";
  white?: boolean;
  className?: string;
  children: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <Tag
      className={cx(
        "ui-card",
        torn && "ui-torn",
        white && "ui-card-white",
        tilt && `ui-tilt-${tilt}`,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** "← Back to …", always top-left on a sub-screen. */
export function BackLink({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx("ui-back", className)}
      disabled={disabled}
      onClick={onClick}
    >
      <ArrowLeft size={18} aria-hidden="true" /> {label}
    </button>
  );
}

/** The quiet lock note, always top-right on a sub-screen. */
export function PrivateNote({
  children = "Your private pages",
  icon,
  className,
}: {
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("ui-private", className)}>
      {icon ?? <Lock size={15} aria-hidden="true" />} {children}
    </span>
  );
}

/** The top row of a sub-screen: back on the left, privacy on the right. */
export function SubHead({
  back,
  note,
  noteIcon,
  className,
}: {
  back?: { label: string; onClick: () => void; disabled?: boolean };
  note?: ReactNode;
  noteIcon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ui-subhead", className)}>
      {back ? <BackLink {...back} /> : <span />}
      {note !== undefined && note !== null && (
        <PrivateNote icon={noteIcon}>{note}</PrivateNote>
      )}
    </div>
  );
}

/** The one main action on a screen: olive, rounded rectangle. */
export function PrimaryButton({
  className,
  quiet = false,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { quiet?: boolean }) {
  return (
    <button
      type={type}
      className={cx(quiet ? "ui-btn-quiet" : "ui-btn", className)}
      {...rest}
    />
  );
}

export type ChipOption<T extends string> = {
  id: T;
  label: ReactNode;
  disabled?: boolean;
};
/** Choices as pills. Single choice by default; pass `multiple` for toggles. */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: ChipOption<T>[];
  value: T | T[];
  onChange: (id: T) => void;
  className?: string;
}) {
  const chosen = (id: T) =>
    Array.isArray(value) ? value.includes(id) : value === id;
  return (
    <div className={cx("ui-chips", className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="ui-chip"
          aria-pressed={chosen(o.id)}
          disabled={o.disabled}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** An open book: a left page and a right page; stacks on narrow screens. */
export function BookSpread({
  left,
  right,
  className,
  as: Tag = "div",
  ...rest
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
  as?: ElementType;
  [key: string]: unknown;
}) {
  return (
    <Tag className={cx("ui-spread", className)} {...rest}>
      <div className="ui-spread-page">{left}</div>
      <div className="ui-spread-page">{right}</div>
    </Tag>
  );
}
