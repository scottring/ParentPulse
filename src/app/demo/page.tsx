/**
 * Demo Page - Person-Centric Operating Manual System
 *
 * Shows the new architecture in action:
 * 1. Add people to the family (Scott, Iris, Ella, Caleb)
 * 2. Create a manual for each person
 * 3. Add role sections to manuals (e.g., "Scott as Father to Ella")
 * 4. Collaborative editing - both people in the role can contribute
 */

'use client';

import { useState } from 'react';
import { usePerson } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useRoleSections } from '@/hooks/useRoleSection';
import { RoleType } from '@/types/person-manual';

export default function DemoPage() {
  const { people, addPerson, loading: peopleLoading } = usePerson();
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const { manual, createManual, loading: manualLoading } = usePersonManual(selectedPersonId);
  const { roleSections, createRoleSection, deleteRoleSection, addTrigger, addStrategy } = useRoleSections(manual?.manualId);

  const [newPersonName, setNewPersonName] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleType, setNewRoleType] = useState<RoleType>('parent');
  const [relatedPersonId, setRelatedPersonId] = useState('');

  // Add a new person
  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;

    try {
      await addPerson({
        name: newPersonName,
        pronouns: undefined,
        childData: undefined
      });
      setNewPersonName('');
      alert(`Added ${newPersonName}!`);
    } catch (err) {
      alert('Failed to add person');
    }
  };

  // Create manual for selected person
  const handleCreateManual = async () => {
    if (!selectedPersonId) return;

    const person = people.find(p => p.personId === selectedPersonId);
    if (!person) return;

    try {
      const manualId = await createManual(person.personId, person.name);
      alert(`Created manual for ${person.name}! Manual ID: ${manualId}`);
    } catch (err) {
      alert('Failed to create manual');
    }
  };

  // Add a role section
  const handleAddRoleSection = async () => {
    if (!manual || !newRoleTitle.trim()) return;

    const relatedPerson = relatedPersonId ? people.find(p => p.personId === relatedPersonId) : undefined;

    try {
      await createRoleSection({
        manualId: manual.manualId,
        familyId: manual.familyId,
        roleType: newRoleType,
        roleTitle: newRoleTitle,
        roleDescription: `${manual.personName} in the role of ${newRoleTitle}`,
        relatedPersonId: relatedPersonId || undefined,
        relatedPersonName: relatedPerson?.name,
        contributors: relatedPersonId ? [manual.personId, relatedPersonId] : [manual.personId],
        contributorNames: relatedPersonId ? [manual.personName, relatedPerson!.name] : [manual.personName],
        triggers: [],
        whatWorks: [],
        whatDoesntWork: [],
        strengths: [],
        challenges: [],
        importantContext: [],
        emergingPatterns: [],
        progressNotes: [],
        relatedJournalEntries: [],
        relatedKnowledgeIds: []
      });

      setNewRoleTitle('');
      setRelatedPersonId('');
      alert(`Added role section: ${newRoleTitle}!`);
    } catch (err) {
      alert('Failed to add role section');
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontSize: '36px', fontFamily: 'var(--font-heading)', marginBottom: '32px', color: '#1e3a32' }}>
        🧪 Person-Centric Operating Manual Demo
      </h1>

      {/* Step 1: Add People */}
      <section style={{ marginBottom: '48px', padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#2d5f4e' }}>
          Step 1: Add People to Your Family
        </h2>
        <p style={{ marginBottom: '16px', color: '#57534e' }}>
          Add Scott, Iris, Ella, and Caleb (or whoever you want!)
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <input
            type="text"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            placeholder="Person's name"
            style={{ flex: 1, padding: '12px', border: '2px solid #d6d3d1', borderRadius: '8px', fontSize: '16px' }}
          />
          <button
            onClick={handleAddPerson}
            style={{ padding: '12px 24px', background: '#4a9d7f', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Add Person
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {people.map(person => (
            <div
              key={person.personId}
              onClick={() => setSelectedPersonId(person.personId)}
              style={{
                padding: '16px',
                background: selectedPersonId === person.personId ? '#e0f2fe' : '#f5f5f4',
                border: selectedPersonId === person.personId ? '2px solid #4a9d7f' : '2px solid transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{person.name}</div>
              <div style={{ fontSize: '13px', color: '#78716c' }}>
                {person.hasManual ? '✅ Has manual' : '📝 No manual yet'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2: Create Manual */}
      {selectedPersonId && (
        <section style={{ marginBottom: '48px', padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#2d5f4e' }}>
            Step 2: Create Manual for {people.find(p => p.personId === selectedPersonId)?.name}
          </h2>

          {!manual ? (
            <button
              onClick={handleCreateManual}
              style={{ padding: '12px 24px', background: '#4a9d7f', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Create Manual
            </button>
          ) : (
            <div style={{ padding: '16px', background: '#f0fdf4', border: '2px solid #4ade80', borderRadius: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#14532d' }}>
                ✅ Manual Created!
              </div>
              <div style={{ fontSize: '14px', color: '#166534' }}>
                Manual ID: {manual.manualId}<br />
                Role Sections: {manual.roleSectionCount}<br />
                Last Updated: {manual.updatedAt.toDate().toLocaleString()}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Step 3: Add Role Sections */}
      {manual && (
        <section style={{ marginBottom: '48px', padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#2d5f4e' }}>
            Step 3: Add Role Sections to {manual.personName}'s Manual
          </h2>
          <p style={{ marginBottom: '16px', color: '#57534e' }}>
            Example: "Father to Ella", "Spouse to Iris", "Manager of Team"
          </p>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                value={newRoleTitle}
                onChange={(e) => setNewRoleTitle(e.target.value)}
                placeholder="Role title (e.g., 'Father to Ella')"
                style={{ padding: '12px', border: '2px solid #d6d3d1', borderRadius: '8px', fontSize: '16px' }}
              />

              <select
                value={newRoleType}
                onChange={(e) => setNewRoleType(e.target.value as RoleType)}
                style={{ padding: '12px', border: '2px solid #d6d3d1', borderRadius: '8px', fontSize: '16px' }}
              >
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="spouse">Spouse</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="professional">Professional</option>
                <option value="caregiver">Caregiver</option>
                <option value="pet_owner">Pet Owner</option>
                <option value="other">Other</option>
              </select>

              <select
                value={relatedPersonId}
                onChange={(e) => setRelatedPersonId(e.target.value)}
                style={{ padding: '12px', border: '2px solid #d6d3d1', borderRadius: '8px', fontSize: '16px' }}
              >
                <option value="">No related person</option>
                {people.filter(p => p.personId !== selectedPersonId).map(person => (
                  <option key={person.personId} value={person.personId}>{person.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAddRoleSection}
              style={{ padding: '12px 24px', background: '#4a9d7f', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Add Role Section
            </button>
          </div>

          {/* Display Role Sections */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {roleSections.map(section => (
              <div
                key={section.roleSectionId}
                style={{ padding: '20px', background: '#fafaf9', border: '2px solid #e7e5e4', borderRadius: '8px', position: 'relative' }}
              >
                <button
                  onClick={async () => {
                    if (confirm(`Remove role section "${section.roleTitle}"?`)) {
                      try {
                        await deleteRoleSection(section.roleSectionId);
                        alert('Role section removed!');
                      } catch (err) {
                        alert('Failed to remove role section');
                      }
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    padding: '6px 12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Remove
                </button>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#292524', paddingRight: '80px' }}>
                  {section.roleTitle}
                </div>
                <div style={{ fontSize: '14px', color: '#78716c', marginBottom: '12px' }}>
                  Type: {section.roleType} | Contributors: {section.contributorNames.join(', ')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#57534e' }}>
                  <div>
                    <strong>Triggers:</strong> {section.triggers.length}<br />
                    <strong>What Works:</strong> {section.whatWorks.length}<br />
                    <strong>What Doesn't:</strong> {section.whatDoesntWork.length}
                  </div>
                  <div>
                    <strong>Strengths:</strong> {section.strengths.length}<br />
                    <strong>Challenges:</strong> {section.challenges.length}<br />
                    <strong>Boundaries:</strong> {section.boundaries?.length || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Explanation */}
      <section style={{ padding: '24px', background: '#e0f2fe', borderRadius: '12px', marginTop: '48px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '12px', color: '#0c4a6e' }}>
          🎯 How This Architecture Works
        </h3>
        <ul style={{ fontSize: '15px', color: '#075985', lineHeight: '1.8' }}>
          <li><strong>One Person = One Manual:</strong> Scott has ONE comprehensive manual that contains all his roles</li>
          <li><strong>Role Sections:</strong> Each role (Father to Ella, Spouse to Iris) is a section within Scott's manual</li>
          <li><strong>Collaborative Editing:</strong> Both people in the relationship can contribute to that role section</li>
          <li><strong>Context-Aware:</strong> Scott may behave differently as "Father to Ella" vs "Father to Caleb"</li>
          <li><strong>Strategic Plans:</strong> Target a specific role (e.g., "Improve Scott's patience as Father to Ella")</li>
          <li><strong>Living Document:</strong> As relationships evolve, role sections evolve with them</li>
        </ul>
      </section>
    </div>
  );
}
