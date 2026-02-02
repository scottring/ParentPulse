'use client';

import { useMemo } from 'react';
import type {
  HouseholdManual,
  FocusDomain,
  LayerId,
  LayerBaseline,
} from '@/types/household-workbook';
import {
  DOMAIN_BASELINE_REQUIREMENTS,
  checkBaselinesForDomains,
  calculateLayerBaseline,
  FOCUS_DOMAIN_META,
} from '@/types/household-workbook';
import {
  checkLayerBaseline,
  getMissingBaselines,
  calculateLayerBaselinePercentage,
  type BaselineRequirement,
} from '@/config/baseline-requirements';

// ==================== Types ====================

export interface DomainBaselineStatus {
  domain: FocusDomain;
  domainName: string;
  domainDescription: string;
  requiredLayers: LayerId[];
  isComplete: boolean;
  completionPercentage: number;
  missingRequirements: Array<BaselineRequirement & { isMet: boolean }>;
}

export interface UseBaselineEnforcementReturn {
  // Check if a specific domain can be selected
  canSelectDomain: (domain: FocusDomain) => boolean;

  // Get detailed status for a domain
  getDomainStatus: (domain: FocusDomain) => DomainBaselineStatus;

  // Get status for all domains
  getAllDomainStatuses: () => DomainBaselineStatus[];

  // Get which domains are available (baselines complete)
  availableDomains: FocusDomain[];

  // Get which domains need more work
  blockedDomains: Array<{ domain: FocusDomain; missingCount: number }>;

  // Get layer-level baseline status
  getLayerStatus: (layerId: LayerId) => {
    complete: boolean;
    percentage: number;
    requirements: Array<BaselineRequirement & { isMet: boolean }>;
  };

  // Overall baseline health
  overallBaselineHealth: number;
}

// ==================== Hook ====================

export function useBaselineEnforcement(
  manual: HouseholdManual | null
): UseBaselineEnforcementReturn {
  const canSelectDomain = useMemo(() => {
    return (domain: FocusDomain): boolean => {
      if (!manual) return false;
      const requiredLayers = DOMAIN_BASELINE_REQUIREMENTS[domain];
      const { complete } = checkBaselinesForDomains(manual, [domain]);
      return complete;
    };
  }, [manual]);

  const getDomainStatus = useMemo(() => {
    return (domain: FocusDomain): DomainBaselineStatus => {
      const meta = FOCUS_DOMAIN_META[domain];
      const requiredLayers = DOMAIN_BASELINE_REQUIREMENTS[domain];

      if (!manual) {
        return {
          domain,
          domainName: meta.name,
          domainDescription: meta.description,
          requiredLayers,
          isComplete: false,
          completionPercentage: 0,
          missingRequirements: [],
        };
      }

      const missing = getMissingBaselines(manual, requiredLayers);
      const layerPercentages = requiredLayers.map((layerId) =>
        calculateLayerBaselinePercentage(manual, layerId)
      );
      const avgPercentage =
        layerPercentages.length > 0
          ? Math.round(
              layerPercentages.reduce((a, b) => a + b, 0) / layerPercentages.length
            )
          : 100;

      return {
        domain,
        domainName: meta.name,
        domainDescription: meta.description,
        requiredLayers,
        isComplete: missing.length === 0,
        completionPercentage: avgPercentage,
        missingRequirements: missing,
      };
    };
  }, [manual]);

  const getAllDomainStatuses = useMemo(() => {
    return (): DomainBaselineStatus[] => {
      const domains: FocusDomain[] = [
        'physical_environment',
        'behavior_boundaries',
        'partner_dynamics',
        'routines_rituals',
        'self_regulation',
        'values_alignment',
      ];
      return domains.map(getDomainStatus);
    };
  }, [getDomainStatus]);

  const availableDomains = useMemo(() => {
    if (!manual) return [];
    const statuses = getAllDomainStatuses();
    return statuses.filter((s) => s.isComplete).map((s) => s.domain);
  }, [manual, getAllDomainStatuses]);

  const blockedDomains = useMemo(() => {
    if (!manual) return [];
    const statuses = getAllDomainStatuses();
    return statuses
      .filter((s) => !s.isComplete)
      .map((s) => ({
        domain: s.domain,
        missingCount: s.missingRequirements.length,
      }));
  }, [manual, getAllDomainStatuses]);

  const getLayerStatus = useMemo(() => {
    return (
      layerId: LayerId
    ): {
      complete: boolean;
      percentage: number;
      requirements: Array<BaselineRequirement & { isMet: boolean }>;
    } => {
      if (!manual) {
        return { complete: false, percentage: 0, requirements: [] };
      }

      const { complete, requirements } = checkLayerBaseline(manual, layerId);
      const percentage = calculateLayerBaselinePercentage(manual, layerId);

      return { complete, percentage, requirements };
    };
  }, [manual]);

  const overallBaselineHealth = useMemo(() => {
    if (!manual) return 0;

    const layerIds: LayerId[] = [1, 2, 3, 4, 5, 6];
    const percentages = layerIds.map((id) =>
      calculateLayerBaselinePercentage(manual, id)
    );

    return Math.round(
      percentages.reduce((a, b) => a + b, 0) / percentages.length
    );
  }, [manual]);

  return {
    canSelectDomain,
    getDomainStatus,
    getAllDomainStatuses,
    availableDomains,
    blockedDomains,
    getLayerStatus,
    overallBaselineHealth,
  };
}

export default useBaselineEnforcement;
