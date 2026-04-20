'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalEntry } from '@/types/journal';
import { SeedlingGlyph } from '@/components/journal-spread/SeedlingGlyph';

interface PersonReflectionsProps {
  personId: string;
}

const PAGE_SIZE = 10;

/**
 * Volume section "what we've tried, and what shifted." — lists
 * reflection entries about this person, newest first, up to 10.
 * A reflection entry is `category === 'reflection'` with at least
 * one reflectsOnEntryIds — the practice-close flow emits one.
 */
export function PersonReflections({ personId }: PersonReflectionsProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.familyId || !user?.userId || !personId) return;

    const q = query(
      collection(firestore, 'journal_entries'),
      where('familyId', '==', user.familyId),
      where('visibleToUserIds', 'array-contains', user.userId),
      where('personMentions', 'array-contains', personId),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: JournalEntry[] = snap.docs
          .map((d) => ({
            ...(d.data() as Omit<JournalEntry, 'entryId'>),
            entryId: d.id,
          } as JournalEntry))
          .filter(
            (e) =>
              e.category === 'reflection' &&
              (e.reflectsOnEntryIds?.length ?? 0) > 0,
          )
          .slice(0, PAGE_SIZE);
        setEntries(arr);
      },
      (err) => {
        console.warn('PersonReflections: listener error', err);
      },
    );
    return () => unsub();
  }, [user?.familyId, user?.userId, personId]);

  if (entries.length === 0) return null;

  return (
    <section aria-label="What we've tried and what shifted" style={{ marginTop: 40 }}>
      <h3
        style={{
          fontFamily: 'var(--r-serif, Georgia, serif)',
          fontStyle: 'italic',
          fontSize: 22,
          color: '#2d2418',
          margin: '0 0 16px 0',
        }}
      >
        What we&apos;ve tried, and what shifted.
      </h3>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {entries.map((e) => {
          const isOpen = expanded === e.entryId;
          const when = e.createdAt
            ?.toDate?.()
            .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          return (
            <li
              key={e.entryId}
              style={{
                padding: '12px 16px',
                background: 'rgba(92, 128, 100, 0.04)',
                borderLeft: '2px solid var(--r-sage, #5C8064)',
                borderRadius: 3,
              }}
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : e.entryId)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  width: '100%',
                }}
                aria-expanded={isOpen}
              >
                <span style={{ flex: 'none', alignSelf: 'center' }}>
                  <SeedlingGlyph size={14} />
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'var(--r-serif, Georgia, serif)',
                    fontSize: 15,
                    color: '#2d2418',
                    fontStyle: isOpen ? 'normal' : 'italic',
                  }}
                >
                  {e.title || 'A reflection'}
                </span>
                <span
                  style={{
                    fontFamily: '-apple-system, Helvetica Neue, sans-serif',
                    fontSize: 11,
                    letterSpacing: '0.05em',
                    color: '#a89373',
                  }}
                >
                  {when}
                </span>
              </button>
              {isOpen && (
                <div style={{ marginTop: 8, paddingLeft: 24 }}>
                  <p
                    style={{
                      margin: '0 0 8px 0',
                      fontFamily: 'var(--r-serif, Georgia, serif)',
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: '#3d3a34',
                    }}
                  >
                    {e.text}
                  </p>
                  <Link
                    href={`/journal/${e.entryId}`}
                    style={{
                      fontFamily: '-apple-system, Helvetica Neue, sans-serif',
                      fontSize: 12,
                      letterSpacing: '0.05em',
                      color: '#2d2418',
                      textDecoration: 'underline',
                    }}
                  >
                    open the reflection →
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
