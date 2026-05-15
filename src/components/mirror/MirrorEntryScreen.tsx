'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';

export interface PairChoice {
  participants: { participantId: string; label: string }[];
}

export function MirrorEntryScreen({ onStart }: { onStart: (pair: PairChoice) => void }) {
  const { user } = useAuth();
  const { people, loading } = usePerson();
  const [selected, setSelected] = useState<string[]>([]);

  const options = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (user?.userId) list.push({ id: user.userId, label: user.name || 'Me' });
    for (const p of people) list.push({ id: p.personId, label: p.name });
    return list;
  }, [people, user]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev,
    );

  if (loading) return <p style={{ padding: 24 }}>Opening…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-parent-display)', fontSize: 28 }}>
        Tonight’s pair
      </h1>
      <p style={{ color: 'var(--parent-text-light)' }}>
        Pick the two people doing this together.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => toggle(o.id)}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: '1px solid var(--parent-border)',
              background: selected.includes(o.id) ? 'var(--parent-accent)' : 'transparent',
              color: selected.includes(o.id) ? '#fff' : 'var(--parent-text)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        disabled={selected.length !== 2}
        onClick={() =>
          onStart({
            participants: selected.map((id) => ({
              participantId: id,
              label: options.find((o) => o.id === id)!.label,
            })),
          })
        }
        style={{
          padding: '12px 20px',
          borderRadius: 12,
          border: 'none',
          background: selected.length === 2 ? 'var(--parent-accent)' : 'var(--parent-border)',
          color: '#fff',
          fontSize: 16,
        }}
      >
        Begin
      </button>
    </div>
  );
}
