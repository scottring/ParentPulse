import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { EntryBlock } from '@/components/journal-spread/EntryBlock';
import type { Entry } from '@/types/entry';

const baseEntry: Entry = {
  id: 'e1',
  familyId: 'f1',
  type: 'written',
  author: { kind: 'person', personId: 'p1' },
  subjects: [],
  content: 'Dinner was loud tonight.',
  tags: [],
  visibleToUserIds: ['u1'],
  sharedWithUserIds: [],
  createdAt: Timestamp.now(),
};

describe('EntryBlock', () => {
  // ── prose entries ────────────────────────────────────────────────────────

  it('renders the entry content for written type', () => {
    render(<EntryBlock entry={baseEntry} />);
    expect(screen.getByText('Dinner was loud tonight.')).toBeInTheDocument();
  });

  it('written → renders kicker text matching /written/i', () => {
    render(<EntryBlock entry={baseEntry} />);
    expect(screen.getByText(/written/i)).toBeInTheDocument();
  });

  it('observation → renders kicker text matching /observation/i', () => {
    render(<EntryBlock entry={{ ...baseEntry, type: 'observation' }} />);
    expect(screen.getByText(/observation/i)).toBeInTheDocument();
  });

  it('reflection → renders kicker text matching /reflection/i and body text', () => {
    render(<EntryBlock entry={{ ...baseEntry, type: 'reflection' }} />);
    expect(screen.getByText(/reflection/i)).toBeInTheDocument();
    expect(screen.getByText('Dinner was loud tonight.')).toBeInTheDocument();
  });

  it('conversation → renders kicker text matching /conversation/i and body text', () => {
    render(<EntryBlock entry={{ ...baseEntry, type: 'conversation' }} />);
    expect(screen.getByText(/conversation/i)).toBeInTheDocument();
    expect(screen.getByText('Dinner was loud tonight.')).toBeInTheDocument();
  });

  // ── activity ─────────────────────────────────────────────────────────────

  it('activity → renders a check character and "Done" meta', () => {
    render(<EntryBlock entry={{ ...baseEntry, type: 'activity' }} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Dinner was loud tonight.')).toBeInTheDocument();
  });

  // ── synthesis (person subject) ────────────────────────────────────────────

  it('synthesis with person subject → contains "Synthesis · about" text', () => {
    const entry: Entry = {
      ...baseEntry,
      type: 'synthesis',
      subjects: [{ kind: 'person', personId: 'p2' }],
    };
    render(<EntryBlock entry={entry} />);
    expect(screen.getByText(/synthesis · about/i)).toBeInTheDocument();
  });

  it('synthesis with person subject → applies synth-pull class or blockquote structure', () => {
    const entry: Entry = {
      ...baseEntry,
      type: 'synthesis',
      subjects: [{ kind: 'person', personId: 'p2' }],
    };
    const { container } = render(<EntryBlock entry={entry} />);
    const hasSynthClass = container.querySelector('.synth-pull') !== null;
    const hasBlockquote = container.querySelector('blockquote') !== null;
    expect(hasSynthClass || hasBlockquote).toBe(true);
  });

  it('synthesis with person subject → renders body content', () => {
    const entry: Entry = {
      ...baseEntry,
      type: 'synthesis',
      subjects: [{ kind: 'person', personId: 'p2' }],
    };
    render(<EntryBlock entry={entry} />);
    expect(screen.getByText('Dinner was loud tonight.')).toBeInTheDocument();
  });

  // ── synthesis (family subject) ────────────────────────────────────────────

  it('synthesis with family subject → applies family-banner class or distinct structure', () => {
    const entry: Entry = {
      ...baseEntry,
      type: 'synthesis',
      subjects: [{ kind: 'family' }],
    };
    const { container } = render(<EntryBlock entry={entry} />);
    const hasBannerClass = container.querySelector('.family-banner') !== null;
    expect(hasBannerClass).toBe(true);
  });

  it('synthesis with family subject → renders body content', () => {
    const entry: Entry = {
      ...baseEntry,
      type: 'synthesis',
      subjects: [{ kind: 'family' }],
    };
    render(<EntryBlock entry={entry} />);
    expect(screen.getByText('Dinner was loud tonight.')).toBeInTheDocument();
  });

  // ── nudge ─────────────────────────────────────────────────────────────────

  it('nudge → applies nudge-box class or distinct structure', () => {
    const { container } = render(<EntryBlock entry={{ ...baseEntry, type: 'nudge' }} />);
    const hasNudgeClass = container.querySelector('.nudge-box') !== null;
    expect(hasNudgeClass).toBe(true);
  });

  it('nudge → renders body content', () => {
    render(<EntryBlock entry={{ ...baseEntry, type: 'nudge' }} />);
    expect(screen.getByText('Dinner was loud tonight.')).toBeInTheDocument();
  });

  // ── prompt ────────────────────────────────────────────────────────────────

  it('prompt → renders kicker matching /question/i and body text', () => {
    render(<EntryBlock entry={{ ...baseEntry, type: 'prompt' }} />);
    expect(screen.getByText(/question/i)).toBeInTheDocument();
    expect(screen.getByText('Dinner was loud tonight.')).toBeInTheDocument();
  });

  // ── nameOf resolution ──────────────────────────────────────────────────────

  it('renders the resolved person name for synthesis pull-quote when nameOf is provided', () => {
    const synth: Entry = {
      ...baseEntry,
      id: 's1',
      type: 'synthesis',
      author: { kind: 'system' },
      subjects: [{ kind: 'person', personId: 'p-liam' }],
      content: 'Short synthesis.',
    };
    render(<EntryBlock entry={synth} nameOf={(id) => (id === 'p-liam' ? 'Liam' : id)} />);
    expect(screen.getByText(/about Liam/i)).toBeInTheDocument();
    expect(screen.queryByText(/p-liam/)).not.toBeInTheDocument();
  });

  it('falls back to personId when nameOf is not provided', () => {
    const synth: Entry = {
      ...baseEntry,
      id: 's2',
      type: 'synthesis',
      author: { kind: 'system' },
      subjects: [{ kind: 'person', personId: 'p-liam' }],
      content: 'Short.',
    };
    render(<EntryBlock entry={synth} />);
    expect(screen.getByText(/about p-liam/i)).toBeInTheDocument();
  });
});
