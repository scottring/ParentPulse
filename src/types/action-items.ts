export type ActionItemType =
  | 'missing_data'
  | 'stale_data'
  | 'synthesis_alert'
  | 'check_in_due'
  | 'contribution_request'
  | 'milestone';

export type ActionPriority = 'low' | 'medium' | 'high';
export type ActionSource = 'system' | 'synthesis' | 'schedule' | 'user';

export interface ActionItem {
  id: string;
  type: ActionItemType;
  priority: ActionPriority;
  title: string;
  description: string;
  targetPersonId?: string;
  targetPersonName?: string;
  actionRoute: string;
  source: ActionSource;
}
