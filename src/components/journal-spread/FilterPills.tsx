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
          gap: 6px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .pill {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          border: 1px solid #8a6f4a;
          color: #5a4628;
          background: transparent;
          font-family: -apple-system, sans-serif;
          letter-spacing: 0.05em;
          cursor: pointer;
        }
        .pill.active {
          background: #3d2f1f;
          color: #f5ecd8;
          border-color: #3d2f1f;
        }
      `}</style>
    </div>
  );
}
