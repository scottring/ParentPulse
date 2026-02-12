'use client';

import { formatLabel } from './DomainDataView';

export function EditableDomainView({
  domainId,
  data,
  onChange,
}: {
  domainId: string;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-5">
      {Object.entries(data).map(([key, value]) => {
        if (typeof value === 'string') {
          return (
            <div key={key}>
              <h4 className="text-xs font-medium text-stone-500 mb-2">{formatLabel(key)}</h4>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
          );
        }
        if (Array.isArray(value)) {
          if (value.length === 0 || typeof value[0] === 'string') {
            return (
              <EditableStringList
                key={key}
                label={formatLabel(key)}
                items={value as string[]}
                onChange={(v) => onChange({ ...data, [key]: v })}
                addLabel={`Add ${formatLabel(key).toLowerCase().replace(/s$/, '')}`}
              />
            );
          }
          if (typeof value[0] === 'object') {
            const nameField = value[0].name ? 'name' : value[0].area ? 'area' : value[0].statement ? 'statement' : 'name';
            return (
              <EditableNamedList
                key={key}
                label={formatLabel(key)}
                items={value}
                onChange={(v) => onChange({ ...data, [key]: v })}
                addLabel={`Add`}
                nameField={nameField}
              />
            );
          }
        }
        return null;
      })}
    </div>
  );
}

function EditableStringList({
  label,
  items,
  onChange,
  addLabel = 'Add',
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel?: string;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-stone-500 mb-2">{label}</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 text-sm px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-2 text-stone-400 hover:text-red-500 shrink-0"
              title="Remove"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, ''])}
          className="text-xs text-stone-500 hover:text-stone-700 px-3 py-1.5 border border-dashed border-stone-300 rounded-lg hover:border-stone-400"
        >
          + {addLabel}
        </button>
      </div>
    </div>
  );
}

function EditableNamedList({
  label,
  items,
  onChange,
  addLabel = 'Add',
  nameField = 'name',
}: {
  label: string;
  items: any[];
  onChange: (items: any[]) => void;
  addLabel?: string;
  nameField?: string;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-stone-500 mb-2">{label}</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              type="text"
              value={item[nameField] || ''}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], [nameField]: e.target.value };
                onChange(next);
              }}
              className="flex-1 text-sm px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-2 text-stone-400 hover:text-red-500 shrink-0"
              title="Remove"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, { [nameField]: '', id: `new-${Date.now()}` }])}
          className="text-xs text-stone-500 hover:text-stone-700 px-3 py-1.5 border border-dashed border-stone-300 rounded-lg hover:border-stone-400"
        >
          + {addLabel}
        </button>
      </div>
    </div>
  );
}
