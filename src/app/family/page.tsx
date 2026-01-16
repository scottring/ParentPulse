'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

/**
 * Family Operating Manual Dashboard
 *
 * The nuclear family as a meta-operating manual - a collection of individual manuals
 * Shows:
 * - Family-level insights and dynamics
 * - All relationship members grouped by type
 * - Active strategic plans across the family
 * - Quick actions and recent activity
 */

interface RelationshipMember {
  id: string;
  name: string;
  type: 'children' | 'spouse' | 'parent' | 'friend' | 'professional';
  avatarUrl?: string;
  hasProfile: boolean;
  hasActivePlan: boolean;
}

export default function FamilyDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  // Mock data - replace with actual data fetching
  const [members, setMembers] = useState<RelationshipMember[]>([
    {
      id: '1',
      name: 'Emma',
      type: 'children',
      hasProfile: true,
      hasActivePlan: true
    },
    {
      id: '2',
      name: 'Oliver',
      type: 'children',
      hasProfile: true,
      hasActivePlan: false
    },
    {
      id: '3',
      name: 'Sarah',
      type: 'spouse',
      hasProfile: false,
      hasActivePlan: false
    },
    {
      id: '4',
      name: 'Margaret',
      type: 'parent',
      hasProfile: true,
      hasActivePlan: true
    }
  ]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      children: '🌱',
      spouse: '💑',
      parent: '👵',
      friend: '🤝',
      professional: '💼'
    };
    return icons[type] || '👤';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      children: '#4a9d7f',
      spouse: '#c86b7a',
      parent: '#a594bd',
      friend: '#f0a660',
      professional: '#5d8396'
    };
    return colors[type] || '#6b7280';
  };

  const getTypeGradient = (type: string) => {
    const gradients: Record<string, string> = {
      children: 'linear-gradient(135deg, #4a9d7f 0%, #3a7a63 100%)',
      spouse: 'linear-gradient(135deg, #c86b7a 0%, #8b4049 100%)',
      parent: 'linear-gradient(135deg, #a594bd 0%, #7a6b8f 100%)',
      friend: 'linear-gradient(135deg, #f0a660 0%, #d97536 100%)',
      professional: 'linear-gradient(135deg, #5d8396 0%, #3d5a6b 100%)'
    };
    return gradients[type] || 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
  };

  const groupedMembers = members.reduce((acc, member) => {
    if (!acc[member.type]) acc[member.type] = [];
    acc[member.type].push(member);
    return acc;
  }, {} as Record<string, RelationshipMember[]>);

  const totalMembers = members.length;
  const profiledMembers = members.filter(m => m.hasProfile).length;
  const activePlans = members.filter(m => m.hasActivePlan).length;

  return (
    <div className="family-dashboard">
      <style jsx>{`
        .family-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #fafaf9 0%, #f0f7f4 100%);
          font-family: var(--font-body);
          position: relative;
        }

        /* Paper texture overlay */
        .family-dashboard::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
          opacity: 0.5;
          z-index: 0;
        }

        .dashboard-content {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        /* Hero Header */
        .hero-header {
          text-align: center;
          margin-bottom: 48px;
          animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-icon {
          font-size: 64px;
          margin-bottom: 16px;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .hero-title {
          font-family: var(--font-heading);
          font-size: 48px;
          font-weight: 700;
          color: #1e3a32;
          margin-bottom: 8px;
          line-height: 1.2;
        }

        .hero-subtitle {
          font-size: 18px;
          color: #5a7268;
          font-style: italic;
        }

        /* Stats Overview */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 48px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid #e7e5e4;
          animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        .stat-card:nth-child(1) { animation-delay: 0.05s; }
        .stat-card:nth-child(2) { animation-delay: 0.1s; }
        .stat-card:nth-child(3) { animation-delay: 0.15s; }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        .stat-value {
          font-size: 42px;
          font-weight: 700;
          font-family: var(--font-heading);
          color: #1e3a32;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #78716c;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Relationship Groups */
        .relationships-section {
          margin-top: 48px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .section-title {
          font-family: var(--font-heading);
          font-size: 32px;
          font-weight: 700;
          color: #1e3a32;
        }

        .view-all-link {
          color: #4a9d7f;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .view-all-link:hover {
          color: #3a7a63;
          text-decoration: underline;
        }

        .relationship-groups {
          display: grid;
          gap: 32px;
        }

        .relationship-group {
          animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        .group-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding: 0 8px;
        }

        .group-icon {
          font-size: 28px;
        }

        .group-title {
          font-size: 20px;
          font-weight: 700;
          color: #292524;
          font-family: var(--font-heading);
          flex: 1;
        }

        .group-count {
          font-size: 13px;
          color: #78716c;
          background: #f5f5f4;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 600;
        }

        .members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .member-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 2px solid transparent;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          display: block;
          position: relative;
          overflow: hidden;
        }

        .member-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--member-gradient);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .member-card:hover {
          border-color: var(--member-color);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }

        .member-card:hover::before {
          transform: scaleX(1);
        }

        .member-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .member-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--member-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          flex-shrink: 0;
          position: relative;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .member-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .status-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }

        .status-badge.active-plan {
          background: #4ade80;
        }

        .status-badge.no-profile {
          background: #fbbf24;
        }

        .member-info {
          flex: 1;
          min-width: 0;
        }

        .member-name {
          font-size: 18px;
          font-weight: 700;
          color: #292524;
          margin-bottom: 4px;
          font-family: var(--font-heading);
        }

        .member-type {
          font-size: 13px;
          color: #78716c;
          text-transform: capitalize;
        }

        .member-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .meta-badge {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .meta-badge.profile {
          background: #d1fae5;
          color: #065f46;
        }

        .meta-badge.no-profile {
          background: #fef3c7;
          color: #92400e;
        }

        .meta-badge.plan {
          background: #dbeafe;
          color: #1e40af;
        }

        /* Add Relationship CTA */
        .add-relationship-card {
          background: linear-gradient(135deg, #4a9d7f 0%, #3a7a63 100%);
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          color: white;
          border: 2px dashed rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
          cursor: pointer;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 180px;
        }

        .add-relationship-card:hover {
          border-color: rgba(255, 255, 255, 0.6);
          transform: scale(1.02);
          box-shadow: 0 8px 24px rgba(74, 157, 127, 0.3);
        }

        .add-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .add-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 4px;
          font-family: var(--font-heading);
        }

        .add-subtitle {
          font-size: 14px;
          opacity: 0.9;
        }
      `}</style>

      <div className="dashboard-content">
        {/* Hero Header */}
        <div className="hero-header">
          <div className="hero-icon">📚</div>
          <h1 className="hero-title">Kaufman Family</h1>
          <p className="hero-subtitle">Your Family Operating Manual</p>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👨‍👩‍👧‍👦</div>
            <div className="stat-value">{totalMembers}</div>
            <div className="stat-label">Family Members</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📖</div>
            <div className="stat-value">{profiledMembers}</div>
            <div className="stat-label">Profiles Created</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-value">{activePlans}</div>
            <div className="stat-label">Active Plans</div>
          </div>
        </div>

        {/* Relationships Section */}
        <div className="relationships-section">
          <div className="section-header">
            <h2 className="section-title">Your Relationships</h2>
            <Link href="/relationships" className="view-all-link">
              View All →
            </Link>
          </div>

          <div className="relationship-groups">
            {Object.entries(groupedMembers).map(([type, typeMembers], groupIndex) => (
              <div
                key={type}
                className="relationship-group"
                style={{ animationDelay: `${groupIndex * 0.1}s` }}
              >
                <div className="group-header">
                  <span className="group-icon">{getTypeIcon(type)}</span>
                  <h3 className="group-title">
                    {type === 'children' ? 'Children' :
                     type === 'spouse' ? 'Partner' :
                     type === 'parent' ? 'Parents' :
                     type === 'friend' ? 'Friends' : 'Professional'}
                  </h3>
                  <span className="group-count">{typeMembers.length}</span>
                </div>

                <div className="members-grid">
                  {typeMembers.map((member) => (
                    <Link
                      key={member.id}
                      href={`/relationships/${type}/${member.id}/profile`}
                      className="member-card"
                      style={{
                        '--member-color': getTypeColor(type),
                        '--member-gradient': getTypeGradient(type)
                      } as React.CSSProperties}
                    >
                      <div className="member-header">
                        <div className="member-avatar">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} />
                          ) : (
                            <span>{getTypeIcon(type)}</span>
                          )}
                          {member.hasActivePlan && (
                            <div className="status-badge active-plan">✓</div>
                          )}
                          {!member.hasProfile && (
                            <div className="status-badge no-profile">!</div>
                          )}
                        </div>
                        <div className="member-info">
                          <div className="member-name">{member.name}</div>
                          <div className="member-type">{type}</div>
                        </div>
                      </div>

                      <div className="member-meta">
                        {member.hasProfile ? (
                          <span className="meta-badge profile">Profile Complete</span>
                        ) : (
                          <span className="meta-badge no-profile">Create Profile</span>
                        )}
                        {member.hasActivePlan && (
                          <span className="meta-badge plan">Active Plan</span>
                        )}
                      </div>
                    </Link>
                  ))}

                  {/* Add New Member Card */}
                  <Link
                    href={`/relationships/add?type=${type}`}
                    className="add-relationship-card"
                  >
                    <div className="add-icon">+</div>
                    <div className="add-title">Add {type === 'children' ? 'Child' : type === 'spouse' ? 'Partner' : type === 'parent' ? 'Parent' : type === 'friend' ? 'Friend' : 'Contact'}</div>
                    <div className="add-subtitle">Create a new operating manual</div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
