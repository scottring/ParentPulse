import type { CSSProperties, ReactNode } from "react";
import Illustration from "./Illustration";
import type { IllustrationName } from "./illustrations";
import { coverTitle, titleSize, type Cover } from "./covers";

/**
 * A clothbound cover with the name stamped in gold and the person's emblem.
 * Decorative: the button around it carries the accessible name.
 */
export function BookCover({ title, cover }: { title: string; cover: Cover }) {
  return (
    <span
      className="lb-cloth"
      data-cloth={cover.cloth}
      style={{ "--cloth": cover.color } as CSSProperties}
      aria-hidden="true"
    >
      <span className="lb-cloth-face">
        <span className="lb-cloth-title" data-size={titleSize(title) || undefined}>
          {title}
        </span>
        <Illustration
          name={`emblem-${cover.emblem}` as IllustrationName}
          size="54%"
          className="lb-cloth-emblem"
          eager
        />
      </span>
      <span className="lb-cloth-ribbon" />
    </span>
  );
}

/** Books standing on a shelf; each row rests on a thin ledge. */
export function BookShelf({
  label,
  children,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul className={`lb-bookshelf ${className}`} aria-label={label}>
      {children}
    </ul>
  );
}

/**
 * One book on the shelf: the whole cover is one button. `locked` books (an
 * older copy that needs its original passphrase) say so in their name and
 * in a quiet line under the shelf.
 */
export function ShelfBook({
  name,
  cover,
  onOpen,
  disabled,
  locked = false,
  note,
}: {
  name: string;
  cover: Cover;
  onOpen: () => void;
  disabled?: boolean;
  locked?: boolean;
  /** A quiet line under the shelf, e.g. "Your book". */
  note?: string;
}) {
  const title = coverTitle(name);
  const line = locked ? "Needs its original passphrase" : note;
  return (
    <li className="lb-bookshelf-slot">
      <button
        type="button"
        className="lb-bookshelf-book"
        disabled={disabled}
        aria-label={
          locked
            ? `Open ${title}, an earlier copy that needs its original passphrase`
            : `Open ${title}`
        }
        onClick={onOpen}
      >
        <BookCover title={title} cover={cover} />
      </button>
      <span className="lb-bookshelf-ledge" aria-hidden="true" />
      {line && (
        <span className="lb-bookshelf-note" aria-hidden="true">
          {line}
        </span>
      )}
    </li>
  );
}

/** A loading shelf: plain boards, same size as real covers. */
export function GhostShelf({ count = 2 }: { count?: number }) {
  return (
    <div className="lb-bookshelf lb-bookshelf-ghost" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="lb-bookshelf-slot">
          <span className="lb-cloth" />
          <span className="lb-bookshelf-ledge" />
        </span>
      ))}
    </div>
  );
}
