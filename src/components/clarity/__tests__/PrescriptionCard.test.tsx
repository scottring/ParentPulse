import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrescriptionCard } from '../PrescriptionCard';

describe('PrescriptionCard', () => {
  const draft = { shape: 'atomic' as const, body: "Ask her: 'is naming it what shifts it?'" };

  it('renders the prescription body', () => {
    render(
      <PrescriptionCard draft={draft} onConfirm={() => {}} onRefine={() => {}} onNotYet={() => {}} />,
    );
    expect(screen.getByText(/naming it what shifts it/i)).toBeInTheDocument();
  });

  it('calls onConfirm when Confirm clicked', () => {
    const onConfirm = vi.fn();
    render(
      <PrescriptionCard draft={draft} onConfirm={onConfirm} onRefine={() => {}} onNotYet={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onRefine when Refine clicked', () => {
    const onRefine = vi.fn();
    render(
      <PrescriptionCard draft={draft} onConfirm={() => {}} onRefine={onRefine} onNotYet={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /refine/i }));
    expect(onRefine).toHaveBeenCalledTimes(1);
  });

  it('calls onNotYet when Not yet clicked', () => {
    const onNotYet = vi.fn();
    render(
      <PrescriptionCard draft={draft} onConfirm={() => {}} onRefine={() => {}} onNotYet={onNotYet} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /not yet/i }));
    expect(onNotYet).toHaveBeenCalledTimes(1);
  });

  it('disables all buttons when busy', () => {
    render(
      <PrescriptionCard
        draft={draft}
        busy
        onConfirm={() => {}}
        onRefine={() => {}}
        onNotYet={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /refine/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /not yet/i })).toBeDisabled();
  });
});
