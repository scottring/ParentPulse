'use client';

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useWalkthrough } from './WalkthroughContext';
import type { StepPlacement } from './walkthrough-steps';

// ────────────────────────────────────────────────────────────
// WalkthroughOverlay
//
// Renders a semi-transparent warm overlay with a spotlight
// cutout around the active target element, plus a positioned
// tooltip card with step information and navigation controls.
// ────────────────────────────────────────────────────────────

// ─── Helpers ────────────────────────────────────────────────

/** Convert an integer to lowercase Roman numerals. */
function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['m', 'cm', 'd', 'cd', 'c', 'xc', 'l', 'xl', 'x', 'ix', 'v', 'iv', 'i'];
  let result = '';
  let remaining = n;
  for (let i = 0; i < vals.length; i++) {
    while (remaining >= vals[i]) {
      result += syms[i];
      remaining -= vals[i];
    }
  }
  return result;
}

/** Padding around the spotlight cutout. */
const SPOTLIGHT_PAD = 12;

/** Gap between spotlight edge and tooltip. */
const TOOLTIP_GAP = 16;

/** Maximum tooltip width. */
const TOOLTIP_MAX_W = 360;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ─── Colors (warm literary palette) ─────────────────────────

const OVERLAY_BG = 'rgba(58, 53, 48, 0.85)';
const CARD_BG = '#F7F5F0';
const CARD_BORDER = 'rgba(120, 100, 70, 0.18)';
const ACCENT = '#7C9082';
const TEXT_PRIMARY = '#3A3530';
const TEXT_SECONDARY = '#6B6254';
const BTN_SKIP_COLOR = '#9B8E7E';

// ─── Component ──────────────────────────────────────────────

export default function WalkthroughOverlay() {
  const {
    isActive,
    activeStep,
    currentStep,
    totalSteps,
    next,
    prev,
    skip,
  } = useWalkthrough();

  // Target element bounding rect (null = centered modal).
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  // Whether the tooltip is entering (for CSS transitions).
  const [entering, setEntering] = useState(false);
  // Portal mount target.
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(currentStep);

  // Mount portal root once.
  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  // ─── Measure target element ─────────────────────────────

  const measureTarget = useCallback(() => {
    if (!activeStep?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(activeStep.target);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
  }, [activeStep]);

  // Re-measure on step change, resize, and scroll.
  useEffect(() => {
    if (!isActive) return;

    measureTarget();

    // Trigger entrance animation on step change.
    if (prevStepRef.current !== currentStep) {
      setEntering(true);
      const timer = setTimeout(() => setEntering(false), 20);
      prevStepRef.current = currentStep;
      return () => clearTimeout(timer);
    }
  }, [isActive, currentStep, measureTarget]);

  useEffect(() => {
    if (!isActive) return;

    const handleResize = () => measureTarget();
    const handleScroll = () => measureTarget();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    // Use ResizeObserver on the target element if available.
    let resizeObs: ResizeObserver | undefined;
    if (activeStep?.target) {
      const el = document.querySelector(activeStep.target);
      if (el && typeof ResizeObserver !== 'undefined') {
        resizeObs = new ResizeObserver(handleResize);
        resizeObs.observe(el);
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      resizeObs?.disconnect();
    };
  }, [isActive, activeStep, measureTarget]);

  // ─── Keyboard navigation ────────────────────────────────

  useEffect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          skip();
          break;
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prev();
          break;
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isActive, next, prev, skip]);

  // ─── Lock body scroll while active ──────────────────────

  useEffect(() => {
    if (!isActive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isActive]);

  // ─── Don't render unless active ─────────────────────────

  if (!isActive || !activeStep || !portalRoot) return null;

  // ─── Compute spotlight & tooltip positions ──────────────

  const isCentered = !activeStep.target || !targetRect;

  // Spotlight rect with padding.
  const spot = targetRect
    ? {
        top: targetRect.top - SPOTLIGHT_PAD,
        left: targetRect.left - SPOTLIGHT_PAD,
        width: targetRect.width + SPOTLIGHT_PAD * 2,
        height: targetRect.height + SPOTLIGHT_PAD * 2,
      }
    : null;

  const tooltipStyle = computeTooltipPosition(
    spot,
    isCentered ? 'center' : activeStep.placement,
  );

  // ─── Overlay box-shadow spotlight ───────────────────────
  // We use an inset box-shadow on a full-screen div with a
  // transparent "hole" sized to the spotlight rect. The trick:
  // use a very large box-shadow spread to fill the screen.

  const overlayStyle: CSSProperties = spot
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        // The overlay element is positioned at the spotlight.
        // We'll use clip-path for the cutout instead.
      }
    : {
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: OVERLAY_BG,
      };

  // For the spotlight cutout we use a clip-path polygon that
  // carves out a rounded-rect-ish hole. Simpler approach:
  // use box-shadow on a positioned element.

  const spotlightOverlayStyle: CSSProperties = spot
    ? {
        position: 'fixed',
        top: spot.top,
        left: spot.left,
        width: spot.width,
        height: spot.height,
        borderRadius: 12,
        zIndex: 9998,
        boxShadow: `0 0 0 9999px ${OVERLAY_BG}`,
        pointerEvents: 'none',
        transition: 'top 0.35s ease, left 0.35s ease, width 0.35s ease, height 0.35s ease',
      }
    : {};

  const hasSpotlight = Boolean(spot);

  // ─── Render via portal ──────────────────────────────────

  const content = (
    <>
      {/* Click-catcher behind everything (dismiss on click). */}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9997,
          cursor: 'default',
        }}
        onClick={skip}
        aria-hidden="true"
      />

      {/* Overlay / spotlight */}
      {hasSpotlight ? (
        <div style={spotlightOverlayStyle} aria-hidden="true" />
      ) : (
        <div style={overlayStyle} aria-hidden="true" />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-label={activeStep.title}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          zIndex: 9999,
          maxWidth: TOOLTIP_MAX_W,
          width: isCentered ? 'min(360px, calc(100vw - 48px))' : undefined,
          background: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: 16,
          padding: '28px 28px 20px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          opacity: entering ? 0 : 1,
          transform: entering ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          ...tooltipStyle,
        }}
      >
        {/* Step title */}
        <h2
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 24,
            color: TEXT_PRIMARY,
            margin: '0 0 8px',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
          }}
        >
          {activeStep.title}
        </h2>

        {/* Description */}
        <p
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontWeight: 400,
            fontSize: 14,
            lineHeight: 1.6,
            color: TEXT_SECONDARY,
            margin: '0 0 20px',
          }}
        >
          {activeStep.description}
        </p>

        {/* Footer: progress + buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Step progress (Roman numerals) */}
          <span
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontStyle: 'italic',
              fontSize: 13,
              color: BTN_SKIP_COLOR,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              minWidth: 60,
            }}
          >
            {toRoman(currentStep + 1)} of {toRoman(totalSteps)}
          </span>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Skip */}
            <button
              type="button"
              onClick={skip}
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: 12,
                fontWeight: 500,
                color: BTN_SKIP_COLOR,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 10px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = TEXT_PRIMARY;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = BTN_SKIP_COLOR;
              }}
            >
              Skip
            </button>

            {/* Back */}
            {currentStep > 0 && (
              <button
                type="button"
                onClick={prev}
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: TEXT_SECONDARY,
                  background: 'transparent',
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  padding: '7px 16px',
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = 'rgba(0,0,0,0.04)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = 'transparent';
                }}
              >
                Back
              </button>
            )}

            {/* Next / Finish */}
            <button
              type="button"
              onClick={next}
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontStyle: 'italic',
                fontSize: 14,
                fontWeight: 500,
                color: '#F7F5F0',
                background: ACCENT,
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                padding: '7px 20px',
                transition: 'background 0.2s, transform 0.15s',
                boxShadow: '0 2px 8px rgba(124, 144, 130, 0.25)',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = '#6A7E70';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = ACCENT;
              }}
            >
              {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, portalRoot);
}

// ────────────────────────────────────────────────────────────
// Tooltip positioning logic
// ────────────────────────────────────────────────────────────

function computeTooltipPosition(
  spot: { top: number; left: number; width: number; height: number } | null,
  placement: StepPlacement,
): CSSProperties {
  // Centered modal (no target).
  if (!spot || placement === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

  // Preferred placement with viewport-aware fallback.
  let pos = placement;

  // Simple heuristic: if not enough room, flip.
  const spaceBottom = vh - (spot.top + spot.height);
  const spaceTop = spot.top;
  const spaceRight = vw - (spot.left + spot.width);
  const spaceLeft = spot.left;

  if (pos === 'bottom' && spaceBottom < 180) pos = 'top';
  if (pos === 'top' && spaceTop < 180) pos = 'bottom';
  if (pos === 'right' && spaceRight < TOOLTIP_MAX_W + TOOLTIP_GAP) pos = 'left';
  if (pos === 'left' && spaceLeft < TOOLTIP_MAX_W + TOOLTIP_GAP) pos = 'right';

  // If still no room horizontally, fall back to bottom/top.
  if (
    (pos === 'left' && spaceLeft < TOOLTIP_MAX_W + TOOLTIP_GAP) ||
    (pos === 'right' && spaceRight < TOOLTIP_MAX_W + TOOLTIP_GAP)
  ) {
    pos = spaceBottom >= spaceTop ? 'bottom' : 'top';
  }

  const centerX = spot.left + spot.width / 2;
  const centerY = spot.top + spot.height / 2;

  // Clamp horizontal so tooltip doesn't leave the viewport.
  const clampX = (x: number) => Math.max(16, Math.min(x, vw - TOOLTIP_MAX_W - 16));

  switch (pos) {
    case 'bottom':
      return {
        top: spot.top + spot.height + TOOLTIP_GAP,
        left: clampX(centerX - TOOLTIP_MAX_W / 2),
      };
    case 'top':
      return {
        bottom: vh - spot.top + TOOLTIP_GAP,
        left: clampX(centerX - TOOLTIP_MAX_W / 2),
      };
    case 'right':
      return {
        top: Math.max(16, Math.min(centerY - 80, vh - 250)),
        left: spot.left + spot.width + TOOLTIP_GAP,
      };
    case 'left':
      return {
        top: Math.max(16, Math.min(centerY - 80, vh - 250)),
        right: vw - spot.left + TOOLTIP_GAP,
      };
    default:
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
  }
}
