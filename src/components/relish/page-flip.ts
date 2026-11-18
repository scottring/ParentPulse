/**
 * The page turn for the reading book. The book lays the words out in CSS
 * columns, so a turn is drawn with copies of those columns: a leaf hinged at
 * the spine carries the page being turned on its front and the next page on
 * its back, while the page staying put is held still beside it. The real book
 * underneath has already moved to the new pages; the leaf lands on top of them
 * and is removed. Copies are hidden from assistive tech and can't be clicked.
 */

export type FlipGeometry = {
  /** Sheet size and its inner padding, in px. */
  width: number;
  height: number;
  padX: number;
  padTop: number;
  /** The text area (the viewport) and the distance between spreads. */
  viewWidth: number;
  viewHeight: number;
  pitch: number;
  perSpread: number;
};

export type FlipSide = { content: HTMLElement; spread: number };

const DURATION = 760;
const EASE = "cubic-bezier(0.42, 0.08, 0.24, 1)";

export function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** One page of a spread, drawn from a copy of the columns. */
function pageFace(
  g: FlipGeometry,
  side: "left" | "right" | "full",
  from: FlipSide | null,
  folio: number | null,
) {
  const page = document.createElement("div");
  page.className = `rd-face rd-face-${side}`;
  if (from) {
    const box = document.createElement("div");
    box.className = "rd-face-box";
    const half = g.width / 2;
    Object.assign(box.style, {
      top: `${g.padTop}px`,
      left: `${side === "right" ? g.padX - half : g.padX}px`,
      width: `${g.viewWidth}px`,
      height: `${g.viewHeight}px`,
    });
    const copy = from.content.cloneNode(true) as HTMLElement;
    copy.removeAttribute("id");
    copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    copy.style.transition = "none";
    copy.style.transform = `translateX(${-from.spread * g.pitch}px)`;
    box.appendChild(copy);
    page.appendChild(box);
  }
  if (folio) {
    const n = document.createElement("span");
    n.className = "rd-face-folio";
    n.textContent = String(folio);
    page.appendChild(n);
  }
  const shade = document.createElement("div");
  shade.className = "rd-face-shade";
  page.appendChild(shade);
  return { page, shade };
}

/**
 * Turns one leaf over `layer` (an element covering the sheet). `dir` 1 turns
 * forward (right page over to the left), -1 turns back. `before` is what was
 * showing; `after` is where the book has gone. Resolves when the leaf lands.
 */
export function flipPages(
  layer: HTMLElement,
  g: FlipGeometry,
  dir: 1 | -1,
  before: FlipSide,
  after: FlipSide,
  pages: { before: number; after: number },
): Promise<void> {
  // Without the Web Animations API the book just moves; nothing is left half-drawn.
  if (typeof layer.animate !== "function") return Promise.resolve();
  try {
    return turnLeaf(layer, g, dir, before, after, pages);
  } catch {
    layer.replaceChildren();
    return Promise.resolve();
  }
}

function turnLeaf(
  layer: HTMLElement,
  g: FlipGeometry,
  dir: 1 | -1,
  before: FlipSide,
  after: FlipSide,
  pages: { before: number; after: number },
): Promise<void> {
  layer.replaceChildren();
  // A newer turn may start before this one lands; only the newest clears up.
  const turn = String((Number(layer.dataset.turn) || 0) + 1);
  layer.dataset.turn = turn;
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("inert", "");
  const two = g.perSpread === 2;
  const folio = (spread: number, right: boolean, total: number) => {
    const n = spread * g.perSpread + 1 + (right ? 1 : 0);
    return n <= total ? n : null;
  };
  const animations: Animation[] = [];
  const opts: KeyframeAnimationOptions = { duration: DURATION, easing: EASE, fill: "both" };

  if (two) {
    // The page that stays put while the leaf turns over it.
    const still =
      dir === 1
        ? pageFace(g, "left", before, folio(before.spread, false, pages.before))
        : pageFace(g, "right", before, folio(before.spread, true, pages.before));
    still.page.classList.add("rd-face-still");
    layer.appendChild(still.page);
    // As the leaf comes down on it, the page under it darkens slightly.
    animations.push(
      still.shade.animate(
        [{ opacity: 0 }, { opacity: 0 , offset: 0.55 }, { opacity: 0.22, offset: 0.85 }, { opacity: 0 }],
        opts,
      ),
    );
  }

  const leaf = document.createElement("div");
  const hinge = two ? (dir === 1 ? "right" : "left") : "full";
  leaf.className = `rd-leaf rd-leaf-${hinge} ${dir === 1 ? "is-forward" : "is-back"}`;
  const front =
    hinge === "full"
      ? pageFace(g, "full", before, folio(before.spread, false, pages.before))
      : pageFace(g, hinge, before, folio(before.spread, hinge === "right", pages.before));
  const backSide = hinge === "right" ? "left" : hinge === "left" ? "right" : "full";
  const back =
    hinge === "full"
      ? pageFace(g, "full", null, null)
      : pageFace(g, backSide, after, folio(after.spread, backSide === "right", pages.after));
  front.page.classList.add("rd-leaf-front");
  back.page.classList.add("rd-leaf-back");
  leaf.append(front.page, back.page);
  layer.appendChild(leaf);

  const angle = dir === 1 ? -180 : 180;
  animations.push(
    leaf.animate(
      [
        { transform: "rotateY(0deg)" },
        { transform: `rotateY(${angle * 0.5}deg) translateZ(1px)` },
        { transform: `rotateY(${angle}deg)` },
      ],
      opts,
    ),
    // The front darkens as it lifts toward the reader; the back brightens as it lands.
    front.shade.animate([{ opacity: 0 }, { opacity: 0.32, offset: 0.5 }, { opacity: 0.32 }], opts),
    back.shade.animate([{ opacity: 0.32 }, { opacity: 0.32, offset: 0.5 }, { opacity: 0 }], opts),
  );
  // Never leave the book waiting on an animation that doesn't report back.
  const late = new Promise<void>((done) => setTimeout(done, DURATION + 400));
  return Promise.race([Promise.all(animations.map((a) => a.finished)), late])
    .catch(() => undefined)
    .then(() => {
      if (layer.dataset.turn === turn) layer.replaceChildren();
    });
}
