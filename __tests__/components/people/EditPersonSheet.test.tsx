import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { EditPersonSheet } from '@/components/people/EditPersonSheet';
import type { Person } from '@/types/person-manual';

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    personId: 'p-1',
    familyId: 'f-1',
    name: 'Mia',
    pronouns: 'she/her',
    dateOfBirth: Timestamp.fromDate(new Date(2018, 5, 14)), // June 14, 2018 local
    avatarUrl: 'https://img/avatar.jpg',
    bannerUrl: 'https://img/banner.jpg',
    hasManual: false,
    canSelfContribute: false,
    addedAt: Timestamp.now(),
    addedByUserId: 'u-1',
    ...overrides,
  };
}

describe('EditPersonSheet', () => {
  it('renders existing values in the form', () => {
    render(
      <EditPersonSheet
        person={makePerson()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue('Mia');
    expect(screen.getByLabelText(/pronouns/i)).toHaveValue('she/her');
    expect(screen.getByLabelText(/date of birth/i)).toHaveValue('2018-06-14');
    expect(screen.getByLabelText(/avatar url/i)).toHaveValue('https://img/avatar.jpg');
    expect(screen.getByLabelText(/banner url/i)).toHaveValue('https://img/banner.jpg');
  });
});
