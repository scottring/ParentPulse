'use client';

import Link from 'next/link';
import { JournalEntry } from '@/types/journal';

interface RecentJournalTileProps {
  entry: JournalEntry;
}

function toDate(createdAt: JournalEntry['createdAt']): Date {
  if (createdAt && typeof (createdAt as any).toDate === 'function') {
    return (createdAt as any).toDate();
  }
  if (createdAt && typeof (createdAt as any)._seconds === 'number') {
    return new Date((createdAt as any)._seconds * 1000);
  }
  return new Date();
}

function relativeDate(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function RecentJournalTile({ entry }: RecentJournalTileProps) {
  const date = toDate(entry.createdAt);
  const excerpt = entry.text.length > 120 ? `${entry.text.slice(0, 120)}…` : entry.text;

  return (
    <Link
      href={`/journal/${entry.entryId}`}
      className="bg-white rounded-xl p-4 hover:shadow-sm transition-shadow block"
    >
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        {relativeDate(date)}
      </p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>
        {excerpt}
      </p>
    </Link>
  );
}
