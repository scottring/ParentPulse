'use client';

export function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

export function DomainDataView({ domainId, data }: { domainId: string; data: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => {
        if (typeof value === 'string' && value) {
          return (
            <div key={key}>
              <h4 className="text-xs font-medium text-stone-500 mb-2">{formatLabel(key)}</h4>
              <p className="text-sm text-stone-600">{value}</p>
            </div>
          );
        }
        if (Array.isArray(value) && value.length > 0) {
          if (typeof value[0] === 'string') {
            return (
              <div key={key}>
                <h4 className="text-xs font-medium text-stone-500 mb-2">{formatLabel(key)}</h4>
                <ul className="space-y-1">
                  {value.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                      <span className="text-stone-400 mt-0.5">&#8226;</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          if (typeof value[0] === 'object') {
            return (
              <div key={key}>
                <h4 className="text-xs font-medium text-stone-500 mb-2">{formatLabel(key)}</h4>
                {value.map((item: any, i: number) => (
                  <div key={i} className="text-sm text-stone-600 mb-2">
                    {item.name && <span className="font-medium">{item.name}</span>}
                    {item.area && <span className="font-medium">{item.area}</span>}
                    {item.description && <span className="text-stone-400"> — {item.description}</span>}
                    {item.owner && <span className="text-stone-400"> ({item.owner})</span>}
                    {item.frequency && <span className="text-xs text-stone-400 ml-1">({item.frequency})</span>}
                    {item.meaningSource && <span className="text-stone-400"> — {item.meaningSource}</span>}
                    {item.statement && <span>{item.statement}</span>}
                    {item.currentState && (
                      <div className="text-xs text-stone-400 mt-0.5">
                        Now: {item.currentState} → Goal: {item.idealState}
                      </div>
                    )}
                    {item.satisfaction && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ml-2 ${
                        item.satisfaction === 'working' ? 'bg-emerald-50 text-emerald-600' :
                        item.satisfaction === 'needs-discussion' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>{item.satisfaction}</span>
                    )}
                    {item.effectiveness && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ml-2 ${
                        item.effectiveness === 'working' ? 'bg-emerald-50 text-emerald-600' :
                        item.effectiveness === 'inconsistent' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>{item.effectiveness}</span>
                    )}
                    {item.style && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-stone-50 text-stone-500 ml-2">{item.style}</span>
                    )}
                    {item.consistency && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ml-2 ${
                        item.consistency === 'solid' ? 'bg-emerald-50 text-emerald-600' :
                        item.consistency === 'spotty' ? 'bg-amber-50 text-amber-600' :
                        'bg-stone-50 text-stone-400'
                      }`}>{item.consistency}</span>
                    )}
                    {item.priority && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ml-2 ${
                        item.priority === 'urgent' ? 'bg-red-50 text-red-600' :
                        item.priority === 'important' ? 'bg-amber-50 text-amber-600' :
                        'bg-stone-50 text-stone-400'
                      }`}>{item.priority}</span>
                    )}
                  </div>
                ))}
              </div>
            );
          }
        }
        return null;
      })}
    </div>
  );
}
