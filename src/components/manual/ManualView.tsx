'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Manual, DomainUpdateSource } from '@/types/manual';
import type { DomainId } from '@/types/user';
import { DomainSection } from './LayerSection';
import { DOMAIN_ORDER, getDomainAge, getDomainFreshnessLabel } from '@/types/manual';

interface ManualViewProps {
  manual: Manual;
  onUpdateDomain?: (manualId: string, domainId: DomainId, data: Record<string, unknown>, source?: DomainUpdateSource) => Promise<void>;
}

export function ManualView({ manual, onUpdateDomain }: ManualViewProps) {
  const router = useRouter();
  const [expandedDomain, setExpandedDomain] = useState<DomainId | null>('values');
  const [editingDomain, setEditingDomain] = useState<DomainId | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);

  const handleToggle = (domainId: DomainId) => {
    setExpandedDomain(prev => prev === domainId ? null : domainId);
  };

  const handleRefresh = useCallback((domainId: DomainId) => {
    router.push(`/manual/${manual.manualId}/refresh/${domainId}`);
  }, [router, manual.manualId]);

  const handleStartEdit = useCallback((domainId: DomainId) => {
    setEditingDomain(domainId);
    setEditData(JSON.parse(JSON.stringify(manual.domains[domainId])));
  }, [manual.domains]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingDomain || !editData || !onUpdateDomain) return;
    await onUpdateDomain(manual.manualId, editingDomain, editData, 'manual-edit');
    setEditingDomain(null);
    setEditData(null);
  }, [editingDomain, editData, onUpdateDomain, manual.manualId]);

  const handleCancelEdit = useCallback(() => {
    setEditingDomain(null);
    setEditData(null);
  }, []);

  return (
    <div className="space-y-3">
      {DOMAIN_ORDER.map(domainId => {
        const ageMs = getDomainAge(manual, domainId);
        const freshness = getDomainFreshnessLabel(ageMs);

        return (
          <DomainSection
            key={domainId}
            domainId={domainId}
            data={manual.domains[domainId]}
            isExpanded={expandedDomain === domainId}
            onToggle={() => handleToggle(domainId)}
            freshnessLabel={freshness}
            onRefresh={() => handleRefresh(domainId)}
            onEdit={onUpdateDomain ? () => handleStartEdit(domainId) : undefined}
            editing={editingDomain === domainId}
            editData={editData ?? undefined}
            onEditChange={setEditData as (data: Record<string, unknown>) => void}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
          />
        );
      })}
    </div>
  );
}
