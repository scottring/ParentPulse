'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRoleSection, useRoleSections } from '@/hooks/useRoleSection';
import { usePersonById } from '@/hooks/usePerson';
import { useRelationshipManual } from '@/hooks/useRelationshipManual';
import { RoleType, RoleSection, RelationshipManual } from '@/types/person-manual';

type ContentTab = 'overview' | 'triggers' | 'strategies' | 'boundaries' | 'context' | 'notes';

export default function RoleSectionPage({ params }: { params: Promise<{ personId: string; roleSectionId: string }> }) {
  const { personId, roleSectionId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { roleSection, loading: sectionLoading, error: sectionError } = useRoleSection(roleSectionId);
  const { getRelationshipBetween } = useRelationshipManual();
  const {
    addTrigger,
    removeTrigger,
    addStrategy,
    removeStrategy,
    addBoundary,
    removeBoundary,
    updateRoleSection,
    deleteRoleSection,
    addOverviewContribution,
    updateOverviewContribution,
    removeOverviewContribution
  } = useRoleSections(roleSection?.manualId);

  const [activeTab, setActiveTab] = useState<ContentTab>('overview');
  const [relationshipManual, setRelationshipManual] = useState<RelationshipManual | null>(null);
  const [loadingRelationship, setLoadingRelationship] = useState(false);

  // Check for relationship manual between this person and related person
  useEffect(() => {
    const fetchRelationshipManual = async () => {
      if (!roleSection?.relatedPersonId || !personId) return;

      setLoadingRelationship(true);
      try {
        const manual = await getRelationshipBetween(personId, roleSection.relatedPersonId);
        setRelationshipManual(manual);
      } catch (error) {
        console.error('Error fetching relationship manual:', error);
      } finally {
        setLoadingRelationship(false);
      }
    };

    fetchRelationshipManual();
  }, [roleSection?.relatedPersonId, personId, getRelationshipBetween]);
  const [showAddPerspective, setShowAddPerspective] = useState(false);
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null);
  const [newPerspective, setNewPerspective] = useState({
    perspective: '',
    relationshipToSubject: '',
    closenessWeight: 3 as 1 | 2 | 3 | 4 | 5
  });
  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [newTrigger, setNewTrigger] = useState({
    description: '',
    context: '',
    typicalResponse: '',
    deescalationStrategy: '',
    severity: 'moderate' as 'mild' | 'moderate' | 'significant'
  });
  const [showAddStrategy, setShowAddStrategy] = useState(false);
  const [strategyType, setStrategyType] = useState<'works' | 'doesnt'>('works');
  const [newStrategy, setNewStrategy] = useState({
    description: '',
    context: '',
    effectiveness: 3 as 1 | 2 | 3 | 4 | 5,
    sourceType: 'discovered' as 'discovered' | 'recommended' | 'professional' | 'knowledge_base',
    notes: ''
  });
  const [showAddBoundary, setShowAddBoundary] = useState(false);
  const [newBoundary, setNewBoundary] = useState({
    description: '',
    category: 'negotiable' as 'immovable' | 'negotiable' | 'preference',
    context: '',
    consequences: ''
  });
  const [contextSection, setContextSection] = useState<'strengths' | 'challenges' | 'context'>('strengths');
  const [newContextItem, setNewContextItem] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || personLoading || sectionLoading || !user || !person) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  // Handle error or missing role section
  if (sectionError || !roleSection) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="parent-card p-12 max-w-2xl text-center">
          <div className="text-6xl mb-4 opacity-40">⚠️</div>
          <h2 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
            {sectionError ? 'Error Loading Role Section' : 'Role Section Not Found'}
          </h2>
          <p className="text-base mb-6" style={{ color: 'var(--parent-text-light)' }}>
            {sectionError || 'This role section may have been deleted or you may not have permission to view it.'}
          </p>
          <Link
            href={`/people/${personId}/manual`}
            className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            ← Back to Manual
          </Link>
        </div>
      </div>
    );
  }

  const roleTypeEmojis: Record<RoleType, string> = {
    parent: '👨‍👩‍👧',
    child: '👶',
    spouse: '💑',
    sibling: '👫',
    friend: '🤝',
    professional: '💼',
    caregiver: '🩺',
    pet_owner: '🐾',
    other: '👤'
  };

  const tabs: Array<{ id: ContentTab; label: string; emoji: string; count?: number }> = [
    { id: 'overview', label: 'Overview', emoji: '📖' },
    { id: 'triggers', label: 'Triggers', emoji: '⚡', count: roleSection.triggers.length },
    { id: 'strategies', label: 'Strategies', emoji: '✨', count: roleSection.whatWorks.length + roleSection.whatDoesntWork.length },
    { id: 'boundaries', label: 'Boundaries', emoji: '🛡️', count: roleSection.boundaries?.length || 0 },
    { id: 'context', label: 'Context', emoji: '💡', count: roleSection.strengths.length + roleSection.challenges.length },
    { id: 'notes', label: 'Notes', emoji: '📝', count: roleSection.progressNotes.length }
  ];

  const handleAddTrigger = async () => {
    if (!newTrigger.description || !newTrigger.context || !newTrigger.typicalResponse) {
      alert('Please fill in required fields');
      return;
    }

    try {
      await addTrigger(roleSectionId, newTrigger);
      setNewTrigger({
        description: '',
        context: '',
        typicalResponse: '',
        deescalationStrategy: '',
        severity: 'moderate'
      });
      setShowAddTrigger(false);
    } catch (error) {
      console.error('Error adding trigger:', error);
      alert('Failed to add trigger');
    }
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;

    try {
      await removeTrigger(roleSectionId, triggerId);
    } catch (error) {
      console.error('Error deleting trigger:', error);
      alert('Failed to delete trigger');
    }
  };

  const handleAddStrategy = async () => {
    if (!newStrategy.description || !newStrategy.context) {
      alert('Please fill in required fields');
      return;
    }

    try {
      await addStrategy(roleSectionId, newStrategy, strategyType);
      setNewStrategy({
        description: '',
        context: '',
        effectiveness: 3,
        sourceType: 'discovered',
        notes: ''
      });
      setShowAddStrategy(false);
    } catch (error) {
      console.error('Error adding strategy:', error);
      alert('Failed to add strategy');
    }
  };

  const handleDeleteStrategy = async (strategyId: string, worksOrNot: 'works' | 'doesnt') => {
    if (!confirm('Are you sure you want to delete this strategy?')) return;

    try {
      await removeStrategy(roleSectionId, strategyId, worksOrNot);
    } catch (error) {
      console.error('Error deleting strategy:', error);
      alert('Failed to delete strategy');
    }
  };

  const handleAddBoundary = async () => {
    if (!newBoundary.description) {
      alert('Please provide a boundary description');
      return;
    }

    try {
      await addBoundary(roleSectionId, newBoundary);
      setNewBoundary({
        description: '',
        category: 'negotiable',
        context: '',
        consequences: ''
      });
      setShowAddBoundary(false);
    } catch (error) {
      console.error('Error adding boundary:', error);
      alert('Failed to add boundary');
    }
  };

  const handleDeleteBoundary = async (boundaryId: string) => {
    if (!confirm('Are you sure you want to delete this boundary?')) return;

    try {
      await removeBoundary(roleSectionId, boundaryId);
    } catch (error) {
      console.error('Error deleting boundary:', error);
      alert('Failed to delete boundary');
    }
  };

  const handleAddPerspective = async () => {
    if (!newPerspective.perspective.trim()) {
      alert('Please enter your perspective');
      return;
    }

    if (!user?.userId) {
      alert('User not authenticated');
      return;
    }

    try {
      await addOverviewContribution(roleSectionId, {
        contributorId: user.userId,
        perspective: newPerspective.perspective,
        relationshipToSubject: newPerspective.relationshipToSubject || undefined,
        closenessWeight: newPerspective.closenessWeight,
        isActive: true
      });

      setNewPerspective({
        perspective: '',
        relationshipToSubject: '',
        closenessWeight: 3
      });
      setShowAddPerspective(false);
    } catch (error) {
      console.error('Error adding perspective:', error);
      alert('Failed to add perspective');
    }
  };

  const handleUpdatePerspective = async (contributionId: string) => {
    if (!newPerspective.perspective.trim()) {
      alert('Please enter your perspective');
      return;
    }

    try {
      await updateOverviewContribution(roleSectionId, contributionId, {
        perspective: newPerspective.perspective,
        relationshipToSubject: newPerspective.relationshipToSubject || undefined,
        closenessWeight: newPerspective.closenessWeight
      });

      setNewPerspective({
        perspective: '',
        relationshipToSubject: '',
        closenessWeight: 3
      });
      setEditingContributionId(null);
    } catch (error) {
      console.error('Error updating perspective:', error);
      alert('Failed to update perspective');
    }
  };

  const handleDeletePerspective = async (contributionId: string) => {
    if (!confirm('Are you sure you want to delete this perspective?')) return;

    try {
      await removeOverviewContribution(roleSectionId, contributionId);
    } catch (error) {
      console.error('Error deleting perspective:', error);
      alert('Failed to delete perspective');
    }
  };

  const handleAddContextItem = async () => {
    if (!newContextItem.trim()) {
      alert('Please enter a value');
      return;
    }

    try {
      const updates: Partial<RoleSection> = {};
      if (contextSection === 'strengths') {
        updates.strengths = [...roleSection.strengths, newContextItem.trim()];
      } else if (contextSection === 'challenges') {
        updates.challenges = [...roleSection.challenges, newContextItem.trim()];
      } else {
        updates.importantContext = [...roleSection.importantContext, newContextItem.trim()];
      }

      await updateRoleSection(roleSectionId, updates);
      setNewContextItem('');
    } catch (error) {
      console.error('Error adding context item:', error);
      alert('Failed to add item');
    }
  };

  const handleDeleteContextItem = async (index: number, type: 'strengths' | 'challenges' | 'context') => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const updates: Partial<RoleSection> = {};
      if (type === 'strengths') {
        updates.strengths = roleSection.strengths.filter((_, i) => i !== index);
      } else if (type === 'challenges') {
        updates.challenges = roleSection.challenges.filter((_, i) => i !== index);
      } else {
        updates.importantContext = roleSection.importantContext.filter((_, i) => i !== index);
      }

      await updateRoleSection(roleSectionId, updates);
    } catch (error) {
      console.error('Error deleting context item:', error);
      alert('Failed to delete item');
    }
  };

  const handleDeleteRoleSection = async () => {
    if (!confirm(`Are you sure you want to delete this entire role section "${roleSection.roleTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteRoleSection(roleSectionId);
      // Navigate back to manual page after successful deletion
      router.push(`/people/${personId}/manual`);
    } catch (error) {
      console.error('Error deleting role section:', error);
      alert('Failed to delete role section. Please try again.');
    }
  };

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-start gap-4">
            <Link href={`/people/${personId}/manual`} className="text-2xl transition-transform hover:scale-110 mt-1">
              ←
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl">{roleTypeEmojis[roleSection.roleType]}</div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  {roleSection.roleTitle}
                </h1>
                <span
                  className="text-xs px-3 py-1 rounded-full capitalize"
                  style={{
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text-light)',
                    border: '1px solid var(--parent-border)'
                  }}
                >
                  {roleSection.roleType}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                {roleSection.roleDescription}
              </p>
              {/* Link to relationship manual if one exists */}
              {relationshipManual && (
                <Link
                  href={`/relationships/${relationshipManual.relationshipId}`}
                  className="inline-flex items-center gap-2 mt-3 text-sm px-4 py-2 rounded-lg transition-all hover:shadow-md"
                  style={{
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-accent)',
                    border: '1px solid var(--parent-border)'
                  }}
                >
                  <span>📖</span>
                  <span>→ See {relationshipManual.relationshipTitle}</span>
                </Link>
              )}
            </div>
            <button
              onClick={handleDeleteRoleSection}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md flex items-center gap-2"
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: '1px solid #b91c1c'
              }}
              title="Delete this role section"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Delete Role</span>
            </button>
          </div>
        </div>
      </header>

      {/* Discovery Banner - Create Relationship Manual */}
      {roleSection.relatedPersonId && !loadingRelationship && !relationshipManual && (
        <div className="border-b" style={{ borderColor: 'var(--parent-border)', backgroundColor: '#FFF9E6' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">💡</div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--parent-text)' }}>
                    Want to create a shared relationship manual?
                  </p>
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    Track shared goals, rituals, and relationship dynamics with {roleSection.relatedPersonName || 'them'} in one place.
                  </p>
                </div>
              </div>
              <Link
                href={`/relationships/create?participants=${personId},${roleSection.relatedPersonId}`}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:shadow-lg whitespace-nowrap"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                Create Manual
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id ? 'border-current' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{ color: activeTab === tab.id ? 'var(--parent-accent)' : 'var(--parent-text)' }}
              >
                <span className="mr-2">{tab.emoji}</span>
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className="ml-2 px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: activeTab === tab.id ? 'var(--parent-accent)' : 'var(--parent-border)',
                      color: activeTab === tab.id ? 'white' : 'var(--parent-text-light)'
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                Perspectives on {person.name}
              </h2>
              {!showAddPerspective && !editingContributionId && (
                <button
                  onClick={() => setShowAddPerspective(true)}
                  className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md flex items-center gap-2"
                  style={{ backgroundColor: 'var(--parent-accent)', color: 'white' }}
                >
                  <span>+</span>
                  <span>Add Your Perspective</span>
                </button>
              )}
            </div>

            {/* Legacy Overview (if exists) */}
            {roleSection.roleOverview && (
              <div className="parent-card p-6 mb-4" style={{ borderLeft: '4px solid var(--parent-secondary)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📜</span>
                  <h3 className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                    Original Overview
                  </h3>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text-light)' }}
                  >
                    Legacy
                  </span>
                </div>
                <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--parent-text)' }}>
                  {roleSection.roleOverview}
                </p>
              </div>
            )}

            {/* Add Perspective Form */}
            {showAddPerspective && (
              <div className="parent-card p-6 mb-4 animate-fade-in-up">
                <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--parent-text)' }}>
                  Add Your Perspective
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                      Your perspective on {person.name}
                    </label>
                    <textarea
                      value={newPerspective.perspective}
                      onChange={(e) => setNewPerspective({ ...newPerspective, perspective: e.target.value })}
                      rows={6}
                      placeholder={`Share your unique perspective on ${person.name}. What do you see that others might not? What matters most in your relationship?`}
                      className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                      style={{
                        borderColor: 'var(--parent-border)',
                        backgroundColor: 'var(--parent-bg)',
                        color: 'var(--parent-text)'
                      }}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                        Your relationship to {person.name} (optional)
                      </label>
                      <input
                        type="text"
                        value={newPerspective.relationshipToSubject}
                        onChange={(e) => setNewPerspective({ ...newPerspective, relationshipToSubject: e.target.value })}
                        placeholder="e.g., Parent, Spouse, Therapist, Teacher"
                        className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                        style={{
                          borderColor: 'var(--parent-border)',
                          backgroundColor: 'var(--parent-bg)',
                          color: 'var(--parent-text)'
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                        Relationship closeness
                      </label>
                      <div className="flex items-center gap-3">
                        {[1, 2, 3, 4, 5].map((weight) => (
                          <button
                            key={weight}
                            onClick={() => setNewPerspective({ ...newPerspective, closenessWeight: weight as 1 | 2 | 3 | 4 | 5 })}
                            className="w-10 h-10 rounded-full font-semibold transition-all hover:scale-110"
                            style={{
                              backgroundColor: newPerspective.closenessWeight === weight ? 'var(--parent-accent)' : 'var(--parent-bg)',
                              color: newPerspective.closenessWeight === weight ? 'white' : 'var(--parent-text-light)',
                              border: `2px solid ${newPerspective.closenessWeight === weight ? 'var(--parent-accent)' : 'var(--parent-border)'}`
                            }}
                          >
                            {weight}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--parent-text-light)' }}>
                        1 = Distant/Professional, 5 = Closest/Most Important
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleAddPerspective}
                    className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: 'var(--parent-accent)' }}
                  >
                    Add Perspective
                  </button>
                  <button
                    onClick={() => {
                      setShowAddPerspective(false);
                      setNewPerspective({ perspective: '', relationshipToSubject: '', closenessWeight: 3 });
                    }}
                    className="px-6 py-2 rounded-lg font-medium transition-all hover:shadow-md"
                    style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Edit Perspective Form */}
            {editingContributionId && (
              <div className="parent-card p-6 mb-4 animate-fade-in-up">
                <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--parent-text)' }}>
                  Edit Your Perspective
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                      Your perspective on {person.name}
                    </label>
                    <textarea
                      value={newPerspective.perspective}
                      onChange={(e) => setNewPerspective({ ...newPerspective, perspective: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                      style={{
                        borderColor: 'var(--parent-border)',
                        backgroundColor: 'var(--parent-bg)',
                        color: 'var(--parent-text)'
                      }}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                        Your relationship to {person.name} (optional)
                      </label>
                      <input
                        type="text"
                        value={newPerspective.relationshipToSubject}
                        onChange={(e) => setNewPerspective({ ...newPerspective, relationshipToSubject: e.target.value })}
                        placeholder="e.g., Parent, Spouse, Therapist, Teacher"
                        className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                        style={{
                          borderColor: 'var(--parent-border)',
                          backgroundColor: 'var(--parent-bg)',
                          color: 'var(--parent-text)'
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                        Relationship closeness
                      </label>
                      <div className="flex items-center gap-3">
                        {[1, 2, 3, 4, 5].map((weight) => (
                          <button
                            key={weight}
                            onClick={() => setNewPerspective({ ...newPerspective, closenessWeight: weight as 1 | 2 | 3 | 4 | 5 })}
                            className="w-10 h-10 rounded-full font-semibold transition-all hover:scale-110"
                            style={{
                              backgroundColor: newPerspective.closenessWeight === weight ? 'var(--parent-accent)' : 'var(--parent-bg)',
                              color: newPerspective.closenessWeight === weight ? 'white' : 'var(--parent-text-light)',
                              border: `2px solid ${newPerspective.closenessWeight === weight ? 'var(--parent-accent)' : 'var(--parent-border)'}`
                            }}
                          >
                            {weight}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--parent-text-light)' }}>
                        1 = Distant/Professional, 5 = Closest/Most Important
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleUpdatePerspective(editingContributionId)}
                    className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: 'var(--parent-accent)' }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingContributionId(null);
                      setNewPerspective({ perspective: '', relationshipToSubject: '', closenessWeight: 3 });
                    }}
                    className="px-6 py-2 rounded-lg font-medium transition-all hover:shadow-md"
                    style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Existing Perspectives */}
            <div className="space-y-4">
              {roleSection.roleOverviewContributions && roleSection.roleOverviewContributions.length > 0 ? (
                roleSection.roleOverviewContributions
                  .filter(c => c.isActive)
                  .sort((a, b) => (b.closenessWeight || 0) - (a.closenessWeight || 0))
                  .map((contribution) => (
                    <div
                      key={contribution.id}
                      className="parent-card p-6 animate-fade-in-up"
                      style={{
                        borderLeft: `4px solid ${
                          (contribution.closenessWeight || 3) >= 4
                            ? 'var(--parent-accent)'
                            : 'var(--parent-secondary)'
                        }`
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                                {contribution.contributorName}
                              </h3>
                              {contribution.relationshipToSubject && (
                                <span
                                  className="text-xs px-2 py-1 rounded-full"
                                  style={{
                                    backgroundColor: 'var(--parent-bg)',
                                    color: 'var(--parent-text-light)',
                                    border: '1px solid var(--parent-border)'
                                  }}
                                >
                                  {contribution.relationshipToSubject}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <span
                                    key={i}
                                    className="text-sm"
                                    style={{
                                      color: i <= (contribution.closenessWeight || 3)
                                        ? 'var(--parent-accent)'
                                        : 'var(--parent-border)'
                                    }}
                                  >
                                    ●
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                                Closeness: {contribution.closenessWeight || 3}/5
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingContributionId(contribution.id);
                              setNewPerspective({
                                perspective: contribution.perspective,
                                relationshipToSubject: contribution.relationshipToSubject || '',
                                closenessWeight: contribution.closenessWeight || 3
                              });
                            }}
                            className="px-3 py-1 text-sm rounded-lg transition-all hover:shadow-md"
                            style={{
                              border: '1px solid var(--parent-border)',
                              color: 'var(--parent-text-light)'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePerspective(contribution.id)}
                            className="px-3 py-1 text-sm rounded-lg transition-all hover:shadow-md"
                            style={{
                              border: '1px solid #ef4444',
                              color: '#ef4444'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--parent-text)' }}>
                        {contribution.perspective}
                      </p>

                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--parent-border)' }}>
                        <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                          Added {contribution.addedAt.toDate().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                          {contribution.updatedAt.toMillis() > contribution.addedAt.toMillis() &&
                            ` • Updated ${contribution.updatedAt.toDate().toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}`
                          }
                        </p>
                      </div>
                    </div>
                  ))
              ) : !roleSection.roleOverview ? (
                <div className="parent-card p-12 text-center">
                  <div className="text-6xl mb-4 opacity-40">👥</div>
                  <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
                    No Perspectives Yet
                  </h3>
                  <p className="text-base mb-6 max-w-md mx-auto" style={{ color: 'var(--parent-text-light)' }}>
                    Family members can add their unique perspectives on {person.name}. Each viewpoint helps create a richer, more complete understanding.
                  </p>
                  <button
                    onClick={() => setShowAddPerspective(true)}
                    className="px-8 py-4 rounded-lg font-semibold text-white transition-all hover:shadow-lg inline-flex items-center gap-2"
                    style={{ backgroundColor: 'var(--parent-accent)' }}
                  >
                    <span>+</span>
                    <span>Add First Perspective</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Triggers Tab */}
        {activeTab === 'triggers' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                Triggers & Patterns
              </h2>
              <button
                onClick={() => setShowAddTrigger(true)}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md"
                style={{ backgroundColor: 'var(--parent-accent)', color: 'white' }}
              >
                + Add Trigger
              </button>
            </div>

            {/* Add Trigger Form */}
            {showAddTrigger && (
              <div className="parent-card p-6 mb-6">
                <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--parent-text)' }}>
                  Add New Trigger
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Description *
                    </label>
                    <input
                      type="text"
                      value={newTrigger.description}
                      onChange={(e) => setNewTrigger({ ...newTrigger, description: e.target.value })}
                      placeholder="What causes this reaction?"
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Context *
                    </label>
                    <input
                      type="text"
                      value={newTrigger.context}
                      onChange={(e) => setNewTrigger({ ...newTrigger, context: e.target.value })}
                      placeholder="When/where does this happen?"
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Typical Response *
                    </label>
                    <textarea
                      value={newTrigger.typicalResponse}
                      onChange={(e) => setNewTrigger({ ...newTrigger, typicalResponse: e.target.value })}
                      placeholder="How do they usually react?"
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      De-escalation Strategy
                    </label>
                    <textarea
                      value={newTrigger.deescalationStrategy}
                      onChange={(e) => setNewTrigger({ ...newTrigger, deescalationStrategy: e.target.value })}
                      placeholder="What helps calm the situation?"
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Severity
                    </label>
                    <div className="flex gap-3">
                      {(['mild', 'moderate', 'significant'] as const).map((severity) => (
                        <button
                          key={severity}
                          onClick={() => setNewTrigger({ ...newTrigger, severity })}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            newTrigger.severity === severity ? 'ring-2' : ''
                          }`}
                          style={{
                            backgroundColor: newTrigger.severity === severity ? 'var(--parent-accent)' : 'var(--parent-bg)',
                            color: newTrigger.severity === severity ? 'white' : 'var(--parent-text)',
                            border: '1px solid var(--parent-border)'
                          }}
                        >
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleAddTrigger}
                    className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: 'var(--parent-accent)' }}
                  >
                    Add Trigger
                  </button>
                  <button
                    onClick={() => {
                      setShowAddTrigger(false);
                      setNewTrigger({
                        description: '',
                        context: '',
                        typicalResponse: '',
                        deescalationStrategy: '',
                        severity: 'moderate'
                      });
                    }}
                    className="px-6 py-2 rounded-lg font-medium transition-all hover:shadow-md"
                    style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Triggers List */}
            {roleSection.triggers.length === 0 ? (
              <div className="parent-card p-12 text-center">
                <div className="text-6xl mb-4 opacity-40">⚡</div>
                <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
                  No Triggers Yet
                </h3>
                <p className="text-base mb-6 max-w-md mx-auto" style={{ color: 'var(--parent-text-light)' }}>
                  Add triggers to track what causes challenges or stress for {person.name}.
                </p>
                <button
                  onClick={() => setShowAddTrigger(true)}
                  className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                  style={{ backgroundColor: 'var(--parent-accent)' }}
                >
                  Add First Trigger
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {roleSection.triggers.map((trigger, index) => (
                  <div key={trigger.id} className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                          style={{
                            backgroundColor: trigger.severity === 'significant' ? '#fee2e2' :
                                           trigger.severity === 'moderate' ? '#fef3c7' : '#dbeafe',
                            color: trigger.severity === 'significant' ? '#991b1b' :
                                   trigger.severity === 'moderate' ? '#92400e' : '#1e40af'
                          }}
                        >
                          {trigger.severity}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-2" style={{ color: 'var(--parent-text)' }}>
                            {trigger.description}
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p style={{ color: 'var(--parent-text-light)' }}>
                              <strong>Context:</strong> {trigger.context}
                            </p>
                            <p style={{ color: 'var(--parent-text-light)' }}>
                              <strong>Typical Response:</strong> {trigger.typicalResponse}
                            </p>
                            {trigger.deescalationStrategy && (
                              <p style={{ color: 'var(--parent-text-light)' }}>
                                <strong>De-escalation:</strong> {trigger.deescalationStrategy}
                              </p>
                            )}
                          </div>
                          <p className="text-xs mt-3" style={{ color: 'var(--parent-text-light)' }}>
                            Added {trigger.identifiedDate.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTrigger(trigger.id)}
                        className="text-red-500 hover:text-red-700 transition-colors ml-4"
                        title="Delete trigger"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Strategies Tab */}
        {activeTab === 'strategies' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                Strategies
              </h2>
              <button
                onClick={() => setShowAddStrategy(true)}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md"
                style={{ backgroundColor: 'var(--parent-accent)', color: 'white' }}
              >
                + Add Strategy
              </button>
            </div>

            {/* Add Strategy Form */}
            {showAddStrategy && (
              <div className="parent-card p-6 mb-6">
                <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--parent-text)' }}>
                  Add New Strategy
                </h3>

                {/* Strategy Type Toggle */}
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={() => setStrategyType('works')}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      strategyType === 'works' ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: strategyType === 'works' ? 'var(--parent-accent)' : 'var(--parent-bg)',
                      color: strategyType === 'works' ? 'white' : 'var(--parent-text)',
                      border: '1px solid var(--parent-border)'
                    }}
                  >
                    ✨ What Works
                  </button>
                  <button
                    onClick={() => setStrategyType('doesnt')}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      strategyType === 'doesnt' ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: strategyType === 'doesnt' ? '#dc2626' : 'var(--parent-bg)',
                      color: strategyType === 'doesnt' ? 'white' : 'var(--parent-text)',
                      border: '1px solid var(--parent-border)'
                    }}
                  >
                    🚫 What Doesn't Work
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Strategy *
                    </label>
                    <input
                      type="text"
                      value={newStrategy.description}
                      onChange={(e) => setNewStrategy({ ...newStrategy, description: e.target.value })}
                      placeholder="What is the strategy or approach?"
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Context *
                    </label>
                    <input
                      type="text"
                      value={newStrategy.context}
                      onChange={(e) => setNewStrategy({ ...newStrategy, context: e.target.value })}
                      placeholder="When to use this strategy?"
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    />
                  </div>

                  {strategyType === 'works' && (
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                        Effectiveness
                      </label>
                      <div className="flex gap-2">
                        {([1, 2, 3, 4, 5] as const).map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setNewStrategy({ ...newStrategy, effectiveness: rating })}
                            className={`w-12 h-12 rounded-lg font-bold transition-all ${
                              newStrategy.effectiveness === rating ? 'ring-2 scale-110' : ''
                            }`}
                            style={{
                              backgroundColor: newStrategy.effectiveness === rating ? 'var(--parent-accent)' : 'var(--parent-bg)',
                              color: newStrategy.effectiveness === rating ? 'white' : 'var(--parent-text)',
                              border: '1px solid var(--parent-border)'
                            }}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--parent-text-light)' }}>
                        1 = Rarely works, 5 = Very effective
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Source
                    </label>
                    <select
                      value={newStrategy.sourceType}
                      onChange={(e) => setNewStrategy({ ...newStrategy, sourceType: e.target.value as any })}
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    >
                      <option value="discovered">Discovered through experience</option>
                      <option value="recommended">Recommended by someone</option>
                      <option value="professional">Professional advice</option>
                      <option value="knowledge_base">From knowledge base</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Notes
                    </label>
                    <textarea
                      value={newStrategy.notes}
                      onChange={(e) => setNewStrategy({ ...newStrategy, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleAddStrategy}
                    className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: 'var(--parent-accent)' }}
                  >
                    Add Strategy
                  </button>
                  <button
                    onClick={() => {
                      setShowAddStrategy(false);
                      setNewStrategy({
                        description: '',
                        context: '',
                        effectiveness: 3,
                        sourceType: 'discovered',
                        notes: ''
                      });
                    }}
                    className="px-6 py-2 rounded-lg font-medium transition-all hover:shadow-md"
                    style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* What Works Section */}
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
                <span>✨</span> What Works ({roleSection.whatWorks.length})
              </h3>
              {roleSection.whatWorks.length === 0 ? (
                <div className="parent-card p-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    No strategies yet. Add what works for {person.name}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roleSection.whatWorks.map((strategy, index) => (
                    <div key={strategy.id} className="parent-card p-4 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                              {strategy.description}
                            </h4>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span
                                  key={i}
                                  className={i < strategy.effectiveness ? 'opacity-100' : 'opacity-20'}
                                  style={{ color: 'var(--parent-accent)' }}
                                >
                                  ⭐
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                            <strong>When:</strong> {strategy.context}
                          </p>
                          {strategy.notes && (
                            <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                              <strong>Notes:</strong> {strategy.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--parent-text-light)' }}>
                            <span className="capitalize">{strategy.sourceType.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>Added {strategy.addedDate.toDate().toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteStrategy(strategy.id, 'works')}
                          className="text-red-500 hover:text-red-700 transition-colors ml-4"
                          title="Delete strategy"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* What Doesn't Work Section */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
                <span>🚫</span> What Doesn't Work ({roleSection.whatDoesntWork.length})
              </h3>
              {roleSection.whatDoesntWork.length === 0 ? (
                <div className="parent-card p-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    No strategies yet. Add what doesn't work for {person.name}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roleSection.whatDoesntWork.map((strategy, index) => (
                    <div key={strategy.id} className="parent-card p-4 border-l-4 animate-fade-in-up" style={{ borderLeftColor: '#dc2626', animationDelay: `${index * 0.05}s` }}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                            {strategy.description}
                          </h4>
                          <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                            <strong>When:</strong> {strategy.context}
                          </p>
                          {strategy.notes && (
                            <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                              <strong>Notes:</strong> {strategy.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--parent-text-light)' }}>
                            <span className="capitalize">{strategy.sourceType.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>Added {strategy.addedDate.toDate().toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteStrategy(strategy.id, 'doesnt')}
                          className="text-red-500 hover:text-red-700 transition-colors ml-4"
                          title="Delete strategy"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Boundaries Tab */}
        {activeTab === 'boundaries' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                Boundaries & Limits
              </h2>
              <button
                onClick={() => setShowAddBoundary(true)}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md"
                style={{ backgroundColor: 'var(--parent-accent)', color: 'white' }}
              >
                + Add Boundary
              </button>
            </div>

            {/* Add Boundary Form */}
            {showAddBoundary && (
              <div className="parent-card p-6 mb-6">
                <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--parent-text)' }}>
                  Add New Boundary
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Boundary *
                    </label>
                    <input
                      type="text"
                      value={newBoundary.description}
                      onChange={(e) => setNewBoundary({ ...newBoundary, description: e.target.value })}
                      placeholder="What is the boundary?"
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                      Category
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['immovable', 'negotiable', 'preference'] as const).map((category) => (
                        <button
                          key={category}
                          onClick={() => setNewBoundary({ ...newBoundary, category })}
                          className={`px-4 py-3 rounded-lg font-medium transition-all ${
                            newBoundary.category === category ? 'ring-2' : ''
                          }`}
                          style={{
                            backgroundColor: newBoundary.category === category
                              ? (category === 'immovable' ? '#dc2626' : category === 'negotiable' ? 'var(--parent-accent)' : '#9ca3af')
                              : 'var(--parent-bg)',
                            color: newBoundary.category === category ? 'white' : 'var(--parent-text)',
                            border: '1px solid var(--parent-border)'
                          }}
                        >
                          <div className="text-center">
                            <div className="text-xl mb-1">
                              {category === 'immovable' ? '🛑' : category === 'negotiable' ? '⚖️' : '💭'}
                            </div>
                            <div className="text-sm capitalize">{category}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Context
                    </label>
                    <textarea
                      value={newBoundary.context}
                      onChange={(e) => setNewBoundary({ ...newBoundary, context: e.target.value })}
                      placeholder="When does this boundary apply? Any important context..."
                      rows={2}
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Consequences
                    </label>
                    <textarea
                      value={newBoundary.consequences}
                      onChange={(e) => setNewBoundary({ ...newBoundary, consequences: e.target.value })}
                      placeholder="What happens if this boundary is crossed?"
                      rows={2}
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleAddBoundary}
                    className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: 'var(--parent-accent)' }}
                  >
                    Add Boundary
                  </button>
                  <button
                    onClick={() => {
                      setShowAddBoundary(false);
                      setNewBoundary({
                        description: '',
                        category: 'negotiable',
                        context: '',
                        consequences: ''
                      });
                    }}
                    className="px-6 py-2 rounded-lg font-medium transition-all hover:shadow-md"
                    style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Boundaries List */}
            {(roleSection.boundaries || []).length === 0 ? (
              <div className="parent-card p-12 text-center">
                <div className="text-6xl mb-4 opacity-40">🛡️</div>
                <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
                  No Boundaries Yet
                </h3>
                <p className="text-base mb-6 max-w-md mx-auto" style={{ color: 'var(--parent-text-light)' }}>
                  Add boundaries to track important limits and respect markers for {person.name}.
                </p>
                <button
                  onClick={() => setShowAddBoundary(true)}
                  className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                  style={{ backgroundColor: 'var(--parent-accent)' }}
                >
                  Add First Boundary
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(roleSection.boundaries || []).map((boundary, index) => (
                  <div
                    key={boundary.id}
                    className="parent-card p-6 border-l-4 animate-fade-in-up"
                    style={{
                      borderLeftColor: boundary.category === 'immovable' ? '#dc2626' :
                                      boundary.category === 'negotiable' ? 'var(--parent-accent)' : '#9ca3af',
                      animationDelay: `${index * 0.05}s`
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className="px-3 py-1 rounded-full text-xs font-medium capitalize flex items-center gap-1"
                            style={{
                              backgroundColor: boundary.category === 'immovable' ? '#fee2e2' :
                                             boundary.category === 'negotiable' ? '#dbeafe' : '#f3f4f6',
                              color: boundary.category === 'immovable' ? '#991b1b' :
                                     boundary.category === 'negotiable' ? '#1e40af' : '#374151'
                            }}
                          >
                            <span>{boundary.category === 'immovable' ? '🛑' : boundary.category === 'negotiable' ? '⚖️' : '💭'}</span>
                            <span>{boundary.category}</span>
                          </div>
                        </div>
                        <h4 className="font-semibold text-lg mb-3" style={{ color: 'var(--parent-text)' }}>
                          {boundary.description}
                        </h4>
                        {boundary.context && (
                          <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                            <strong>Context:</strong> {boundary.context}
                          </p>
                        )}
                        {boundary.consequences && (
                          <p className="text-sm mb-3" style={{ color: 'var(--parent-text-light)' }}>
                            <strong>Consequences:</strong> {boundary.consequences}
                          </p>
                        )}
                        <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                          Added {boundary.addedDate.toDate().toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBoundary(boundary.id)}
                        className="text-red-500 hover:text-red-700 transition-colors ml-4"
                        title="Delete boundary"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Context Tab (Strengths, Challenges, Important Context) */}
        {activeTab === 'context' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                Context & Notes
              </h2>
            </div>

            {/* Section Selector */}
            <div className="flex gap-2 mb-6">
              {[
                { id: 'strengths' as const, label: 'Strengths', emoji: '💪', count: roleSection.strengths.length },
                { id: 'challenges' as const, label: 'Challenges', emoji: '⚠️', count: roleSection.challenges.length },
                { id: 'context' as const, label: 'Important Context', emoji: '💡', count: roleSection.importantContext.length }
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => setContextSection(section.id)}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    contextSection === section.id ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: contextSection === section.id ? 'var(--parent-accent)' : 'var(--parent-bg)',
                    color: contextSection === section.id ? 'white' : 'var(--parent-text)',
                    border: '1px solid var(--parent-border)'
                  }}
                >
                  <span className="mr-2">{section.emoji}</span>
                  {section.label}
                  <span
                    className="ml-2 px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: contextSection === section.id ? 'rgba(255,255,255,0.2)' : 'var(--parent-border)'
                    }}
                  >
                    {section.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Add Item Form */}
            <div className="parent-card p-6 mb-6">
              <h3 className="font-semibold text-base mb-3" style={{ color: 'var(--parent-text)' }}>
                Add {contextSection === 'strengths' ? 'Strength' : contextSection === 'challenges' ? 'Challenge' : 'Context Note'}
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newContextItem}
                  onChange={(e) => setNewContextItem(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddContextItem();
                  }}
                  placeholder={
                    contextSection === 'strengths' ? 'Enter a strength...' :
                    contextSection === 'challenges' ? 'Enter a challenge...' :
                    'Enter important context...'
                  }
                  className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                />
                <button
                  onClick={handleAddContextItem}
                  className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:shadow-lg whitespace-nowrap"
                  style={{ backgroundColor: 'var(--parent-accent)' }}
                >
                  Add
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--parent-text-light)' }}>
                Press Enter to add
              </p>
            </div>

            {/* Items List */}
            {contextSection === 'strengths' && (
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
                  <span>💪</span> Strengths ({roleSection.strengths.length})
                </h3>
                {roleSection.strengths.length === 0 ? (
                  <div className="parent-card p-8 text-center">
                    <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                      No strengths yet. Add {person.name}'s core strengths.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roleSection.strengths.map((strength, index) => (
                      <div key={index} className="parent-card p-4 flex justify-between items-center animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                        <p style={{ color: 'var(--parent-text)' }}>{strength}</p>
                        <button
                          onClick={() => handleDeleteContextItem(index, 'strengths')}
                          className="text-red-500 hover:text-red-700 transition-colors ml-4"
                          title="Delete strength"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {contextSection === 'challenges' && (
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
                  <span>⚠️</span> Challenges ({roleSection.challenges.length})
                </h3>
                {roleSection.challenges.length === 0 ? (
                  <div className="parent-card p-8 text-center">
                    <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                      No challenges yet. Add areas of difficulty for {person.name}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roleSection.challenges.map((challenge, index) => (
                      <div key={index} className="parent-card p-4 flex justify-between items-center border-l-4 animate-fade-in-up" style={{ borderLeftColor: '#f59e0b', animationDelay: `${index * 0.05}s` }}>
                        <p style={{ color: 'var(--parent-text)' }}>{challenge}</p>
                        <button
                          onClick={() => handleDeleteContextItem(index, 'challenges')}
                          className="text-red-500 hover:text-red-700 transition-colors ml-4"
                          title="Delete challenge"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {contextSection === 'context' && (
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
                  <span>💡</span> Important Context ({roleSection.importantContext.length})
                </h3>
                {roleSection.importantContext.length === 0 ? (
                  <div className="parent-card p-8 text-center">
                    <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                      No context notes yet. Add important facts about {person.name}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roleSection.importantContext.map((context, index) => (
                      <div key={index} className="parent-card p-4 flex justify-between items-center animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                        <p style={{ color: 'var(--parent-text)' }}>{context}</p>
                        <button
                          onClick={() => handleDeleteContextItem(index, 'context')}
                          className="text-red-500 hover:text-red-700 transition-colors ml-4"
                          title="Delete context note"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Other tabs - Coming soon */}
        {activeTab !== 'overview' && activeTab !== 'triggers' && activeTab !== 'strategies' && activeTab !== 'boundaries' && activeTab !== 'context' && (
          <div className="parent-card p-12 text-center animate-fade-in-up">
            <div className="text-6xl mb-4 opacity-40">
              {tabs.find(t => t.id === activeTab)?.emoji}
            </div>
            <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
              {tabs.find(t => t.id === activeTab)?.label} Management
            </h3>
            <p className="text-base mb-6 max-w-md mx-auto" style={{ color: 'var(--parent-text-light)' }}>
              This content management interface is being built. For now, content is populated through the onboarding wizard.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
