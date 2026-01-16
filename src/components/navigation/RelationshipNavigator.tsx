'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * RelationshipNavigator - Hierarchical navigation for the Family Operating Manual
 *
 * Concept: The nuclear family is a meta-operating manual containing individual manuals
 *
 * Structure:
 * - Family Level (collective)
 * - Individual Members (children, spouse, extended)
 * - Relationship Dynamics (between members)
 */

interface RelationshipMember {
  id: string;
  name: string;
  type: 'children' | 'spouse' | 'parent' | 'friend' | 'professional';
  avatarUrl?: string;
  hasProfile: boolean;
  hasActivePlan: boolean;
}

interface NavigatorProps {
  familyName: string;
  members: RelationshipMember[];
  onNavigate?: (type: string, id?: string) => void;
}

export default function RelationshipNavigator({ familyName, members, onNavigate }: NavigatorProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['family', 'children']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      children: '🌱',
      spouse: '💑',
      parent: '👵',
      friend: '🤝',
      professional: '💼',
      family: '👨‍👩‍👧‍👦'
    };
    return icons[type] || '👤';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      children: '#4a9d7f',
      spouse: '#c86b7a',
      parent: '#a594bd',
      friend: '#f0a660',
      professional: '#5d8396',
      family: '#3a7a63'
    };
    return colors[type] || '#6b7280';
  };

  const groupedMembers = members.reduce((acc, member) => {
    if (!acc[member.type]) acc[member.type] = [];
    acc[member.type].push(member);
    return acc;
  }, {} as Record<string, RelationshipMember[]>);

  return (
    <nav className="relationship-navigator">
      <style jsx>{`
        .relationship-navigator {
          width: 280px;
          background: linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%);
          border-right: 1px solid #e7e5e4;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          overflow-y: auto;
          font-family: var(--font-body);
          z-index: 100;
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.04);
        }

        .nav-header {
          padding: 24px 20px;
          border-bottom: 1px solid #e7e5e4;
          background: white;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .family-title {
          font-family: var(--font-heading);
          font-size: 24px;
          font-weight: 700;
          color: #1e3a32;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .family-subtitle {
          font-size: 13px;
          color: #78716c;
          font-style: italic;
        }

        .nav-section {
          margin: 16px 0;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
        }

        .section-header:hover {
          background: rgba(0, 0, 0, 0.02);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #57534e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .section-icon {
          font-size: 18px;
        }

        .section-count {
          font-size: 11px;
          background: #e7e5e4;
          color: #57534e;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }

        .expand-icon {
          font-size: 12px;
          color: #a8a29e;
          transition: transform 0.2s ease;
        }

        .expand-icon.expanded {
          transform: rotate(90deg);
        }

        .section-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .section-content.expanded {
          max-height: 1000px;
        }

        .member-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px 10px 48px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          color: inherit;
          position: relative;
        }

        .member-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--member-color);
          transform: scaleY(0);
          transition: transform 0.2s ease;
        }

        .member-item:hover {
          background: rgba(0, 0, 0, 0.02);
        }

        .member-item:hover::before {
          transform: scaleY(1);
        }

        .member-item.active {
          background: linear-gradient(
            90deg,
            rgba(74, 157, 127, 0.08) 0%,
            transparent 100%
          );
        }

        .member-item.active::before {
          transform: scaleY(1);
        }

        .member-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--member-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          position: relative;
        }

        .member-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .status-indicator {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid #fafaf9;
        }

        .status-indicator.has-plan {
          background: #4ade80;
        }

        .status-indicator.no-profile {
          background: #fbbf24;
        }

        .member-info {
          flex: 1;
          min-width: 0;
        }

        .member-name {
          font-size: 15px;
          font-weight: 600;
          color: #292524;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .member-type {
          font-size: 12px;
          color: #78716c;
          text-transform: capitalize;
        }

        .family-level-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          margin: 8px 12px;
          background: linear-gradient(135deg, #4a9d7f 0%, #3a7a63 100%);
          color: white;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(74, 157, 127, 0.2);
        }

        .family-level-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(74, 157, 127, 0.3);
        }

        .family-level-icon {
          font-size: 24px;
        }

        .family-level-text {
          flex: 1;
        }

        .family-level-title {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .family-level-subtitle {
          font-size: 12px;
          opacity: 0.9;
        }

        .nav-footer {
          padding: 20px;
          border-top: 1px solid #e7e5e4;
          margin-top: auto;
        }

        .add-member-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          background: white;
          border: 2px dashed #d6d3d1;
          border-radius: 8px;
          color: #78716c;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-member-button:hover {
          border-color: #4a9d7f;
          color: #4a9d7f;
          background: #f0f7f4;
        }
      `}</style>

      {/* Header */}
      <div className="nav-header">
        <div className="family-title">
          <span>📚</span>
          {familyName}
        </div>
        <div className="family-subtitle">Family Operating Manual</div>
      </div>

      {/* Family-Level Overview */}
      <Link href="/family" className="family-level-link">
        <div className="family-level-icon">👨‍👩‍👧‍👦</div>
        <div className="family-level-text">
          <div className="family-level-title">Family Dynamics</div>
          <div className="family-level-subtitle">Collective insights & plans</div>
        </div>
      </Link>

      {/* Member Sections */}
      <div className="nav-sections">
        {Object.entries(groupedMembers).map(([type, typeMembers]) => (
          <div key={type} className="nav-section">
            <button
              className="section-header"
              onClick={() => toggleSection(type)}
            >
              <div className="section-title">
                <span className="section-icon">{getTypeIcon(type)}</span>
                <span>{type === 'children' ? 'Children' : type === 'spouse' ? 'Partner' : type === 'parent' ? 'Parents' : type === 'friend' ? 'Friends' : 'Professional'}</span>
                <span className="section-count">{typeMembers.length}</span>
              </div>
              <span className={`expand-icon ${expandedSections.has(type) ? 'expanded' : ''}`}>
                ▶
              </span>
            </button>

            <div className={`section-content ${expandedSections.has(type) ? 'expanded' : ''}`}>
              {typeMembers.map((member) => (
                <Link
                  key={member.id}
                  href={`/relationships/${member.type}/${member.id}/profile`}
                  className={`member-item ${pathname.includes(member.id) ? 'active' : ''}`}
                  style={{ '--member-color': getTypeColor(type) } as React.CSSProperties}
                >
                  <div className="member-avatar" style={{ background: getTypeColor(type) }}>
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} />
                    ) : (
                      <span>{getTypeIcon(type)}</span>
                    )}
                    <div
                      className={`status-indicator ${member.hasActivePlan ? 'has-plan' : !member.hasProfile ? 'no-profile' : ''}`}
                      title={member.hasActivePlan ? 'Active plan' : !member.hasProfile ? 'Profile incomplete' : ''}
                    />
                  </div>
                  <div className="member-info">
                    <div className="member-name">{member.name}</div>
                    <div className="member-type">{type}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer - Add Member */}
      <div className="nav-footer">
        <Link href="/relationships/add" className="add-member-button">
          <span>+</span>
          Add Relationship
        </Link>
      </div>
    </nav>
  );
}
