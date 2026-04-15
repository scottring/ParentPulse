'use client';

export type FilterSelection =
  | { kind: 'everyone' }
  | { kind: 'just-me' }
  | { kind: 'person'; personId: string }
  | { kind: 'syntheses' };

export interface FilterPillsPerson {
  id: string;
  name: string;
}

export interface FilterPillsProps {
  people: FilterPillsPerson[];
  active: FilterSelection;
  onChange: (next: FilterSelection) => void;
}

function isActive(active: FilterSelection, candidate: FilterSelection): boolean {
  if (active.kind !== candidate.kind) return false;
  if (active.kind === 'person' && candidate.kind === 'person') {
    return active.personId === candidate.personId;
  }
  return true;
}

export function FilterPills({ people, active, onChange }: FilterPillsProps) {
  const pills: Array<{ label: string; sel: FilterSelection }> = [
    { label: 'Everyone', sel: { kind: 'everyone' } },
    { label: 'Just me', sel: { kind: 'just-me' } },
    ...people.map((p) => ({ label: p.name, sel: { kind: 'person' as const, personId: p.id } })),
    { label: 'Syntheses', sel: { kind: 'syntheses' } },
  ];

  return (
    <div className="filter-pills">
      {pills.map((pill, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(pill.sel)}
          className={`pill${isActive(active, pill.sel) ? ' active' : ''}`}
        >
          {pill.label}
        </button>
      ))}
      <style jsx>{`
        .filter-pills {
          display: flex;
          gap: 4px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 8px;
          padding: 4px 0;
        }
        .pill {
          padding: 6px 14px;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          border: none;
          border-radius: 14px;
          color: #7a5f3d;
          background: transparent;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          cursor: pointer;
          transition:
            color 180ms ease,
            background 180ms ease,
            padding 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
            letter-spacing 220ms ease,
            transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
          transform-origin: center;
        }
        .pill:hover {
          color: #2a1f14;
          background: rgba(138, 111, 74, 0.14);
          padding: 6px 20px;
          letter-spacing: 0.22em;
          transform: translateY(-1px);
        }
        .pill.active {
          color: #f5ecd8;
          background: #2a1f14;
        }
        .pill.active:hover {
          background: #1a120a;
          color: #f5ecd8;
        }
      `}</style>
    </div>
  );
}
