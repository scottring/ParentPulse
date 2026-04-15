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
          gap: 2px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .pill {
          padding: 4px 10px;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          border: none;
          border-bottom: 1px solid transparent;
          color: rgba(245, 236, 216, 0.55);
          background: transparent;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          cursor: pointer;
          transition: color 140ms ease, border-color 140ms ease;
        }
        .pill:hover {
          color: rgba(245, 236, 216, 0.85);
        }
        .pill.active {
          color: #f5ecd8;
          border-bottom-color: rgba(245, 236, 216, 0.6);
        }
      `}</style>
    </div>
  );
}
