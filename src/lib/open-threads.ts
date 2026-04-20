/**
 * Open-thread contract (P0.2 of the flows audit).
 *
 * An entry, moment, or ritual is an "open thread" iff it has a
 * concrete closing action the user can take. The Workbook cover
 * only renders what this module returns; entries without an open
 * thread reason do NOT appear on the cover.
 *
 * Four reasons, each paired with a closing action:
 *
 *   1. `pending_invite`         — a moment's view-invite is waiting
 *                                 for a recipient to attach a view.
 *                                 Close: wait (or remind).
 *   2. `unclosed_divergence`    — a moment has a cached
 *                                 synthesis.divergenceLine but no
 *                                 reflection entry has been written
 *                                 yet (no journal_entries with
 *                                 reflectsOnEntryIds containing any
 *                                 of this moment's views, and no
 *                                 ritual.lastRunMomentId pointing at
 *                                 this moment).
 *                                 Close: respond in the moment OR
 *                                 bring it to the next ritual.
 *   3. `incomplete_practice`    — a growth_item has
 *                                 spawnedFromEntryIds set but no
 *                                 completion record. Reflection was
 *                                 never written.
 *                                 Close: open the practice + write
 *                                 "what changed."
 *   4. `overdue_ritual`         — ritual.status === 'active' AND
 *                                 ritual.nextRunAt <= now.
 *                                 Close: open the runner.
 *
 * Data model caveats (as of P0):
 *   - `pending_invite` requires moment_invites (P6). Stubbed: returns
 *     [] until P6 ships.
 *   - `unclosed_divergence` requires reflectsOnEntryIds on
 *     journal_entries (P4). We detect divergence today but cannot
 *     tell if it's been "carried forward" yet, so every moment with
 *     a divergence line currently counts. Will tighten in P4.
 *   - `incomplete_practice` reads growth_items directly; the
 *     completion side (ExerciseCompletion) is P3.
 *   - `overdue_ritual` is fully supported today.
 *
 * Each reason resolves to the SAME shape: { id, kind, reason,
 * subtitle, closingAction }. The Cover renders closingAction.label;
 * the detail page at closingAction.href MUST render the matching
 * affordance above the fold (P0.3).
 */

import type { Moment } from '@/types/moment';
import type { Ritual } from '@/types/ritual';
import type { JournalEntry } from '@/types/journal';
import type { MomentInvite } from '@/types/moment-invite';

export type OpenThreadReason =
  | 'pending_invite'
  | 'unclosed_divergence'
  | 'incomplete_practice'
  | 'overdue_ritual';

export type OpenThreadKind = 'moment' | 'entry' | 'ritual' | 'practice';

export interface ClosingAction {
  // Short imperative the Cover renders on the row.
  label: string;
  // Deep link to the detail surface that renders the matching
  // closing affordance above the body. Contract: the page at this
  // href MUST read its own open-thread state and render the CTA
  // above the fold (enforced by P0.3).
  href: string;
}

export interface OpenThread {
  // Stable id: entryId, momentId, ritualId, or growthItemId. Used
  // as React key and to dedupe if the same underlying object is
  // flagged by more than one reason (we prefer the strongest).
  id: string;
  kind: OpenThreadKind;
  reason: OpenThreadReason;
  // Short human-readable explanation of why this is open.
  subtitle: string;
  // Optional excerpt for rendering context on the cover.
  excerpt?: string;
  // When the thread was opened (for sorting — newest open first).
  openedAt?: Date;
  closingAction: ClosingAction;
}

// Precedence when the same underlying object matches more than one
// reason. Ordered by urgency of the ask, so the most actionable
// reason wins.
const REASON_PRECEDENCE: Record<OpenThreadReason, number> = {
  overdue_ritual: 0,
  pending_invite: 1,
  incomplete_practice: 2,
  unclosed_divergence: 3,
};

interface Sources {
  moments: Moment[];
  rituals: Ritual[];
  // Entries the user can see — used to link moments to their views
  // and to spot overdue practices.
  entries: JournalEntry[];
  // Pending moment_invites where the current user is the recipient.
  // Omit for unauthenticated contexts; empty array is fine.
  pendingInvitesForMe?: MomentInvite[];
  // now() is injectable for determinism in tests.
  now?: Date;
}

export function listOpenThreads(sources: Sources): OpenThread[] {
  const now = sources.now ?? new Date();
  const open: OpenThread[] = [];

  // Reason 4: overdue_ritual
  for (const r of sources.rituals) {
    if (r.status !== 'active') continue;
    const nextRun = r.nextRunAt?.toDate?.();
    if (!nextRun) continue;
    if (nextRun.getTime() > now.getTime()) continue;
    open.push({
      id: r.ritualId,
      kind: 'ritual',
      reason: 'overdue_ritual',
      subtitle: ritualSubtitle(r, now),
      openedAt: nextRun,
      closingAction: {
        label: 'Open the ritual',
        href: `/rituals/${r.ritualId}/run`,
      },
    });
  }

  // Reason 2: unclosed_divergence
  // A moment has synthesis.divergenceLine set, and no ritual has yet
  // pointed at it via lastRunMomentId. The Cloud Function P1 writes
  // synthesis; rituals P2 write lastRunMomentId. P4 will add a
  // tighter check via reflectsOnEntryIds.
  const ritualClosedMomentIds = new Set<string>(
    sources.rituals
      .map((r) => r.lastRunMomentId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
  for (const m of sources.moments) {
    const divergence = m.synthesis?.divergenceLine;
    if (!divergence) continue;
    if (ritualClosedMomentIds.has(m.momentId)) continue;
    open.push({
      id: m.momentId,
      kind: 'moment',
      reason: 'unclosed_divergence',
      subtitle: divergence,
      openedAt: m.synthesisUpdatedAt?.toDate?.() ?? m.lastViewAddedAt?.toDate?.(),
      closingAction: {
        label: 'Respond to the divergence',
        href: `/moments/${m.momentId}`,
      },
    });
  }

  // Reason 1: pending_invite — a moment_invite where the current
  // user is the recipient and the status is still pending. Shipped
  // in P6.1–P6.3.
  for (const inv of sources.pendingInvitesForMe ?? []) {
    if (inv.status !== 'pending') continue;
    open.push({
      id: inv.momentId,
      kind: 'moment',
      reason: 'pending_invite',
      subtitle:
        inv.prompt ??
        'Someone asked what you saw on this moment. Your view is waiting.',
      openedAt: inv.createdAt?.toDate?.(),
      closingAction: {
        label: inv.mode === 'blind' ? 'Answer blind' : 'Answer with context',
        href: `/moments/${inv.momentId}`,
      },
    });
  }

  // Reason 3: incomplete_practice — requires reading growth_items.
  // Stub until P3 wires this up. Callers see zero entries of this
  // kind for now.
  // (no iteration)

  // Dedupe by (kind,id), keeping the strongest reason.
  const byKey = new Map<string, OpenThread>();
  for (const t of open) {
    const key = `${t.kind}:${t.id}`;
    const prev = byKey.get(key);
    if (!prev || REASON_PRECEDENCE[t.reason] < REASON_PRECEDENCE[prev.reason]) {
      byKey.set(key, t);
    }
  }

  // Sort: most urgent first (overdue_ritual → pending_invite →
  // incomplete_practice → unclosed_divergence), then newest opened
  // within a reason.
  return Array.from(byKey.values()).sort((a, b) => {
    const byReason = REASON_PRECEDENCE[a.reason] - REASON_PRECEDENCE[b.reason];
    if (byReason !== 0) return byReason;
    const aMs = a.openedAt?.getTime() ?? 0;
    const bMs = b.openedAt?.getTime() ?? 0;
    return bMs - aMs;
  });
}

function ritualSubtitle(r: Ritual, now: Date): string {
  const due = r.nextRunAt?.toDate?.();
  if (!due) return 'Due now.';
  const ms = now.getTime() - due.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return 'Due today.';
  if (days === 1) return 'Due yesterday.';
  if (days < 7) return `Due ${days} days ago.`;
  return `Due ${Math.floor(days / 7)} weeks ago.`;
}
