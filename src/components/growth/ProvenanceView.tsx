'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { usePerson } from '@/hooks/usePerson';
import type { GrowthItem } from '@/types/growth';
import type { JournalEntry } from '@/types/journal';
import type { Moment } from '@/types/moment';

interface ProvenanceViewProps {
  item: GrowthItem;
  currentUserId: string;
  onBegin: () => void;
}

const MAX_VISIBLE = 3;

function firstSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  const dot = trimmed.search(/[.!?]\s/);
  if (dot === -1) return trimmed.length > 140 ? trimmed.slice(0, 139) + '…' : trimmed;
  return trimmed.slice(0, dot + 1);
}

function formatDate(ts: JournalEntry['createdAt']): string {
  const d = ts?.toDate?.();
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function initialFor(name?: string, fallback?: string): string {
  if (name && name.trim().length > 0) return name.trim()[0].toUpperCase();
  if (fallback) return fallback.slice(0, 1).toUpperCase();
  return '·';
}

/**
 * ProvenanceView — the first pane of a practice that was spawned
 * from specific journal entries. Reading order: moments → pattern
 * → practice. The CTA advances to the brief.
 */
export function ProvenanceView({ item, currentUserId, onBegin }: ProvenanceViewProps) {
  const entryIds = item.spawnedFromEntryIds ?? [];
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [moment, setMoment] = useState<Moment | null>(null);
  const { people } = usePerson();

  useEffect(() => {
    if (entryIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const fetched = await Promise.all(
          entryIds.slice(0, 10).map(async (id) => {
            const snap = await getDoc(doc(firestore, 'journal_entries', id));
            if (!snap.exists()) return null;
            return {
              ...(snap.data() as Omit<JournalEntry, 'entryId'>),
              entryId: snap.id,
            } as JournalEntry;
          }),
        );
        if (cancelled) return;
        const valid = fetched.filter((e): e is JournalEntry => e !== null);
        setEntries(valid);

        // If the cluster shares a momentId, fetch it so we can use
        // its cached synthesis line below the entry list.
        const momentIds = new Set(
          valid.map((e) => e.momentId).filter((id): id is string => Boolean(id)),
        );
        if (momentIds.size === 1) {
          const only = momentIds.values().next().value as string;
          const mSnap = await getDoc(doc(firestore, 'moments', only));
          if (!cancelled && mSnap.exists()) {
            setMoment({
              ...(mSnap.data() as Omit<Moment, 'momentId'>),
              momentId: mSnap.id,
            });
          }
        }
      } catch (err) {
        console.warn('ProvenanceView: failed to load entries', err);
        if (!cancelled) setEntries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entryIds.join(',')]);

  // Map userId → display name via the Person table. Persons have
  // `linkedUserId` pointing at a user account.
  const authorNameOf = (authorId: string): string | undefined => {
    const p = people?.find((x) => x.linkedUserId === authorId);
    return p?.name;
  };

  const visible = (entries ?? []).slice(0, MAX_VISIBLE);
  const extra = Math.max(0, (entries ?? []).length - MAX_VISIBLE);

  // P3.2 — author attribution. If ANY referenced entry was written
  // by someone other than the current user, name them.
  const otherAuthors = Array.from(new Set(
    (entries ?? [])
      .map((e) => e.authorId)
      .filter((uid) => uid && uid !== currentUserId),
  ));
  const otherAuthorNames = otherAuthors
    .map((uid) => authorNameOf(uid) ?? 'someone')
    .filter((n, i, arr) => arr.indexOf(n) === i);

  // One italic sentence below the cards. Priority:
  //   1. Moment synthesis (divergence > emergent > agreement)
  //   2. Fallback — "A pattern worth sitting with."
  const synthesisSentence = (() => {
    const s = moment?.synthesis;
    if (s?.divergenceLine) return s.divergenceLine;
    if (s?.emergentLine) return s.emergentLine;
    if (s?.agreementLine) return s.agreementLine;
    return 'A pattern worth sitting with.';
  })();

  return (
    <div className="provenance-view">
      <div className="inner">
        <p className="kicker">Because of these moments</p>
        {otherAuthorNames.length > 0 && (
          <p className="attribution">
            <em>this came from what {otherAuthorNames.join(' &amp; ')} wrote.</em>
          </p>
        )}

        {entries === null && <p className="muted">Gathering the moments…</p>}
        {entries !== null && visible.length === 0 && (
          <p className="muted">The source entries are no longer visible.</p>
        )}

        {visible.length > 0 && (
          <ol className="entry-list">
            {visible.map((e) => {
              const name = authorNameOf(e.authorId);
              return (
                <li key={e.entryId} className="entry-row">
                  <Link href={`/journal/${e.entryId}`} className="entry-link">
                    <span className="entry-initial" aria-hidden>
                      {initialFor(name, e.authorId)}
                    </span>
                    <span className="entry-body">
                      <span className="entry-excerpt">{firstSentence(e.text)}</span>
                      <span className="entry-meta">
                        {name ?? 'You'} · {formatDate(e.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        {extra > 0 && (
          <p className="extra">+{extra} more</p>
        )}

        <p className="synthesis">
          <em>{synthesisSentence}</em>
        </p>

        <button type="button" className="begin-cta" onClick={onBegin}>
          begin the practice <span aria-hidden>→</span>
        </button>
      </div>

      <style jsx>{`
        .provenance-view {
          max-width: 640px;
          margin: 0 auto;
          padding: 32px 24px 48px;
        }
        .inner {
          background: #faf7f1;
          border: 1px solid #e8e1d2;
          border-radius: 6px;
          padding: 28px 32px;
          font-family: Georgia, 'Times New Roman', serif;
          color: #2d2418;
        }
        .kicker {
          margin: 0 0 10px 0;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #a89373;
        }
        .attribution {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: #6b5d45;
        }
        .muted {
          font-style: italic;
          color: #a89373;
        }
        .entry-list {
          list-style: none;
          padding: 0;
          margin: 0 0 12px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .entry-row :global(a.entry-link) {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          background: #fff;
          border: 1px solid #e8e1d2;
          border-radius: 3px;
          text-decoration: none;
          color: #2d2418;
        }
        .entry-row :global(a.entry-link:hover) {
          background: #f2ebdc;
        }
        .entry-initial {
          flex: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #e8e1d2;
          color: #2d2418;
          font-family: Georgia, serif;
          font-style: italic;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .entry-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .entry-excerpt {
          font-size: 14px;
          line-height: 1.5;
          color: #3d3a34;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .entry-meta {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.05em;
          color: #a89373;
        }
        .extra {
          margin: 0 0 16px 0;
          font-size: 13px;
          font-style: italic;
          color: #a89373;
        }
        .synthesis {
          margin: 18px 0 22px 0;
          padding-left: 12px;
          border-left: 2px solid #c89b3b;
          font-size: 16px;
          line-height: 1.55;
        }
        .begin-cta {
          all: unset;
          cursor: pointer;
          padding: 10px 20px;
          background: #2d2418;
          color: #f7f3ea;
          border-radius: 999px;
          font-family: Georgia, serif;
          font-style: italic;
          font-size: 15px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .begin-cta:hover {
          background: #1a1610;
        }
      `}</style>
    </div>
  );
}
