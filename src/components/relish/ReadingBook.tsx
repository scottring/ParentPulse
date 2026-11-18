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
import { flipPages, reducedMotion, type FlipGeometry } from "./page-flip";

/**
 * Moving to another entry remounts the book, so the page being left is handed
 * over here and the new book turns the leaf when it opens.
 */
let carry: {
  content: HTMLElement;
  spread: number;
  pages: number;
  dir: 1 | -1;
  at: number;
} | null = null;

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
  children?: ReactNode;
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
  const sheet = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const flipping = useRef(false);
  const turns = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
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

  /** The sheet and its columns as they are right now, read from the page. */
  const geometry = useCallback((): (FlipGeometry & { pages: number }) | null => {
    const sh = sheet.current,
      v = viewport.current,
      f = flow.current;
    if (!sh || !v || !f) return null;
    const ss = getComputedStyle(sh),
      fs = getComputedStyle(f);
    const gap = parseFloat(fs.columnGap) || 0;
    const perSpread = parseInt(fs.columnCount, 10) || 1;
    const column = (v.clientWidth - gap * (perSpread - 1)) / perSpread;
    return {
      width: sh.clientWidth,
      height: sh.clientHeight,
      padX: parseFloat(ss.paddingLeft) || 0,
      padTop: parseFloat(ss.paddingTop) || 0,
      viewWidth: v.clientWidth,
      viewHeight: v.clientHeight,
      pitch: v.clientWidth + gap,
      perSpread,
      pages:
        column > 0 ? Math.max(1, Math.round((f.scrollWidth + gap) / (column + gap))) : 1,
    };
  }, []);

  /** Turns to another pair of pages in this entry, with the leaf turning over. */
  /** A new tap during a turn lands the leaf at once, then carries on. */
  function settle() {
    layer.current?.replaceChildren();
    flipping.current = false;
  }
  function go(to: number) {
    settle();
    if (to === current || to < 0 || to > spreads - 1) return;
    const f = flow.current,
      l = layer.current,
      g = geometry();
    if (f && l && g && !reducedMotion()) {
      const copy = f.cloneNode(true) as HTMLElement;
      flipping.current = true;
      const mine = ++turns.current;
      void flipPages(
        l,
        g,
        to > current ? 1 : -1,
        { content: copy, spread: current },
        { content: copy, spread: to },
        { before: g.pages, after: g.pages },
      ).finally(() => {
        if (turns.current === mine) flipping.current = false;
      });
    }
    setSpread(to);
  }
  const back = () => canBack && go(current - 1);
  const turn = () => canTurn && go(current + 1);
  /** Leaves for another entry, handing this page over so the new one turns in. */
  function leave(dir: 1 | -1, open: () => void) {
    settle();
    const f = flow.current;
    if (f && !reducedMotion())
      carry = {
        content: f.cloneNode(true) as HTMLElement,
        spread: current,
        pages: layout.pages,
        dir,
        at: Date.now(),
      };
    open();
  }
  const previousEntry = onPreviousEntry && (() => leave(-1, onPreviousEntry));
  const nextEntry = onNextEntry && (() => leave(1, onNextEntry));

  // Arriving from another entry: turn the leaf from that entry's page to this one.
  useLayoutEffect(() => {
    const from = carry;
    carry = null;
    if (!from || Date.now() - from.at > 1500) return;
    const f = flow.current,
      l = layer.current,
      g = geometry();
    if (!f || !l || !g) return;
    flipping.current = true;
    const mine = ++turns.current;
    void flipPages(
      l,
      g,
      from.dir,
      { content: from.content, spread: from.spread },
      { content: f.cloneNode(true) as HTMLElement, spread: 0 },
      { before: from.pages, after: g.pages },
    ).finally(() => {
      if (turns.current === mine) flipping.current = false;
    });
  }, [geometry]);

  // Arrow keys turn the page, then move between entries.
  const keys = useRef({ back, turn, previousEntry, nextEntry, canBack, canTurn });
  useLayoutEffect(() => {
    keys.current = { back, turn, previousEntry, nextEntry, canBack, canTurn };
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
        else k.nextEntry?.();
      } else if (e.key === "ArrowLeft") {
        if (k.canBack) k.back();
        else k.previousEntry?.();
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
        <div
          className="rd-sheet"
          ref={sheet}
          // A swipe on a touch screen turns the page, like a real one.
          onPointerDown={(e) => {
            swipe.current =
              e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start) return;
            const dx = e.clientX - start.x,
              dy = e.clientY - start.y;
            if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
            if (dx < 0) {
              if (canTurn) turn();
              else nextEntry?.();
            } else if (canBack) back();
            else previousEntry?.();
          }}
          onPointerCancel={() => {
            swipe.current = null;
          }}
        >
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
          <div className="rd-flip-layer" ref={layer} />
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
          onClick={previousEntry}
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
          <button type="button" className="lb-text" onClick={nextEntry}>
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
