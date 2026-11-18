"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";

type Layout = { pages: number; perSpread: number; pitch: number };
const same = (a: Layout, b: Layout) =>
  a.pages === b.pages && a.perSpread === b.perSpread && a.pitch === b.pitch;

/**
 * A kept page read as an open book (Scott's mockup, 2026-11-18): the words
 * flow down the left page and on to the right, with page numbers. A long
 * entry turns to the next two pages; a phone shows one page at a time.
 *
 * The text is laid out in CSS columns of a fixed height; each column is one
 * page, and turning the page slides the next pair into view.
 */
export default function ReadingBook({
  children,
  flowRef,
  className = "",
  entryLabel,
  onPreviousEntry,
  onNextEntry,
  onNewEntry,
}: {
  children: ReactNode;
  /** Receives the element holding the words (for "Choose a passage"). */
  flowRef?: RefObject<HTMLElement | null>;
  /** Classes for the book itself, e.g. the page style and its arrival animation. */
  className?: string;
  /** e.g. "Entry 5 of 5" */
  entryLabel: string;
  onPreviousEntry?: () => void;
  onNextEntry?: () => void;
  onNewEntry: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Layout>({ pages: 1, perSpread: 2, pitch: 0 });
  const [spread, setSpread] = useState(0);

  const measure = useCallback(() => {
    const v = viewport.current,
      f = flow.current;
    if (!v || !f) return;
    const style = getComputedStyle(f);
    const gap = parseFloat(style.columnGap) || 0;
    const perSpread = parseInt(style.columnCount, 10) || 1;
    const width = v.clientWidth;
    const column = (width - gap * (perSpread - 1)) / perSpread;
    const next = {
      pages:
        column > 0
          ? Math.max(1, Math.round((f.scrollWidth + gap) / (column + gap)))
          : 1,
      perSpread,
      pitch: width + gap,
    };
    setLayout((prev) => (same(prev, next) ? prev : next));
  }, []);

  // Measure after every render (the words or photos may have changed), and
  // again when the window or the book resizes or a photo finishes loading.
  useLayoutEffect(measure);
  useEffect(() => {
    const v = viewport.current,
      f = flow.current;
    if (!v || !f) return;
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(v);
    window.addEventListener("resize", measure);
    f.addEventListener("load", measure, true);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      f.removeEventListener("load", measure, true);
    };
  }, [measure]);

  const spreads = Math.max(1, Math.ceil(layout.pages / layout.perSpread));
  const current = Math.min(spread, spreads - 1);
  const first = current * layout.perSpread + 1;
  const canBack = current > 0;
  const canTurn = current < spreads - 1;
  const back = () => canBack && setSpread(current - 1);
  const turn = () => canTurn && setSpread(current + 1);

  // Arrow keys turn the page, then move between entries.
  const keys = useRef({ back, turn, onPreviousEntry, onNextEntry, canBack, canTurn });
  useLayoutEffect(() => {
    keys.current = { back, turn, onPreviousEntry, onNextEntry, canBack, canTurn };
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        e.altKey || e.ctrlKey || e.metaKey ||
        (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))
      )
        return;
      const k = keys.current;
      if (e.key === "ArrowRight") {
        if (k.canTurn) k.turn();
        else k.onNextEntry?.();
      } else if (e.key === "ArrowLeft") {
        if (k.canBack) k.back();
        else k.onPreviousEntry?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pageWord = layout.perSpread === 2 && first < layout.pages ? "Pages" : "Page";
  const pageRange =
    layout.perSpread === 2 && first < layout.pages
      ? `${first}–${first + 1}`
      : `${first}`;

  return (
    <>
      <div className={`rd-book ${className}`} data-per-spread={layout.perSpread}>
        <div className="rd-sheet">
          <div
            className="rd-viewport"
            ref={viewport}
            // Focus moving into a later page must not scroll the book by itself.
            onScroll={(e) => {
              e.currentTarget.scrollLeft = 0;
            }}
          >
            <div
              className="rd-flow"
              ref={(el) => {
                flow.current = el;
                if (flowRef) flowRef.current = el;
              }}
              style={{ transform: `translateX(${-current * layout.pitch}px)` }}
            >
              {children}
            </div>
          </div>
          <div className="rd-folios" aria-hidden="true">
            <span>{first}</span>
            {layout.perSpread === 2 && (
              <span>{first + 1 <= layout.pages ? first + 1 : ""}</span>
            )}
          </div>
          {canBack && (
            <button type="button" className="rd-turn rd-turn-back" onClick={back}>
              <ArrowLeft size={16} /> Back a page
            </button>
          )}
          {canTurn && (
            <button type="button" className="rd-turn rd-turn-next" onClick={turn}>
              Turn the page <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
      <nav className="rd-entry-nav" aria-label="Entries in order">
        <button
          type="button"
          className="lb-text"
          disabled={!onPreviousEntry}
          onClick={onPreviousEntry}
        >
          <ArrowLeft size={17} /> Previous entry
        </button>
        <span>
          {entryLabel}
          {spreads > 1 && (
            <span className="rd-page-count">
              {" "}
              · {pageWord} {pageRange} of {layout.pages}
            </span>
          )}
        </span>
        {onNextEntry ? (
          <button type="button" className="lb-text" onClick={onNextEntry}>
            Next entry <ArrowRight size={17} />
          </button>
        ) : (
          <button type="button" className="lb-text" onClick={onNewEntry}>
            New entry <Plus size={17} />
          </button>
        )}
      </nav>
    </>
  );
}
