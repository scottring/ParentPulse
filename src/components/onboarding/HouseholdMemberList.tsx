'use client';

import React, { useState } from 'react';
import { TechnicalCard, TechnicalLabel, TechnicalButton } from '../technical';
import { Person } from '@/types/person-manual';
import { calculateAge } from '@/types/household-workbook';

interface Member {
  id: string;
  name: string;
  role: 'parent' | 'child' | 'other';
  dateOfBirth?: string; // ISO date string
  isExistingPerson?: boolean; // true if linked to a real Person document
}

interface HouseholdMemberListProps {
  members: Member[];
  existingPeople?: Person[]; // People already in the family
  onAddMember: (member: Omit<Member, 'id'>, existingPersonId?: string) => void;
  onRemoveMember: (id: string) => void;
  className?: string;
}

export function HouseholdMemberList({
  members,
  existingPeople = [],
  onAddMember,
  onRemoveMember,
  className = '',
}: HouseholdMemberListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'parent' | 'child' | 'other'>('parent');
  const [newDateOfBirth, setNewDateOfBirth] = useState('');

  // Filter out people who are already added as members
  const availablePeople = existingPeople.filter(
    (person) => !members.some((m) => m.id === person.personId)
  );

  const handleAddExisting = (person: Person) => {
    // Determine role based on person's relationship type or default to 'other'
    let role: 'parent' | 'child' | 'other' = 'other';
    if (person.relationshipType === 'child') {
      role = 'child';
    } else if (person.relationshipType === 'spouse') {
      role = 'parent';
    }

    onAddMember({ name: person.name, role, isExistingPerson: true }, person.personId);
    setShowAddForm(false);
  };

  const handleAddNew = () => {
    if (!newName.trim()) return;
    onAddMember({
      name: newName.trim(),
      role: newRole,
      dateOfBirth: newDateOfBirth || undefined,
      isExistingPerson: false
    });
    setNewName('');
    setNewRole('parent');
    setNewDateOfBirth('');
    setShowAddForm(false);
  };

  const getRoleColor = (role: Member['role']) => {
    switch (role) {
      case 'parent': return 'blue';
      case 'child': return 'amber';
      case 'other': return 'slate';
    }
  };

  return (
    <div className={className}>
      <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-4">
        WHO&apos;S IN YOUR HOUSEHOLD?
      </p>

      {/* Member list */}
      <div className="space-y-2 mb-4">
        {members.map((member, index) => (
          <TechnicalCard key={member.id} shadowSize="sm" className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Index badge */}
                <div className="w-8 h-8 bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-xs font-bold text-white">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Name and role */}
                <div>
                  <span className="font-mono font-bold text-slate-800">
                    {member.name}
                    {member.dateOfBirth && (
                      <span className="font-normal text-slate-500 ml-1">
                        ({calculateAge(new Date(member.dateOfBirth))}y)
                      </span>
                    )}
                  </span>
                  <TechnicalLabel
                    variant="subtle"
                    color={getRoleColor(member.role)}
                    size="xs"
                    className="ml-2"
                  >
                    {member.role.toUpperCase()}
                  </TechnicalLabel>
                  {member.isExistingPerson && (
                    <TechnicalLabel
                      variant="outline"
                      color="green"
                      size="xs"
                      className="ml-1"
                    >
                      HAS MANUAL
                    </TechnicalLabel>
                  )}
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={() => onRemoveMember(member.id)}
                className="font-mono text-xs text-red-500 hover:text-red-700 uppercase"
              >
                [REMOVE]
              </button>
            </div>
          </TechnicalCard>
        ))}

        {members.length === 0 && (
          <div className="p-6 text-center border-2 border-dashed border-slate-300">
            <p className="font-mono text-sm text-slate-400">
              No members added yet
            </p>
          </div>
        )}
      </div>

      {/* Add form */}
      {showAddForm ? (
        <TechnicalCard shadowSize="sm" className="p-4">
          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAddMode('existing')}
              className={`
                flex-1 p-2 border-2 font-mono text-xs uppercase transition-colors
                ${addMode === 'existing'
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400'
                }
              `}
            >
              FROM EXISTING ({availablePeople.length})
            </button>
            <button
              onClick={() => setAddMode('new')}
              className={`
                flex-1 p-2 border-2 font-mono text-xs uppercase transition-colors
                ${addMode === 'new'
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400'
                }
              `}
            >
              ADD NEW
            </button>
          </div>

          {addMode === 'existing' ? (
            <div>
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                SELECT FROM YOUR PEOPLE
              </h4>

              {availablePeople.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availablePeople.map((person) => (
                    <button
                      key={person.personId}
                      onClick={() => handleAddExisting(person)}
                      className="
                        w-full p-3 text-left border-2 border-slate-200
                        hover:border-slate-400 hover:bg-slate-50 transition-colors
                      "
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-mono text-sm font-bold text-slate-600">
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-mono font-bold text-slate-800">
                            {person.name}
                          </div>
                          {person.relationshipType && (
                            <div className="font-mono text-xs text-slate-500">
                              {person.relationshipType.replace('_', ' ')}
                            </div>
                          )}
                        </div>
                        {person.hasManual && (
                          <TechnicalLabel
                            variant="filled"
                            color="green"
                            size="xs"
                            className="ml-auto"
                          >
                            MANUAL
                          </TechnicalLabel>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center bg-slate-50 border border-slate-200">
                  <p className="font-mono text-sm text-slate-500">
                    {existingPeople.length === 0
                      ? 'No people in your family yet'
                      : 'All people already added'}
                  </p>
                  <button
                    onClick={() => setAddMode('new')}
                    className="mt-2 font-mono text-xs text-amber-600 hover:text-amber-700 underline"
                  >
                    Add a new person instead
                  </button>
                </div>
              )}

              <TechnicalButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                }}
                className="mt-3"
              >
                CANCEL
              </TechnicalButton>
            </div>
          ) : (
            <div>
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                ADD NEW MEMBER
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block font-mono text-xs text-slate-500 mb-1">
                    NAME
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter name..."
                    className="
                      w-full p-2 border-2 border-slate-300 font-mono text-sm
                      focus:outline-none focus:border-slate-800
                    "
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-slate-500 mb-1">
                    ROLE
                  </label>
                  <div className="flex gap-2">
                    {(['parent', 'child', 'other'] as const).map((role) => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className={`
                          flex-1 p-2 border-2 font-mono text-xs uppercase
                          transition-colors
                          ${newRole === role
                            ? 'border-slate-800 bg-slate-800 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-400'
                          }
                        `}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs text-slate-500 mb-1">
                    DATE OF BIRTH <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={newDateOfBirth}
                    onChange={(e) => setNewDateOfBirth(e.target.value)}
                    className="
                      w-full p-2 border-2 border-slate-300 font-mono text-sm
                      focus:outline-none focus:border-slate-800
                    "
                  />
                  {newDateOfBirth && (
                    <p className="font-mono text-xs text-slate-500 mt-1">
                      Age: {calculateAge(new Date(newDateOfBirth))} years old
                    </p>
                  )}
                </div>

                <p className="font-mono text-xs text-slate-400">
                  Note: This will add them to the household but won&apos;t create a person manual.
                  Add them via the People page first if you want a manual.
                </p>

                <div className="flex gap-2">
                  <TechnicalButton
                    variant="primary"
                    size="sm"
                    onClick={handleAddNew}
                    disabled={!newName.trim()}
                  >
                    ADD MEMBER
                  </TechnicalButton>
                  <TechnicalButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewName('');
                      setNewRole('parent');
                      setNewDateOfBirth('');
                    }}
                  >
                    CANCEL
                  </TechnicalButton>
                </div>
              </div>
            </div>
          )}
        </TechnicalCard>
      ) : (
        <TechnicalButton
          variant="secondary"
          onClick={() => setShowAddForm(true)}
          fullWidth
        >
          + ADD MEMBER
        </TechnicalButton>
      )}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between font-mono text-xs text-slate-500">
        <span>TOTAL MEMBERS:</span>
        <span>{members.length}</span>
      </div>
    </div>
  );
}

export default HouseholdMemberList;
