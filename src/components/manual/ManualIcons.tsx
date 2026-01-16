/**
 * Owner's Manual Iconography System
 *
 * Technical symbols and warning labels inspired by owner's manuals
 * Used to visually communicate relationship operating instructions
 */

import React from 'react';

export const ManualIcons = {
  // ============ WARNING & HAZARD SYMBOLS ============

  /**
   * ⚡ ELECTRICAL HAZARD - Major triggers, things that cause severe upset
   * Use for: Critical sensitivities, explosive anger triggers, severe anxiety triggers
   */
  ElectricalHazard: ({ size = 24, color = '#dc2626' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="#fef2f2"/>
      <path d="M13 7l-5 7h4l-1 4 5-7h-4l1-4z" fill={color}/>
    </svg>
  ),

  /**
   * ⚠️ WARNING - General warnings, moderate triggers
   * Use for: Things to be careful about, moderate sensitivities
   */
  Warning: ({ size = 24, color = '#ea580c' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 20h20L12 2z" stroke={color} strokeWidth="2" fill="#fff7ed"/>
      <path d="M12 9v4M12 17v.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  /**
   * 🚫 PROHIBITED - Absolute no-go's, immovable boundaries
   * Use for: Things that NEVER work, hard boundaries, dealbreakers
   */
  Prohibited: ({ size = 24, color = '#dc2626' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="white"/>
      <path d="M4 4l16 16" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),

  /**
   * ☢️ RADIATION - Toxic behaviors, things that contaminate the relationship
   * Use for: Criticism, contempt, defensiveness, stonewalling (Gottman's 4 horsemen)
   */
  Toxic: ({ size = 24, color = '#7c2d12' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="#fff7ed"/>
      <circle cx="12" cy="12" r="3" fill={color}/>
      <path d="M12 4v3M12 17v3M20 12h-3M7 12H4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="7" r="1.5" fill={color}/>
      <circle cx="12" cy="17" r="1.5" fill={color}/>
      <circle cx="17" cy="12" r="1.5" fill={color}/>
      <circle cx="7" cy="12" r="1.5" fill={color}/>
    </svg>
  ),

  // ============ RECOMMENDED & SAFE SYMBOLS ============

  /**
   * ✓ RECOMMENDED - Things that work well, proven strategies
   * Use for: Effective communication styles, successful approaches
   */
  Recommended: ({ size = 24, color = '#16a34a' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="#f0fdf4"/>
      <path d="M8 12l3 3 5-6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  /**
   * 🔧 MAINTENANCE REQUIRED - Regular upkeep, ongoing needs
   * Use for: Daily routines, regular check-ins, maintenance behaviors
   */
  Maintenance: ({ size = 24, color = '#2563eb' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" fill="#eff6ff"/>
      <path d="M9 12h6M12 9v6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 7l2-2M7 15l-2 2M17 17l2 2M7 9L5 7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  // ============ OPERATIONAL SYMBOLS ============

  /**
   * 🌡️ TEMPERATURE GAUGE - Stress level, emotional state
   * Use for: Mood indicators, stress levels, emotional temperature
   */
  Temperature: ({ level = 3, size = 24 }: { level?: 1 | 2 | 3 | 4 | 5; size?: number }) => {
    const colors = ['#10b981', '#84cc16', '#eab308', '#f97316', '#dc2626'];
    const color = colors[level - 1];
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="9" y="3" width="6" height="14" rx="3" stroke="#64748b" strokeWidth="2" fill="white"/>
        <circle cx="12" cy="19" r="3" fill={color} stroke="#64748b" strokeWidth="2"/>
        <rect x="10" y="6" width="4" height={12 - (level * 2)} fill={color} rx="2"/>
      </svg>
    );
  },

  /**
   * ⏰ TIMING - Schedule sensitivities, time-dependent needs
   * Use for: Best times for difficult conversations, morning person vs night owl
   */
  Timing: ({ size = 24, color = '#7c3aed' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="#faf5ff"/>
      <path d="M12 6v6l4 4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  /**
   * 🔄 CYCLE - Patterns, recurring behaviors
   * Use for: Weekly patterns, mood cycles, predictable triggers
   */
  Cycle: ({ size = 24, color = '#0891b2' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 12c0 4.4-3.6 8-8 8s-8-3.6-8-8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3"/>
      <path d="M17 8l3 4-4 1" fill={color}/>
      <path d="M7 16l-3-4 4-1" fill={color}/>
    </svg>
  ),

  /**
   * 💡 INSIGHT - Key learnings, important discoveries
   * Use for: Breakthrough moments, key insights about the person
   */
  Insight: ({ size = 24, color = '#ca8a04' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="10" r="4" stroke={color} strokeWidth="2" fill="#fefce8"/>
      <path d="M10 14h4v4h-4z" stroke={color} strokeWidth="2" fill="#fefce8"/>
      <path d="M10 18h4v2h-4z" fill={color}/>
      <path d="M9 6L7 4M15 6l2-2M6 11H4M20 11h-2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  /**
   * 🛠️ TROUBLESHOOTING - When things go wrong
   * Use for: Repair strategies, how to fix conflicts
   */
  Troubleshooting: ({ size = 24, color = '#4f46e5' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke={color} strokeWidth="2" fill="#eef2ff"/>
      <path d="M9 10V7a3 3 0 116 0v3" stroke={color} strokeWidth="2"/>
      <path d="M10 14h4M12 12v4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  // ============ SPECIFICATIONS & DATA ============

  /**
   * 📏 SPECIFICATION - Key facts, measurements, data
   * Use for: Age, preferences, hard data about the person
   */
  Specification: ({ size = 24, color = '#0f172a' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2" fill="white"/>
      <path d="M4 8h16M8 4v16" stroke={color} strokeWidth="1.5"/>
      <text x="13" y="15" fontSize="10" fill={color} fontWeight="bold">i</text>
    </svg>
  ),

  /**
   * 📊 DIAGNOSTIC - Assessments, measurements over time
   * Use for: Mood tracking, progress charts, analytics
   */
  Diagnostic: ({ size = 24, color = '#059669' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" fill="#f0fdf4"/>
      <path d="M7 15l3-4 3 3 4-6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  // ============ DIRECTIONAL & OPERATIONAL ============

  /**
   * ➡️ STEP BY STEP - Sequential instructions
   * Use for: De-escalation procedures, conversation scripts
   */
  StepByStep: ({ step = 1, size = 24, color = '#0284c7' }: { step?: number; size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="#e0f2fe"/>
      <text x="12" y="16" fontSize="12" fill={color} fontWeight="bold" textAnchor="middle">{step}</text>
    </svg>
  ),

  /**
   * 🔄 RESET - Start over, clean slate needed
   * Use for: When to take a break and reset, cooling down
   */
  Reset: ({ size = 24, color = '#9333ea' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 12l-2-2m2 2l2-2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

/**
 * Manual Icon Component - Wrapper for easy use
 */
interface ManualIconProps {
  type: keyof typeof ManualIcons;
  size?: number;
  color?: string;
  level?: 1 | 2 | 3 | 4 | 5;
  step?: number;
}

export function ManualIcon({ type, size, color, level, step }: ManualIconProps) {
  const Icon = ManualIcons[type];
  if (!Icon) return null;

  // @ts-ignore - TypeScript doesn't like dynamic props
  return <Icon size={size} color={color} level={level} step={step} />;
}

/**
 * Warning Label Component - Full warning card with icon and text
 */
interface WarningLabelProps {
  type: 'electrical' | 'warning' | 'prohibited' | 'toxic';
  title: string;
  description: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export function WarningLabel({ type, title, description, severity = 'high' }: WarningLabelProps) {
  const iconMap = {
    electrical: 'ElectricalHazard',
    warning: 'Warning',
    prohibited: 'Prohibited',
    toxic: 'Toxic'
  };

  const severityColors = {
    critical: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },
    high: { bg: '#fff7ed', border: '#ea580c', text: '#7c2d12' },
    medium: { bg: '#fefce8', border: '#eab308', text: '#713f12' },
    low: { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a' }
  };

  const colors = severityColors[severity];

  return (
    <div
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <ManualIcon type={iconMap[type] as any} size={32} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: colors.text,
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: '14px', color: colors.text, lineHeight: '1.5' }}>
          {description}
        </div>
      </div>
    </div>
  );
}

/**
 * Specification Table - Owner's manual style specs
 */
interface SpecTableProps {
  specs: Array<{ label: string; value: string | number }>;
}

export function SpecificationTable({ specs }: SpecTableProps) {
  return (
    <div
      style={{
        border: '2px solid #e7e5e4',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'white'
      }}
    >
      <div
        style={{
          background: '#0f172a',
          color: 'white',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <ManualIcon type="Specification" size={20} color="white" />
        SPECIFICATIONS
      </div>
      <div>
        {specs.map((spec, index) => (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              padding: '12px 16px',
              borderBottom: index < specs.length - 1 ? '1px solid #e7e5e4' : 'none',
              background: index % 2 === 0 ? 'white' : '#fafaf9'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#57534e' }}>
              {spec.label}
            </div>
            <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>
              {spec.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ManualIcon;
