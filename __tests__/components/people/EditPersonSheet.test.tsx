import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';

vi.mock('@/lib/upload-person-image', () => ({
  uploadPersonImage: vi.fn(async () => 'https://img/uploaded.jpg'),
}));

import { EditPersonSheet } from '@/components/people/EditPersonSheet';
import type { Person } from '@/types/person-manual';

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    personId: 'p-1',
    familyId: 'f-1',
    name: 'Mia',
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
    expect(screen.getByLabelText(/date of birth/i)).toHaveValue('2018-06-14');
    expect(screen.getByLabelText(/^avatar/i)).toHaveValue('https://img/avatar.jpg');
    expect(screen.getByLabelText(/banner url/i)).toHaveValue('https://img/banner.jpg');
  });

  it('calls onSave with only the changed fields on submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <EditPersonSheet
        person={makePerson({ name: 'Mia', avatarUrl: 'https://img/old.jpg' })}
        onClose={onClose}
        onSave={onSave}
      />
    );

    const avatar = screen.getByLabelText(/^avatar/i);
    await user.clear(avatar);
    await user.type(avatar, 'https://img/new.jpg');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      avatarUrl: 'https://img/new.jpg',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('converts a changed date of birth into a Firestore Timestamp for that calendar date', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <EditPersonSheet
        person={makePerson({
          dateOfBirth: Timestamp.fromDate(new Date(2018, 5, 14)), // June 14, 2018
        })}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    const dob = screen.getByLabelText(/date of birth/i) as HTMLInputElement;
    await user.clear(dob);
    await user.type(dob, '2019-07-04');

    await user.click(screen.getByRole('button', { name: /save/i }));

    const call = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(call.dateOfBirth).toBeInstanceOf(Timestamp);
    const d = (call.dateOfBirth as Timestamp).toDate();
    expect(d.getFullYear()).toBe(2019);
    expect(d.getMonth()).toBe(6); // July (0-indexed)
    expect(d.getDate()).toBe(4);
  });

  it('emits a FieldValue sentinel for a field the user cleared', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = (await import('@testing-library/user-event')).default.setup();
    const { deleteField } = await import('firebase/firestore');

    render(
      <EditPersonSheet
        person={makePerson({ bannerUrl: 'https://img/old-banner.jpg' })}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    await user.clear(screen.getByLabelText(/banner url/i));
    await user.click(screen.getByRole('button', { name: /save/i }));

    const call = onSave.mock.calls[0][0] as Record<string, unknown>;
    // deleteField() returns a FieldValue; compare by shape (constructor name).
    expect(call.bannerUrl).toBeDefined();
    expect((call.bannerUrl as { _methodName?: string })._methodName ??
      (call.bannerUrl as object).constructor.name).toMatch(/deleteField|FieldValue/i);
    // Also confirm it's the same shape Firestore would return:
    expect(call.bannerUrl).toEqual(deleteField());
  });

  it('blocks save when name is blank', async () => {
    const onSave = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <EditPersonSheet
        person={makePerson({ name: 'Mia' })}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    await user.clear(screen.getByLabelText(/name/i));
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/name is required/i);
  });

  it('closes on Escape without calling onSave', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <EditPersonSheet
        person={makePerson()}
        onClose={onClose}
        onSave={onSave}
      />
    );

    screen.getByLabelText(/name/i).focus();
    await user.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on scrim click', async () => {
    const onClose = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();

    const { container } = render(
      <EditPersonSheet
        person={makePerson()}
        onClose={onClose}
        onSave={vi.fn()}
      />
    );

    const scrim = container.querySelector('.scrim') as HTMLElement;
    expect(scrim).not.toBeNull();
    await user.click(scrim);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
