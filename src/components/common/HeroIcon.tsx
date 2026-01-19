/**
 * HeroIcon Component
 *
 * Renders Heroicons by name string for dynamic icon usage
 * Replaces emoji usage throughout the app with proper icon components
 */

import * as HeroIconsOutline from '@heroicons/react/24/outline';
import * as HeroIconsSolid from '@heroicons/react/24/solid';

type IconName = keyof typeof HeroIconsOutline;
type IconVariant = 'outline' | 'solid';

interface HeroIconProps {
  name: IconName;
  variant?: IconVariant;
  className?: string;
  size?: number;
}

export function HeroIcon({
  name,
  variant = 'outline',
  className = '',
  size
}: HeroIconProps) {
  const icons = variant === 'solid' ? HeroIconsSolid : HeroIconsOutline;
  const Icon = icons[name];

  if (!Icon) {
    console.warn(`HeroIcon: Icon "${name}" not found`);
    return null;
  }

  const sizeClass = size ? `w-${size} h-${size}` : 'w-6 h-6';
  const style = size ? { width: size, height: size } : {};

  return <Icon className={`${sizeClass} ${className}`} style={style} />;
}

/**
 * Section Icon - Specialized component for onboarding section icons
 * with consistent sizing and styling
 */
interface SectionIconProps {
  name: IconName;
  variant?: IconVariant;
  className?: string;
}

export function SectionIcon({ name, variant = 'outline', className = '' }: SectionIconProps) {
  return (
    <div className={`flex-shrink-0 ${className}`}>
      <HeroIcon
        name={name}
        variant={variant}
        className="w-6 h-6 text-gray-600"
      />
    </div>
  );
}

// Icon name mapping for common use cases
export const IconMap = {
  // Onboarding sections
  overview: 'UserCircleIcon' as IconName,
  triggers: 'BoltIcon' as IconName,
  whatWorks: 'SparklesIcon' as IconName,
  boundaries: 'ShieldCheckIcon' as IconName,
  strengths: 'FireIcon' as IconName,
  development: 'BookOpenIcon' as IconName,
  loveLanguages: 'HeartIcon' as IconName,
  health: 'HeartIcon' as IconName,
  connection: 'ChatBubbleLeftRightIcon' as IconName,
  workStyle: 'BriefcaseIcon' as IconName,
  dynamics: 'UsersIcon' as IconName,

  // Common actions
  add: 'PlusIcon' as IconName,
  edit: 'PencilIcon' as IconName,
  delete: 'TrashIcon' as IconName,
  save: 'CheckIcon' as IconName,
  cancel: 'XMarkIcon' as IconName,
  close: 'XMarkIcon' as IconName,

  // Navigation
  home: 'HomeIcon' as IconName,
  people: 'UsersIcon' as IconName,
  manual: 'BookOpenIcon' as IconName,
  journal: 'BookmarkIcon' as IconName,
  coach: 'ChatBubbleLeftRightIcon' as IconName,
  settings: 'Cog6ToothIcon' as IconName,

  // Workbook actions
  observation: 'EyeIcon' as IconName,
  chips: 'SparklesIcon' as IconName,
  behavior: 'ChartBarIcon' as IconName,
  voice: 'MicrophoneIcon' as IconName,

  // Status
  success: 'CheckCircleIcon' as IconName,
  warning: 'ExclamationTriangleIcon' as IconName,
  error: 'XCircleIcon' as IconName,
  info: 'InformationCircleIcon' as IconName,
};

export default HeroIcon;
