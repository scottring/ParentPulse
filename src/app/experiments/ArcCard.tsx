"use client";
import Link from "next/link";
import type { GrowthArc, ArcPhase } from "@/types/growth-arc";
import type { GrowthItem } from "@/types/growth";
const PHASE_LABEL: Record<ArcPhase, string> = {
  awareness: "Awareness",
  practice: "Practice",
  integration: "Integration",
};

export function ArcCard({
  arc,
  progress,
  activeItems,
}: {
  arc: GrowthArc;
  progress: number;
  activeItems: GrowthItem[];
}) {
  const next = activeItems[0];
  const phaseLabel = PHASE_LABEL[arc.currentPhase] || "";
  const phaseDef = arc.phases?.find((p) => p.phase === arc.currentPhase);
  // The card always links to the arc overview at /experiments/arc/[arcId].
  // The overview is the reading surface — hypothesis, phase, progress, item
  // list. From there the user drills into a specific item workspace to
  // actually do/record the practice.
  const Wrapper: React.ElementType = Link;
  const wrapperProps = {
    href: `/experiments/arc/${arc.arcId}`,
    style: { display: "block", color: "inherit", textDecoration: "none" },
    "aria-label": `Open the ${arc.title} experiment`,
  };
  return (
    <li className="arc-card">
      <Wrapper {...wrapperProps}>
        <div className="arc-card-head">
          <div className="arc-card-head-left">
            {arc.emoji && (
              <span className="arc-emoji" aria-hidden>
                {arc.emoji}
              </span>
            )}
            <div>
              <h3 className="arc-title">{arc.title}</h3>
              {arc.subtitle && <p className="arc-subtitle">{arc.subtitle}</p>}
            </div>
          </div>
          <span className="arc-phase-chip">
            {phaseLabel}
            {typeof arc.currentWeek === "number" && arc.durationWeeks
              ? ` · week ${arc.currentWeek} of ${arc.durationWeeks}`
              : ""}
          </span>
        </div>

        <div className="arc-progress" aria-hidden="true">
          <div
            className="arc-progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <p className="arc-progress-text">
          {progress}% — {arc.completedItemCount || 0} of{" "}
          {arc.totalItemCount || 0} moments completed
        </p>

        {phaseDef?.description && (
          <p className="arc-phase-desc">
            <em>{phaseDef.description}</em>
          </p>
        )}

        {next && (
          <div className="arc-next">
            <span className="arc-next-eyebrow">Next</span>
            <span className="arc-next-link">
              {next.title || "Continue the experiment"}{" "}
              <span aria-hidden>⟶</span>
            </span>
          </div>
        )}

        {arc.outcomeStatement && (
          <p className="arc-outcome">
            When this experiment graduates: <em>{arc.outcomeStatement}</em>
          </p>
        )}
      </Wrapper>
    </li>
  );
}
